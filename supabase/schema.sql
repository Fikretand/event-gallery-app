create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'photographer' check (role in ('photographer', 'admin')),
  account_type text not null default 'photographer' check (account_type in ('photographer', 'couple')),
  plan_tier text not null default 'solo' check (plan_tier in ('solo', 'pro')),
  city text,
  phone text,
  avatar_url text,
  website_url text,
  instagram_url text,
  facebook_url text,
  bio text,
  show_on_homepage boolean not null default false,
  public_profile_consent boolean not null default false,
  public_email_on_homepage boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  client_name text,
  event_date timestamptz,
  slug text not null unique,
  upload_pin_hash text,
  gallery_pin_hash text,
  cover_image_id uuid,
  expires_at timestamptz,
  status text not null default 'active' check (status in ('draft', 'active', 'expired', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.event_settings (
  event_id uuid primary key references public.events (id) on delete cascade,
  allow_guest_upload boolean not null default true,
  allow_guest_video boolean not null default true,
  require_pin_for_upload boolean not null default false,
  require_pin_for_gallery boolean not null default true,
  max_guest_upload_mb integer not null default 250,
  gallery_visibility text not null default 'private' check (gallery_visibility in ('private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  uploaded_by_user_id uuid references public.users (id) on delete set null,
  source_type text not null check (source_type in ('photographer', 'guest')),
  storage_key text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  duration_seconds numeric,
  checksum text,
  thumbnail_key text,
  section_id uuid,
  status text not null default 'pending' check (status in ('pending', 'uploaded', 'processing', 'ready', 'failed')),
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_archives (
  event_id uuid primary key references public.events (id) on delete cascade,
  status text not null check (status in ('archiving', 'archived', 'restore_pending', 'restoring', 'failed', 'restored')),
  storage_tier text not null default 'warm' check (storage_tier in ('warm', 'cold')),
  warm_bucket text not null,
  cold_bucket text not null,
  archive_prefix text not null,
  archive_size_bytes bigint not null default 0,
  manifest jsonb,
  archived_at timestamptz,
  transition_to_cold_at timestamptz,
  restore_requested_at timestamptz,
  restored_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_files
  drop constraint if exists media_files_section_id_fkey;

alter table public.media_files
  add constraint media_files_section_id_fkey
  foreign key (section_id) references public.gallery_sections (id) on delete set null;

create table if not exists public.guest_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  guest_name text,
  guest_email text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  media_file_id uuid references public.media_files (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_activity_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  media_file_id uuid references public.media_files (id) on delete set null,
  actor_user_id uuid references public.users (id) on delete set null,
  action text not null check (
    action in (
      'media_hidden',
      'media_unhidden',
      'media_soft_deleted',
      'media_restored',
      'media_permanently_deleted',
      'cover_set',
      'cover_cleared'
    )
  ),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_upload_rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  count integer not null default 1,
  window_started_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_owner on public.events (owner_user_id);
create index if not exists idx_events_slug on public.events (slug);
create index if not exists idx_media_event on public.media_files (event_id);
create index if not exists idx_media_source on public.media_files (source_type);
create index if not exists idx_media_deleted on public.media_files (deleted_at);
create index if not exists idx_media_section on public.media_files (section_id);
create index if not exists idx_gallery_sections_event on public.gallery_sections (event_id, sort_order, created_at);
create index if not exists idx_event_archives_status on public.event_archives (status, archived_at desc);
create index if not exists idx_event_activity_event on public.event_activity_logs (event_id, created_at desc);
create index if not exists idx_guest_sessions_event on public.guest_upload_sessions (event_id);
create index if not exists idx_guest_rate_limit_key on public.guest_upload_rate_limits (bucket_key, window_started_at);

alter table public.users
  add column if not exists account_type text not null default 'photographer'
  check (account_type in ('photographer', 'couple'));
alter table public.users
  add column if not exists plan_tier text not null default 'solo'
  check (plan_tier in ('solo', 'pro'));

alter table public.users add column if not exists city text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists website_url text;
alter table public.users add column if not exists instagram_url text;
alter table public.users add column if not exists facebook_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists show_on_homepage boolean not null default false;
alter table public.users add column if not exists public_profile_consent boolean not null default false;
alter table public.users add column if not exists public_email_on_homepage boolean not null default false;
alter table public.media_files add column if not exists section_id uuid references public.gallery_sections (id) on delete set null;
create table if not exists public.event_archives (
  event_id uuid primary key references public.events (id) on delete cascade,
  status text not null check (status in ('archiving', 'archived', 'restore_pending', 'restoring', 'failed', 'restored')),
  storage_tier text not null default 'warm' check (storage_tier in ('warm', 'cold')),
  warm_bucket text not null,
  cold_bucket text not null,
  archive_prefix text not null,
  archive_size_bytes bigint not null default 0,
  manifest jsonb,
  archived_at timestamptz,
  transition_to_cold_at timestamptz,
  restore_requested_at timestamptz,
  restored_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, account_type, plan_tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'photographer'),
    coalesce(new.raw_user_meta_data ->> 'account_type', 'photographer'),
    coalesce(new.raw_user_meta_data ->> 'plan_tier', 'solo')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      account_type = excluded.account_type,
      plan_tier = excluded.plan_tier;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user_created();

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.event_settings enable row level security;
alter table public.media_files enable row level security;
alter table public.gallery_sections enable row level security;
alter table public.event_archives enable row level security;
alter table public.guest_upload_sessions enable row level security;
alter table public.downloads enable row level security;
alter table public.event_activity_logs enable row level security;
alter table public.guest_upload_rate_limits enable row level security;

create policy "users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "owners can manage their events"
  on public.events for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "owners can manage event settings"
  on public.event_settings for all
  using (
    exists (
      select 1 from public.events
      where public.events.id = event_settings.event_id
        and public.events.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where public.events.id = event_settings.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can manage event media"
  on public.media_files for all
  using (
    exists (
      select 1 from public.events
      where public.events.id = media_files.event_id
        and public.events.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where public.events.id = media_files.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can manage gallery sections"
  on public.gallery_sections for all
  using (
    exists (
      select 1 from public.events
      where public.events.id = gallery_sections.event_id
        and public.events.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where public.events.id = gallery_sections.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can manage event archives"
  on public.event_archives for all
  using (
    exists (
      select 1 from public.events
      where public.events.id = event_archives.event_id
        and public.events.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events
      where public.events.id = event_archives.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can read guest sessions"
  on public.guest_upload_sessions for select
  using (
    exists (
      select 1 from public.events
      where public.events.id = guest_upload_sessions.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can read download logs"
  on public.downloads for select
  using (
    exists (
      select 1 from public.events
      where public.events.id = downloads.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "owners can read activity logs"
  on public.event_activity_logs for select
  using (
    exists (
      select 1 from public.events
      where public.events.id = event_activity_logs.event_id
        and public.events.owner_user_id = auth.uid()
    )
  );

create policy "service role manages guest rate limits"
  on public.guest_upload_rate_limits for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
