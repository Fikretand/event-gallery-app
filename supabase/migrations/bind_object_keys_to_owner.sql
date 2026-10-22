-- Object keys belong to their row's own namespace, and only the server writes them.
--
-- Security audit 2026-10-20 (high, two findings): media_files.storage_key /
-- thumbnail_key and users.avatar_url are free text that the row's owner could
-- write directly through PostgREST (anon key + own JWT): the media_files RLS
-- policy checks only event ownership, and avatar_url was in the users column
-- grant. Service-role code then signed, read or deleted whatever key the row
-- named, so one tenant could download or permanently delete another tenant's
-- guest photos.
--
-- The application side is fixed in src/lib/object-keys.ts: every sink refuses a
-- key outside events/<event_id>/ or users/<user_id>/avatar/. This migration is
-- the second layer, so the database itself never stores such a key.
--
-- What the app writes as `authenticated` after this change:
--   media_files: only section_id (assignMediaSection, deleteGallerySection).
--     Rows are inserted and every other column is updated by the service role
--     (recordCompletedUpload, processMediaById, hide/delete/restore).
--   users.avatar_url: nothing. The profile save writes it with the service
--     role, and only a key it generated itself (src/lib/actions.ts).
--
-- Order: apply only after the code that stops writing avatar_url as
-- `authenticated` is deployed, or the old profile save fails.
--
-- Checked before writing (2026-10-22, production): 21 media rows and 1 avatar,
-- none outside its namespace, so the constraints are added validated.

begin;

-- media_files: no direct inserts or updates from a browser role, except moving
-- a file between gallery sections.
revoke insert, update on public.media_files from anon, authenticated;
grant update (section_id) on public.media_files to authenticated;

-- users: avatar_url leaves the self-service column grant.
revoke update (avatar_url) on public.users from authenticated;

-- The key shapes server code creates (src/lib/media.ts, src/lib/actions.ts).
alter table public.media_files
  add constraint media_files_storage_key_in_event
    check (storage_key like 'events/' || event_id::text || '/%' and position('..' in storage_key) = 0),
  add constraint media_files_thumbnail_key_in_event
    check (thumbnail_key is null
           or (thumbnail_key like 'events/' || event_id::text || '/%' and position('..' in thumbnail_key) = 0));

alter table public.users
  add constraint users_avatar_key_in_user
    check (avatar_url is null
           or (avatar_url like 'users/' || id::text || '/avatar/%' and position('..' in avatar_url) = 0));

commit;
