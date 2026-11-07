-- Round 4 (2026-11-07), additive only: nothing is renamed or dropped.
--
-- 1. event_settings.require_upload_approval — the owner's "guest photos wait
--    for my approval" switch. Default false: guest photos show at once (the
--    venue TV shows them during the event). Video messages always wait; that
--    rule lives in code (guestUploadStartsHidden), not here.
-- 2. partner_offers — offers from partners (a bridal salon, a florist…) that
--    the admin places on chosen pages for a chosen period. Service role only:
--    browsers never read the table; pages render the active offers server-side.

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table public.event_settings
  add column if not exists require_upload_approval boolean not null default false;

-- 2 ─────────────────────────────────────────────────────────────────────────
create table if not exists public.partner_offers (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null check (char_length(partner_name) between 1 and 120),
  headline text not null check (char_length(headline) between 1 and 160),
  body text check (body is null or char_length(body) <= 600),
  discount_code text check (discount_code is null or char_length(discount_code) <= 60),
  link_url text check (link_url is null or link_url ~ '^https://'),
  -- R2 key, always partners/<id>/<file> (checked in code before any signing).
  image_key text check (image_key is null or image_key ~ '^partners/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  placements text[] not null default '{}'::text[]
    check (placements <@ array['create_event', 'couple_dashboard', 'photographer_dashboard']::text[]),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  click_count integer not null default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_offers_period check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_partner_offers_live on public.partner_offers (is_active, starts_at, ends_at);

alter table public.partner_offers enable row level security;
-- No policies and no grants: only the service role reads or writes offers.
revoke all on public.partner_offers from anon, authenticated;

-- One click on an offer, counted atomically (the click route is public).
create or replace function public.increment_partner_click(offer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.partner_offers set click_count = click_count + 1 where id = offer_id;
$$;

revoke all on function public.increment_partner_click(uuid) from public, anon, authenticated;
grant execute on function public.increment_partner_click(uuid) to service_role;
