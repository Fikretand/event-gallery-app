-- Round 6 (2026-11-18), additive only: the after-trial offer.
--
-- A one-event account whose 7-day trial ended without a purchase gets one
-- email with a code: One Event at the offer price (10 KM off) for a few days.
-- It is a lead like the ones from /popust, marked offer_type = 'trial', with
-- the account it was made for, and its one email has kind 'trial'.

alter table public.leads
  add column if not exists offer_type text not null default 'lead',
  add column if not exists user_id uuid references public.users (id) on delete set null;

alter table public.leads drop constraint if exists leads_offer_type_check;
alter table public.leads add constraint leads_offer_type_check check (offer_type in ('lead', 'trial'));

alter table public.lead_emails drop constraint if exists lead_emails_kind_check;
alter table public.lead_emails add constraint lead_emails_kind_check check (kind in ('welcome', 'reminder', 'final', 'trial'));

alter table public.lead_settings
  add column if not exists trial_is_active boolean not null default true,
  add column if not exists trial_valid_days integer not null default 5;

alter table public.lead_settings drop constraint if exists lead_settings_trial_valid_days_check;
alter table public.lead_settings add constraint lead_settings_trial_valid_days_check check (trial_valid_days between 2 and 14);
