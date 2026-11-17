-- Round 5 (2026-11-17), additive only: lead capture with a discount code.
--
-- People from the Instagram/TikTok ads leave an email on /popust and get a
-- personal code for One Event at a lower price. Three emails follow it: the
-- code at once, a reminder if it is unused, and a last offer with a further
-- discount a few days before it expires (src/lib/lead-sequence.ts).
--
-- lead_settings — the schedule, one row, edited at /admin/leads.
-- leads         — one row per email address, with its code and its own
--                 copy of the schedule (a settings change never moves a date
--                 already promised in a sent email).
-- lead_emails   — one row per email sent or attempted; unique (lead, kind)
--                 so two runs of the sender can never mail the same thing twice.
--
-- All three are service role only: browsers never read or write them.

create table if not exists public.lead_settings (
  id smallint primary key default 1 check (id = 1),
  is_active boolean not null default true,
  valid_days integer not null default 30 check (valid_days between 7 and 90),
  reminder_day integer not null default 10 check (reminder_day >= 1),
  final_days_before integer not null default 3 check (final_days_before >= 1),
  updated_at timestamptz not null default now(),
  constraint lead_settings_order check (reminder_day < valid_days - final_days_before)
);
insert into public.lead_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  locale text not null default 'bs' check (locale in ('bs', 'en')),
  code text not null check (code ~ '^CONF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  status text not null default 'active' check (status in ('active', 'redeemed', 'expired')),
  created_at timestamptz not null default now(),
  reminder_at timestamptz not null,
  final_at timestamptz not null,
  expires_at timestamptz not null,
  consent_at timestamptz not null,
  consent_text text not null check (char_length(consent_text) <= 500),
  source text check (source is null or char_length(source) <= 100),
  medium text check (medium is null or char_length(medium) <= 100),
  campaign text check (campaign is null or char_length(campaign) <= 100),
  ip_hash text,
  unsubscribe_token text not null,
  unsubscribed_at timestamptz,
  welcome_resent_at timestamptz,
  redeemed_at timestamptz,
  redeemed_user_id uuid references public.users (id) on delete set null,
  redeemed_price_bam integer,
  redeemed_payment_id text,
  constraint leads_email_unique unique (email),
  constraint leads_code_unique unique (code),
  constraint leads_unsubscribe_token_unique unique (unsubscribe_token),
  constraint leads_schedule check (reminder_at < final_at and final_at < expires_at)
);
create index if not exists idx_leads_status_expires on public.leads (status, expires_at);
create index if not exists idx_leads_created on public.leads (created_at desc);

create table if not exists public.lead_emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (kind in ('welcome', 'reminder', 'final')),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  attempts integer not null default 1,
  provider_id text,
  error text check (error is null or char_length(error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint lead_emails_once unique (lead_id, kind)
);

alter table public.lead_settings enable row level security;
alter table public.leads enable row level security;
alter table public.lead_emails enable row level security;
-- No policies and no grants: only the service role reads or writes these.
revoke all on public.lead_settings from anon, authenticated;
revoke all on public.leads from anon, authenticated;
revoke all on public.lead_emails from anon, authenticated;
