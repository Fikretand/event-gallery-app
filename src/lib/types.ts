export type EventStatus = "draft" | "active" | "expired" | "archived";
export type MediaSourceType = "photographer" | "guest";
export type MediaStatus = "pending" | "uploaded" | "processing" | "ready" | "failed";
export type AccountType = "photographer" | "couple";
export type PhotographerPlanTier = "solo" | "pro";

export type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role: "photographer" | "admin";
  account_type: AccountType;
  plan_tier: PhotographerPlanTier;
  city: string | null;
  phone: string | null;
  avatar_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  bio: string | null;
  show_on_homepage: boolean;
  public_profile_consent: boolean;
  public_email_on_homepage: boolean;
  created_at: string;
};

export type EventRecord = {
  id: string;
  owner_user_id: string;
  title: string;
  client_name: string | null;
  slug: string;
  event_date: string | null;
  expires_at: string | null;
  upload_pin_hash: string | null;
  gallery_pin_hash: string | null;
  status: EventStatus;
  cover_image_id: string | null;
  created_at: string;
  event_settings?: EventSettingsRecord | null;
};

export type EventSettingsRecord = {
  event_id: string;
  allow_guest_upload: boolean;
  allow_guest_video: boolean;
  require_pin_for_upload: boolean;
  require_pin_for_gallery: boolean;
  max_guest_upload_mb: number;
  gallery_visibility: "private";
  created_at?: string;
  updated_at?: string;
};

export type MediaFileRecord = {
  id: string;
  event_id: string;
  uploaded_by_user_id: string | null;
  source_type: MediaSourceType;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  checksum: string | null;
  thumbnail_key: string | null;
  section_id: string | null;
  status: MediaStatus;
  hidden_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type GuestUploadSessionRecord = {
  id: string;
  event_id: string;
  guest_name: string | null;
  guest_email: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type EventAnalytics = {
  mediaCount: number;
  guestUploads: number;
  storageUsedBytes: number;
  downloadCount: number;
};

export type UploadRequestFile = {
  name: string;
  size: number;
  type: string;
};

export type UploadGrant = {
  objectKey: string;
  uploadUrl: string;
  contentType: string;
  originalFilename: string;
  size: number;
  sourceType: MediaSourceType;
  confirmToken: string;
};

export type MediaView = MediaFileRecord & {
  previewUrl: string | null;
  thumbnailUrl: string | null;
};

export type PublicPhotographerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  public_email_on_homepage: boolean;
};

export type AccountUsage = {
  liveUsedStorageBytes: number;
  liveAvailableStorageBytes: number;
  liveStorageLimitBytes: number;
  activeEvents: number;
  activeEventLimit: number;
  remainingEventSlots: number;
};


export type GallerySectionRecord = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type DownloadRecord = {
  id: string;
  event_id: string;
  user_id: string | null;
  media_file_id: string | null;
  created_at: string;
};

export type EventActivityAction =
  | "media_hidden"
  | "media_unhidden"
  | "media_soft_deleted"
  | "media_restored"
  | "media_permanently_deleted"
  | "cover_set"
  | "cover_cleared";

export type EventActivityRecord = {
  id: string;
  event_id: string;
  media_file_id: string | null;
  actor_user_id: string | null;
  action: EventActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
