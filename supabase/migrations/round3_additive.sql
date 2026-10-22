-- Round 3, additive part: everything here only adds, so it is applied BEFORE
-- the code that uses it is deployed. Nothing the running app does changes.
--
-- 1. media_files.purpose            — guest video messages ('message') next to
--                                     ordinary photos/videos ('media').
-- 2. media_files.processing_attempts — the nightly recovery gives up on a file
--                                     after 3 tries instead of retrying it first
--                                     forever (audit lead process-media-…).
-- 3. event_settings.allow_video_messages — owner switch for video messages.
-- 4. users.subscription_event_at    — time of the last billing event applied,
--                                     so an older webhook delivery arriving late
--                                     cannot overwrite a newer state (audit lead
--                                     polar-webhook-status-last-writer-wins).
-- 5. media_reports                  — "report inappropriate" from the gallery.
--                                     Written and read by the service role only.
-- 6. unique media_files(storage_key) — one row per stored object (audit 3.9).
-- 7. atomic rate-limit counter      — unique (bucket_key, window) and an RPC that
--                                     increments in one statement (audit 3.7: the
--                                     select-then-insert let 140 PIN guesses
--                                     through a limit of 8).
--
-- Checked before writing (2026-10-22, production): no duplicate storage_key, no
-- duplicate (bucket_key, window_started_at).

begin;

-- 1–2
alter table public.media_files
  add column if not exists purpose text not null default 'media',
  add column if not exists processing_attempts integer not null default 0;
alter table public.media_files
  add constraint media_files_purpose_check check (purpose in ('media', 'message'));

-- 3
alter table public.event_settings
  add column if not exists allow_video_messages boolean not null default true;

-- 4
alter table public.users
  add column if not exists subscription_event_at timestamptz;

-- 5
create table if not exists public.media_reports (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media_files (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reason text check (reason is null or reason in ('inappropriate', 'private', 'other')),
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  constraint media_reports_once_per_reporter unique (media_id, reporter_hash)
);
create index if not exists idx_media_reports_event on public.media_reports (event_id);
alter table public.media_reports enable row level security;
-- No policies and no grants: browsers never touch this table.
revoke all on public.media_reports from anon, authenticated;

-- 6
create unique index if not exists media_files_storage_key_unique on public.media_files (storage_key);

-- 7
alter table public.guest_upload_rate_limits
  add constraint guest_upload_rate_limits_bucket_window unique (bucket_key, window_started_at);

create or replace function public.increment_rate_limit(p_key text, p_window_start timestamptz, p_by integer default 1)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into public.guest_upload_rate_limits as r (bucket_key, window_started_at, count)
  values (p_key, p_window_start, p_by)
  on conflict (bucket_key, window_started_at) do update set count = r.count + excluded.count
  returning r.count;
$$;

revoke all on function public.increment_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.increment_rate_limit(text, timestamptz, integer) to service_role;

commit;
