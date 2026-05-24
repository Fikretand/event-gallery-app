import QRCode from "qrcode";

import {
  PRO_ACTIVE_EVENT_LIMIT,
  PRO_STORAGE_LIMIT_BYTES,
  SOLO_ACTIVE_EVENT_LIMIT,
  SOLO_STORAGE_LIMIT_BYTES,
  TRIAL_DURATION_DAYS,
  TRIAL_PHOTO_LIMIT,
} from "@/lib/constants";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { grantGalleryAccess, hasGalleryAccess, hashPin, randomSlugSuffix, verifyPin } from "@/lib/security";
import { createSignedDownloadUrl, deleteStoredObject, publicMediaUrl } from "@/lib/storage";
import { enrichMediaWithUrls, processMediaRecord } from "@/lib/media";
import type {
  AccountUsage,
  AccountType,
  EventActivityAction,
  EventActivityRecord,
  EventAnalytics,
  EventRecord,
  EventSettingsRecord,
  GallerySectionRecord,
  MediaFileRecord,
  PhotographerPlanTier,
  PublicPhotographerProfile,
  TrialState,
} from "@/lib/types";
import { absoluteUrl, slugify } from "@/lib/utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const COUPLE_UPLOAD_WINDOW_DAYS = 30;
const COUPLE_ACCESS_WINDOW_DAYS = 90;

function addDays(base: string, days: number) {
  return new Date(new Date(base).getTime() + days * DAY_IN_MS).toISOString();
}

function getCouplePlanAnchorDate(event: Pick<EventRecord, "created_at" | "event_date">) {
  return event.event_date ? new Date(event.event_date).toISOString() : event.created_at;
}

export async function listOwnerEvents(ownerUserId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("events")
    .select("*, event_settings(*)")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  return (data ?? []) as EventRecord[];
}

export async function getOwnerEventBySlug(ownerUserId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("events")
    .select("*, event_settings(*)")
    .eq("owner_user_id", ownerUserId)
    .eq("slug", slug)
    .single();

  return (data ?? null) as EventRecord | null;
}

export async function getPublicEventBySlug(slug: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data } = await admin.from("events").select("*, event_settings(*)").eq("slug", slug).single();
  return (data ?? null) as EventRecord | null;
}

export function getEventLifecycleStatus(event: EventRecord) {
  if (event.status === "archived" || event.status === "draft") {
    return event.status;
  }

  return isEventExpired(event) ? "expired" : "active";
}

export function isEventExpired(event: EventRecord) {
  return Boolean(event.expires_at && new Date(event.expires_at).getTime() < Date.now());
}

export function getCoupleAccessEndsAt(event: Pick<EventRecord, "created_at" | "event_date">) {
  return addDays(getCouplePlanAnchorDate(event), COUPLE_ACCESS_WINDOW_DAYS);
}

export function getCoupleUploadEndsAt(event: Pick<EventRecord, "created_at" | "event_date" | "expires_at">) {
  const uploadEnd = new Date(addDays(getCouplePlanAnchorDate(event), COUPLE_UPLOAD_WINDOW_DAYS)).getTime();
  const accessEnd = event.expires_at
    ? new Date(event.expires_at).getTime()
    : new Date(getCoupleAccessEndsAt(event)).getTime();

  return new Date(Math.min(uploadEnd, accessEnd)).toISOString();
}

export function isGuestUploadWindowClosed(event: Pick<EventRecord, "created_at" | "event_date" | "expires_at">, accountType: AccountType) {
  if (accountType !== "couple") {
    return false;
  }

  return new Date(getCoupleUploadEndsAt(event)).getTime() < Date.now();
}

export async function getEventAccountType(ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return "photographer" as const;
  }

  const { data } = await admin.from("users").select("account_type").eq("id", ownerUserId).maybeSingle();
  return data?.account_type === "couple" ? "couple" : "photographer";
}

export function normalizePhotographerPlanTier(value: unknown): PhotographerPlanTier {
  return value === "pro" ? "pro" : "solo";
}

export function getPhotographerPlanLimits(planTier: PhotographerPlanTier = "solo") {
  if (planTier === "pro") {
    return {
      activeEventLimit: PRO_ACTIVE_EVENT_LIMIT,
      storageLimitBytes: PRO_STORAGE_LIMIT_BYTES,
    };
  }

  return {
    activeEventLimit: SOLO_ACTIVE_EVENT_LIMIT,
    storageLimitBytes: SOLO_STORAGE_LIMIT_BYTES,
  };
}

export async function getPhotographerPlanTier(ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return "solo" as const;
  }

  const { data } = await admin.from("users").select("plan_tier").eq("id", ownerUserId).maybeSingle();
  return normalizePhotographerPlanTier(data?.plan_tier);
}


export async function getPublicProfileAvatarUrl(key: string | null) {
  if (!key) {
    return null;
  }

  return publicMediaUrl(key) ?? (await createSignedDownloadUrl(key));
}

export async function listPublicPhotographers(limit = 6) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("users")
    .select("id, full_name, email, city, avatar_url, website_url, instagram_url, facebook_url, public_email_on_homepage")
    .eq("account_type", "photographer")
    .eq("show_on_homepage", true)
    .eq("public_profile_consent", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const profiles = (data ?? []) as PublicPhotographerProfile[];
  return Promise.all(
    profiles.map(async (profile) => ({
      ...profile,
      avatarPreviewUrl: await getPublicProfileAvatarUrl(profile.avatar_url),
    })),
  );
}

export async function getAccountUsage(ownerUserId: string): Promise<AccountUsage> {
  const admin = createSupabaseAdminClient();
  const planTier = await getPhotographerPlanTier(ownerUserId);
  const limits = getPhotographerPlanLimits(planTier);

  if (!admin) {
    return {
      liveUsedStorageBytes: 0,
      liveAvailableStorageBytes: limits.storageLimitBytes,
      liveStorageLimitBytes: limits.storageLimitBytes,
      activeEvents: 0,
      remainingEventSlots: limits.activeEventLimit,
      activeEventLimit: limits.activeEventLimit,
    };
  }

  const events = await listOwnerEvents(ownerUserId);
  const activeEvents = events.filter((event) => getEventLifecycleStatus(event) === "active").length;
  const allEventIds = events.map((event) => event.id);

  let liveUsedStorageBytes = 0;
  if (allEventIds.length > 0) {
    const { data } = await admin.from("media_files").select("size_bytes").in("event_id", allEventIds);
    liveUsedStorageBytes = (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
  }

  return {
    liveUsedStorageBytes,
    liveAvailableStorageBytes: Math.max(limits.storageLimitBytes - liveUsedStorageBytes, 0),
    liveStorageLimitBytes: limits.storageLimitBytes,
    activeEvents,
    remainingEventSlots: Math.max(limits.activeEventLimit - activeEvents, 0),
    activeEventLimit: limits.activeEventLimit,
  };
}

export function requiresGalleryPin(event: EventRecord) {
  const hasPin = Boolean(event.gallery_pin_hash);
  const requiresPinSetting = event.event_settings?.require_pin_for_gallery ?? hasPin;
  return hasPin && requiresPinSetting;
}

export async function createEvent(input: {
  ownerUserId: string;
  title: string;
  clientName?: string;
  eventDate?: string;
  expiresAt?: string;
  uploadPin?: string;
  galleryPin?: string;
  allowGuestUpload: boolean;
  allowGuestVideo: boolean;
  requirePinForUpload: boolean;
  requirePinForGallery: boolean;
  maxGuestUploadMb: number;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const baseSlug = slugify(input.title) || "event";
  const slug = `${baseSlug}-${randomSlugSuffix()}`;

  const payload = {
    owner_user_id: input.ownerUserId,
    title: input.title,
    client_name: input.clientName || null,
    event_date: input.eventDate || null,
    expires_at: input.expiresAt || null,
    upload_pin_hash: input.uploadPin ? hashPin(input.uploadPin) : null,
    gallery_pin_hash: input.galleryPin ? hashPin(input.galleryPin) : null,
    slug,
    status: "active",
  };

  const { data: event, error } = await supabase.from("events").insert(payload).select("*").single();
  if (error || !event) {
    throw new Error(error?.message ?? "Failed to create event.");
  }

  const settingsPayload: EventSettingsRecord = {
    event_id: event.id,
    allow_guest_upload: input.allowGuestUpload,
    allow_guest_video: input.allowGuestVideo,
    require_pin_for_upload: input.requirePinForUpload,
    require_pin_for_gallery: input.requirePinForGallery,
    max_guest_upload_mb: input.maxGuestUploadMb,
    gallery_visibility: "private",
  };

  const { error: settingsError } = await supabase.from("event_settings").insert(settingsPayload);
  if (settingsError) {
    throw new Error(settingsError.message);
  }

  return slug;
}

export async function updateEvent(ownerUserId: string, slug: string, input: {
  title: string;
  clientName?: string;
  eventDate?: string;
  expiresAt?: string;
  uploadPin?: string;
  galleryPin?: string;
  allowGuestUpload: boolean;
  allowGuestVideo: boolean;
  requirePinForUpload: boolean;
  requirePinForGallery: boolean;
  maxGuestUploadMb: number;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const existing = await getOwnerEventBySlug(ownerUserId, slug);
  if (!existing) {
    throw new Error("Event not found.");
  }

  const { data: updatedEvent, error: eventError } = await supabase
    .from("events")
    .update({
      title: input.title,
      client_name: input.clientName || null,
      event_date: input.eventDate || null,
      expires_at: input.expiresAt || null,
      upload_pin_hash: input.uploadPin ? hashPin(input.uploadPin) : existing.upload_pin_hash,
      gallery_pin_hash: input.galleryPin ? hashPin(input.galleryPin) : existing.gallery_pin_hash,
    })
    .eq("id", existing.id)
    .eq("owner_user_id", ownerUserId)
    .select("id")
    .single();

  if (eventError || !updatedEvent) {
    throw new Error(eventError.message);
  }

  const { data: updatedSettings, error: settingsError } = await supabase
    .from("event_settings")
    .update({
      allow_guest_upload: input.allowGuestUpload,
      allow_guest_video: input.allowGuestVideo,
      require_pin_for_upload: input.requirePinForUpload,
      require_pin_for_gallery: input.requirePinForGallery,
      max_guest_upload_mb: input.maxGuestUploadMb,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", existing.id)
    .select("event_id")
    .single();

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  if (!updatedSettings) {
    throw new Error("Event settings could not be updated.");
  }
}

export async function getEventAnalytics(eventId: string): Promise<EventAnalytics> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      mediaCount: 0,
      guestUploads: 0,
      storageUsedBytes: 0,
      downloadCount: 0,
    };
  }

  const [{ count: mediaCount }, { count: guestUploads }, { count: downloadCount }, { data: mediaRows }] = await Promise.all([
    admin.from("media_files").select("*", { count: "exact", head: true }).eq("event_id", eventId).is("deleted_at", null),
    admin.from("guest_upload_sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("downloads").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("media_files").select("size_bytes").eq("event_id", eventId),
  ]);

  const storageUsedBytes = (mediaRows ?? []).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);

  return {
    mediaCount: mediaCount ?? 0,
    guestUploads: guestUploads ?? 0,
    storageUsedBytes,
    downloadCount: downloadCount ?? 0,
  };
}

export async function recordEventActivity(input: {
  eventId: string;
  actorUserId?: string | null;
  mediaFileId?: string | null;
  action: EventActivityAction;
  metadata?: Record<string, unknown> | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  await admin.from("event_activity_logs").insert({
    event_id: input.eventId,
    actor_user_id: input.actorUserId ?? null,
    media_file_id: input.mediaFileId ?? null,
    action: input.action,
    metadata: input.metadata ?? null,
  });
}

export async function listEventActivity(eventId: string, limit = 8) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("event_activity_logs")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as EventActivityRecord[];
}

export async function getEventCoverMap(events: EventRecord[]) {
  const admin = createSupabaseAdminClient();
  const coverImageIds = events.map((event) => event.cover_image_id).filter((value): value is string => Boolean(value));

  if (!admin || coverImageIds.length === 0) {
    return new Map<string, Awaited<ReturnType<typeof enrichMediaWithUrls>>[number]>();
  }

  const { data } = await admin.from("media_files").select("*").in("id", coverImageIds).is("deleted_at", null);
  const coverViews = await enrichMediaWithUrls((data ?? []) as MediaFileRecord[]);

  return new Map(coverViews.map((item) => [item.id, item]));
}

export async function listEventMedia(
  eventId: string,
  options?: {
    includeHidden?: boolean;
    includeDeleted?: boolean;
    sourceType?: "guest" | "photographer" | "all";
    mediaType?: "all" | "photos" | "videos";
    sortOrder?: "asc" | "desc";
  },
) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  let query = admin
    .from("media_files")
    .select("*, guest_upload_sessions(guest_name, guest_email)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: options?.sortOrder === "asc" });

  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!options?.includeHidden) {
    query = query.is("hidden_at", null);
  }

  if (options?.sourceType && options.sourceType !== "all") {
    query = query.eq("source_type", options.sourceType);
  }

  if (options?.mediaType === "photos") {
    query = query.like("mime_type", "image/%");
  }

  if (options?.mediaType === "videos") {
    query = query.like("mime_type", "video/%");
  }

  const { data } = await query;

  // Flatten the guest session join into the record fields
  return (data ?? []).map((row: any) => {
    const { guest_upload_sessions: gus, ...rest } = row;
    return {
      ...rest,
      guest_name: gus?.guest_name ?? null,
      guest_email: gus?.guest_email ?? null,
    } as MediaFileRecord;
  });
}

export async function listGallerySections(eventId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("gallery_sections")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data ?? []) as GallerySectionRecord[];
}

export async function createGallerySection(ownerUserId: string, slug: string, name: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const event = await getOwnerEventBySlug(ownerUserId, slug);
  if (!event) {
    throw new Error("Event not found.");
  }

  const existingSections = await listGallerySections(event.id);
  const { error } = await supabase.from("gallery_sections").insert({
    event_id: event.id,
    name,
    sort_order: existingSections.length,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function renameGallerySection(ownerUserId: string, slug: string, sectionId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    throw new Error("Supabase is not configured.");
  }

  const event = await getOwnerEventBySlug(ownerUserId, slug);
  if (!event) {
    throw new Error("Event not found.");
  }

  const { data: section } = await admin
    .from("gallery_sections")
    .select("id, event_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section || section.event_id !== event.id) {
    throw new Error("Section not found.");
  }

  const { error } = await supabase.from("gallery_sections").update({ name }).eq("id", sectionId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteGallerySection(ownerUserId: string, slug: string, sectionId: string) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    throw new Error("Supabase is not configured.");
  }

  const event = await getOwnerEventBySlug(ownerUserId, slug);
  if (!event) {
    throw new Error("Event not found.");
  }

  const { data: section } = await admin
    .from("gallery_sections")
    .select("id, event_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!section || section.event_id !== event.id) {
    throw new Error("Section not found.");
  }

  await supabase.from("media_files").update({ section_id: null }).eq("section_id", sectionId);
  const { error } = await supabase.from("gallery_sections").delete().eq("id", sectionId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function assignMediaSection(ownerUserId: string, mediaId: string, sectionId: string | null) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    throw new Error("Supabase is not configured.");
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    throw new Error("Media not found.");
  }

  const event = media.event as EventRecord;
  if (event.owner_user_id !== ownerUserId) {
    throw new Error("Unauthorized.");
  }

  if (sectionId) {
    const { data: section } = await admin
      .from("gallery_sections")
      .select("id, event_id")
      .eq("id", sectionId)
      .maybeSingle();

    if (!section || section.event_id !== media.event_id) {
      throw new Error("Section must belong to this event.");
    }
  }

  const { error } = await supabase.from("media_files").update({ section_id: sectionId }).eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setEventCoverImage(ownerUserId: string, slug: string, coverImageId: string | null) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) {
    throw new Error("Supabase is not configured.");
  }

  const existing = await getOwnerEventBySlug(ownerUserId, slug);
  if (!existing) {
    throw new Error("Event not found.");
  }

  if (coverImageId) {
    const { data: media } = await admin
      .from("media_files")
      .select("id, event_id, mime_type, deleted_at")
      .eq("id", coverImageId)
      .single();

    if (!media || media.event_id !== existing.id) {
      throw new Error("Cover image must belong to this event.");
    }

    if (media.deleted_at) {
      throw new Error("Restore the image before using it as a cover.");
    }

    if (!String(media.mime_type).startsWith("image/")) {
      throw new Error("Only images can be used as a cover.");
    }
  }

  const { data: updated, error } = await supabase
    .from("events")
    .update({
      cover_image_id: coverImageId,
    })
    .eq("id", existing.id)
    .eq("owner_user_id", ownerUserId)
    .select("cover_image_id")
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? "Failed to update event cover.");
  }
}

export async function getMediaById(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data: media } = await admin.from("media_files").select("*").eq("id", mediaId).single();
  if (!media) {
    return null;
  }

  const { data: event } = await admin
    .from("events")
    .select("*, event_settings(*)")
    .eq("id", media.event_id)
    .single();

  if (!event) {
    return null;
  }

  return {
    ...media,
    event,
  };
}

export async function toggleMediaHidden(mediaId: string, hidden: boolean) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { error } = await admin
    .from("media_files")
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function softDeleteMediaById(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    throw new Error("Media not found.");
  }

  await admin
    .from("events")
    .update({
      cover_image_id: null,
    })
    .eq("cover_image_id", mediaId);

  const { error } = await admin
    .from("media_files")
    .update({
      deleted_at: new Date().toISOString(),
      hidden_at: new Date().toISOString(),
    })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function restoreMediaById(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { error } = await admin
    .from("media_files")
    .update({
      deleted_at: null,
    })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function permanentlyDeleteMediaById(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    throw new Error("Media not found.");
  }

  await Promise.all([
    deleteStoredObject(media.storage_key),
    deleteStoredObject(media.thumbnail_key),
  ]);

  await admin
    .from("events")
    .update({
      cover_image_id: null,
    })
    .eq("cover_image_id", mediaId);

  const { error } = await admin.from("media_files").delete().eq("id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
}


export async function permanentlyDeleteEventBySlug(ownerUserId: string, slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const event = await getOwnerEventBySlug(ownerUserId, slug);
  if (!event) {
    throw new Error("Event not found.");
  }

  const media = await listEventMedia(event.id, {
    includeDeleted: true,
    includeHidden: true,
    sourceType: "all",
  });

  await Promise.all(
    media.flatMap((item) => [deleteStoredObject(item.storage_key), deleteStoredObject(item.thumbnail_key)]),
  );

  const { error } = await supabase.from("events").delete().eq("id", event.id).eq("owner_user_id", ownerUserId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function purgeExpiredDeletedMedia(retentionDays = 7) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("media_files")
    .select("id")
    .not("deleted_at", "is", null)
    .lte("deleted_at", cutoff);

  const ids = (data ?? []).map((row) => row.id as string);

  for (const id of ids) {
    await permanentlyDeleteMediaById(id);
  }

  return ids.length;
}

export async function recordCompletedUpload(input: {
  eventId: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: "guest" | "photographer";
  uploadedByUserId?: string | null;
  uploadSessionId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const hiddenAt = input.sourceType === "guest" ? new Date().toISOString() : null;

  const { data, error } = await admin
    .from("media_files")
    .insert({
      event_id: input.eventId,
      uploaded_by_user_id: input.uploadedByUserId ?? null,
      source_type: input.sourceType,
      storage_key: input.objectKey,
      original_filename: input.originalFilename,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: "uploaded",
      hidden_at: hiddenAt,
      upload_session_id: input.uploadSessionId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to record upload.");
  }

  return data as MediaFileRecord;
}

export async function markMediaReady(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { error } = await admin
    .from("media_files")
    .update({
      status: "ready",
    })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markMediaProcessing(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { error } = await admin
    .from("media_files")
    .update({
      status: "processing",
    })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markMediaFailed(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { error } = await admin
    .from("media_files")
    .update({
      status: "failed",
    })
    .eq("id", mediaId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function processMediaById(mediaId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const media = await getMediaById(mediaId);
  if (!media) {
    throw new Error("Media not found.");
  }

  await markMediaProcessing(mediaId);

  try {
    const processed = await processMediaRecord(media);
    const { error } = await admin
      .from("media_files")
      .update({
        width: processed.width,
        height: processed.height,
        duration_seconds: processed.durationSeconds,
        thumbnail_key: processed.thumbnailKey,
        status: processed.status,
      })
      .eq("id", mediaId);

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    await markMediaFailed(mediaId);
    throw error;
  }
}

export async function createGuestUploadSession(input: { eventId: string; guestName?: string; guestEmail?: string; ipHash?: string | null }) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin access is not configured.");
  }

  const { data, error } = await admin
    .from("guest_upload_sessions")
    .insert({
      event_id: input.eventId,
      guest_name: input.guestName || null,
      guest_email: input.guestEmail || null,
      ip_hash: input.ipHash ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create upload session.");
  }

  return data;
}

export async function recordDownload(input: {
  eventId: string;
  mediaFileId: string;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  await admin.from("downloads").insert({
    event_id: input.eventId,
    user_id: input.userId ?? null,
    media_file_id: input.mediaFileId,
  });
}

export async function incrementRateLimitCount(input: { key: string; count: number; windowStart: string }) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data: existing } = await admin
    .from("guest_upload_rate_limits")
    .select("id, count")
    .eq("bucket_key", input.key)
    .eq("window_started_at", input.windowStart)
    .maybeSingle();

  if (!existing) {
    const { data: inserted, error } = await admin
      .from("guest_upload_rate_limits")
      .insert({
        bucket_key: input.key,
        count: input.count,
        window_started_at: input.windowStart,
      })
      .select("count")
      .single();

    if (error) {
      return null;
    }

    return inserted.count as number;
  }

  const nextCount = (existing.count as number) + 1;
  const { data: updated, error } = await admin
    .from("guest_upload_rate_limits")
    .update({
      count: nextCount,
    })
    .eq("id", existing.id)
    .select("count")
    .single();

  if (error) {
    return null;
  }

  return updated.count as number;
}

export async function verifyGalleryPinAndGrantAccess(event: EventRecord, pin: string) {
  const requiresPin = requiresGalleryPin(event);
  const accepted = !requiresPin || verifyPin(pin, event.gallery_pin_hash);

  if (!accepted) {
    return false;
  }

  await grantGalleryAccess(event.slug, event.gallery_pin_hash);
  return true;
}

export async function canViewGallery(event: EventRecord) {
  const requiresPin = requiresGalleryPin(event);
  if (!requiresPin) {
    return true;
  }

  return hasGalleryAccess(event.slug, event.gallery_pin_hash);
}

export function eventLinks(slug: string) {
  return {
    uploadUrl: absoluteUrl(`/upload/${slug}`),
    galleryUrl: absoluteUrl(`/gallery/${slug}`),
  };
}

export async function generateUploadQrDataUrl(slug: string) {
  return QRCode.toDataURL(eventLinks(slug).uploadUrl, {
    margin: 1,
    color: {
      dark: "#172033",
      light: "#FFF8F0",
    },
  });
}

// ─── Trial system ─────────────────────────────────────────────────────────────

/**
 * Count total non-deleted, non-failed media files across all events
 * owned by a given user. Used for trial photo limit enforcement.
 */
export async function countUserMediaFiles(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;

  // Step 1: get all event IDs owned by this user
  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("owner_user_id", userId);

  const eventIds = (events ?? []).map((e: { id: string }) => e.id);
  if (eventIds.length === 0) return 0;

  // Step 2: count non-deleted, non-failed media in those events
  const { count } = await admin
    .from("media_files")
    .select("id", { count: "exact", head: true })
    .in("event_id", eventIds)
    .is("deleted_at", null)
    .neq("status", "failed");

  return count ?? 0;
}

/**
 * Compute trial state for a photographer account.
 * Trial = plan_tier "solo" + account created within TRIAL_DURATION_DAYS.
 * Pro accounts, admins, and paying subscribers are never on trial.
 */
export function computeTrialState(
  createdAt: string,
  planTier: string,
  photosUsed: number,
  role?: string,
  subscriptionStatus?: string | null,
): TrialState {
  // Admins and active/trialing paid subscribers — no trial restrictions
  if (
    role === "admin" ||
    subscriptionStatus === "active" ||
    subscriptionStatus === "trialing"
  ) {
    return { status: "none", daysLeft: 0, daysUsed: 0, photosUsed, photosLimit: TRIAL_PHOTO_LIMIT };
  }

  const created = new Date(createdAt);
  const now = new Date();
  const msElapsed = now.getTime() - created.getTime();
  const daysUsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));

  if (daysUsed >= TRIAL_DURATION_DAYS) {
    // Solo user past trial window — treat as expired trial
    return {
      status: "expired",
      daysLeft: 0,
      daysUsed: Math.min(daysUsed, TRIAL_DURATION_DAYS),
      photosUsed,
      photosLimit: TRIAL_PHOTO_LIMIT,
    };
  }

  return {
    status: "active",
    daysLeft: TRIAL_DURATION_DAYS - daysUsed,
    daysUsed,
    photosUsed,
    photosLimit: TRIAL_PHOTO_LIMIT,
  };
}
