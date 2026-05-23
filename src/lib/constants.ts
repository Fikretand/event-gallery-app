export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const MAX_PHOTOGRAPHER_UPLOAD_MB = 1024;
export const DEFAULT_MAX_GUEST_UPLOAD_MB = 250;
export const MAX_GUEST_FILES_PER_UPLOAD = 25;
export const MAX_PHOTOGRAPHER_FILES_PER_UPLOAD = 150;
export const SOLO_ACTIVE_EVENT_LIMIT = 5;
export const SOLO_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;
export const PRO_ACTIVE_EVENT_LIMIT = 25;
export const PRO_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_MB = 5;
export const TRIAL_DURATION_DAYS = 7;
export const TRIAL_PHOTO_LIMIT = 20;
export const TRIAL_EVENT_LIMIT = 1;
export const GUEST_UPLOAD_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
};
export const PHOTOGRAPHER_UPLOAD_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 60,
};
