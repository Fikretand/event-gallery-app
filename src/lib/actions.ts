"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidPublicProfileUrl, normalizeAccountType, resolveAccountRedirect } from "@/lib/account";
import { getAccountTypeForUser, getUserProfile } from "@/lib/auth";
import { PROFILE_AVATAR_MAX_MB } from "@/lib/constants";
import { env } from "@/lib/env";
import {
  createEvent,
  createGallerySection,
  deleteGallerySection,
  getAccountUsage,
  getCoupleAccessEndsAt,
  getOwnerEventBySlug,
  listOwnerEvents,
  permanentlyDeleteEventBySlug,
  renameGallerySection,
  updateEvent,
  verifyGalleryPinAndGrantAccess,
} from "@/lib/events";
import { deleteStoredObject, putStoredObject } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function validateCoupleExpiry(expiresAt: string | undefined, maxAllowedIso: string) {
  if (!expiresAt) {
    return maxAllowedIso;
  }

  if (new Date(expiresAt).getTime() > new Date(maxAllowedIso).getTime()) {
    throw new Error("This plan allows private gallery access for up to 90 days from the event date.");
  }

  return expiresAt;
}

export async function loginAction(_: { error?: string } | undefined | void, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  const accountType = await getAccountTypeForUser(supabase, data.user.id, data.user.user_metadata?.account_type);
  const existingEvents = accountType === "couple" ? await listOwnerEvents(data.user.id) : [];
  redirect(resolveAccountRedirect(accountType, { eventSlug: existingEvents[0]?.slug ?? null }));
}

function normalizePlanTier(raw: FormDataEntryValue | null): "solo" | "pro" {
  return raw === "pro" ? "pro" : "solo";
}

export async function signupAction(_: { error?: string } | undefined | void, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const intent = normalizeAccountType(formData.get("intent"));
  const planTier = normalizePlanTier(formData.get("plan"));
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const nextPath = resolveAccountRedirect(intent);
  const redirectTo = `${env.appUrl.replace(/\/$/, "")}/auth/confirm?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: fullName,
        role: "photographer",
        account_type: intent,
        plan_tier: planTier,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    redirect(`/signup/verify?intent=${intent}&email=${encodeURIComponent(email)}`);
  }

  redirect(nextPath);
}

export async function requestPasswordResetAction(
  _: { error?: string; success?: string } | undefined | void,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl.replace(/\/$/, "")}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Password reset link sent. Check your email for the recovery link.",
  };
}

export async function resetPasswordAction(
  _: { error?: string; success?: string } | undefined | void,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your reset session is missing or expired. Please request a new reset link." };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Password updated successfully. You can now sign in with your new password.",
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function createEventAction(_: { error?: string } | undefined | void, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let slug: string;

  try {
    const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
    if (accountType === "couple") {
      const existingEvents = await listOwnerEvents(user.id);
      if (existingEvents.length > 0) {
        redirect(`/dashboard/events/${existingEvents[0].slug}`);
      }
    } else {
      const usage = await getAccountUsage(user.id);
      if (usage.remainingEventSlots <= 0) {
        throw new Error(`Your current plan includes up to ${usage.activeEventLimit} active events. Archive or delete one before creating another.`);
      }
    }
    const eventDate = String(formData.get("eventDate") ?? "");
    if (accountType === "couple" && !eventDate) {
      throw new Error("Event date is required for the One Wedding plan.");
    }
    const expiresAtInput = String(formData.get("expiresAt") ?? "");
    const expiresAt =
      accountType === "couple"
        ? validateCoupleExpiry(expiresAtInput || undefined, getCoupleAccessEndsAt({
            created_at: new Date().toISOString(),
            event_date: eventDate || null,
          }))
        : expiresAtInput || undefined;

    slug = await createEvent({
      ownerUserId: user.id,
      title: String(formData.get("title") ?? ""),
      clientName: String(formData.get("clientName") ?? ""),
      eventDate,
      expiresAt,
      uploadPin: String(formData.get("uploadPin") ?? ""),
      galleryPin: String(formData.get("galleryPin") ?? ""),
      allowGuestUpload: formData.get("allowGuestUpload") === "on",
      allowGuestVideo: formData.get("allowGuestVideo") === "on",
      requirePinForUpload: formData.get("requirePinForUpload") === "on",
      requirePinForGallery: formData.get("requirePinForGallery") === "on",
      maxGuestUploadMb: Number(formData.get("maxGuestUploadMb") ?? "250"),
    });

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create event.",
    };
  }

  redirect(`/dashboard/events/${slug}`);
}

export async function updatePhotographerProfileAction(
  _: { error?: string; success?: string } | undefined | void,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(supabase, user.id);
  if (!profile) {
    return { error: "Profile not found." };
  }

  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();

  for (const [label, value] of [
    ["Website", websiteUrl],
    ["Instagram", instagramUrl],
    ["Facebook", facebookUrl],
  ] as const) {
    if (!isValidPublicProfileUrl(value)) {
      return { error: `${label} link must start with http:// or https://` };
    }
  }

  let avatarKey = profile.avatar_url;
  const avatar = formData.get("avatar");

  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      return { error: "Profile image must be an image file." };
    }

    if (avatar.size > PROFILE_AVATAR_MAX_MB * 1024 * 1024) {
      return { error: `Profile image must be smaller than ${PROFILE_AVATAR_MAX_MB} MB.` };
    }

    const extension = avatar.name.includes(".") ? avatar.name.split(".").pop()?.toLowerCase() : "jpg";
    avatarKey = `users/${user.id}/avatar/${randomUUID()}.${extension || "jpg"}`;
    const uploadResult = await putStoredObject(avatarKey, Buffer.from(await avatar.arrayBuffer()), avatar.type);
    if (!uploadResult) {
      return { error: "Avatar upload is not available until R2 storage is configured." };
    }

    if (profile.avatar_url && profile.avatar_url !== avatarKey) {
      await deleteStoredObject(profile.avatar_url);
    }
  }

  const showOnHomepage = formData.get("showOnHomepage") === "on";
  const publicProfileConsent = formData.get("publicProfileConsent") === "on";
  const publicEmailOnHomepage = formData.get("publicEmailOnHomepage") === "on";

  const { error } = await supabase
    .from("users")
    .update({
      full_name: String(formData.get("fullName") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      avatar_url: avatarKey,
      website_url: websiteUrl || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
      show_on_homepage: showOnHomepage && publicProfileConsent,
      public_profile_consent: publicProfileConsent,
      public_email_on_homepage: publicProfileConsent && showOnHomepage && publicEmailOnHomepage,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: "Profile saved." };
}

export async function createGallerySectionAction(
  slug: string,
  _: { error?: string } | undefined | void,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Section name is required.");
    }

    await createGallerySection(user.id, slug, name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create section." };
  }

  revalidatePath(`/dashboard/events/${slug}`);
}

export async function renameGallerySectionAction(
  slug: string,
  sectionId: string,
  _: { error?: string } | undefined | void,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      throw new Error("Section name is required.");
    }

    await renameGallerySection(user.id, slug, sectionId, name);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to rename section." };
  }

  revalidatePath(`/dashboard/events/${slug}`);
}

export async function deleteGallerySectionAction(slug: string, sectionId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await deleteGallerySection(user.id, slug, sectionId);
  revalidatePath(`/dashboard/events/${slug}`);
}

export async function permanentlyDeleteEventAction(slug: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await permanentlyDeleteEventBySlug(user.id, slug);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}

export async function unlockGalleryAction(
  slug: string,
  event: { gallery_pin_hash: string | null; event_settings?: { require_pin_for_gallery: boolean } | null },
  _: { error?: string } | undefined | void,
  formData: FormData,
) {
  const pin = String(formData.get("pin") ?? "");
  const success = await verifyGalleryPinAndGrantAccess(
    {
      ...event,
      slug,
    } as never,
    pin,
  );

  if (!success) {
    return { error: "Incorrect gallery PIN." };
  }

  redirect(`/gallery/${slug}`);
}

export async function updateEventAction(
  slug: string,
  _: { error?: string } | undefined | void,
  formData: FormData,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured yet." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const existingEvent = await getOwnerEventBySlug(user.id, slug);
    if (!existingEvent) {
      throw new Error("Event not found.");
    }

    const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
    const eventDate = String(formData.get("eventDate") ?? "") || existingEvent.event_date || "";
    if (accountType === "couple" && !eventDate) {
      throw new Error("Event date is required for the One Wedding plan.");
    }
    const expiresAtInput = String(formData.get("expiresAt") ?? "");
    const coupleMaxAccessEndsAt =
      accountType === "couple"
        ? getCoupleAccessEndsAt({
            created_at: existingEvent.created_at,
            event_date: eventDate || null,
          })
        : undefined;
    const expiresAt =
      accountType === "couple"
        ? validateCoupleExpiry(undefined, coupleMaxAccessEndsAt!)
        : expiresAtInput || undefined;

    await updateEvent(user.id, slug, {
      title: String(formData.get("title") ?? ""),
      clientName: String(formData.get("clientName") ?? ""),
      eventDate,
      expiresAt,
      uploadPin: String(formData.get("uploadPin") ?? ""),
      galleryPin: String(formData.get("galleryPin") ?? ""),
      allowGuestUpload: formData.get("allowGuestUpload") === "on",
      allowGuestVideo: formData.get("allowGuestVideo") === "on",
      requirePinForUpload: formData.get("requirePinForUpload") === "on",
      requirePinForGallery: formData.get("requirePinForGallery") === "on",
      maxGuestUploadMb: Number(formData.get("maxGuestUploadMb") ?? "250"),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update event.",
    };
  }

  revalidatePath(`/dashboard/events/${slug}`);
  redirect(`/dashboard/events/${slug}?saved=1`);
}
