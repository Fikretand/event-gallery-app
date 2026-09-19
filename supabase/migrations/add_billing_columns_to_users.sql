-- Migration: add the billing columns to public.users
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Why this exists:
--   The app has been reading and writing these four columns for a while
--   (payment webhooks, the admin "mark as paid" action, every trial check),
--   but no migration ever created them. On a database without them each write
--   fails, which is invisible from the UI: a Polar or Payhip payment succeeds
--   and the account silently stays on the free trial.
--
-- What this does:
--   • subscription_status      — provider state; NULL means "no paid plan"
--                                (trial or expired), which is the default.
--   • subscription_provider    — "polar", "payhip", "lemonsqueezy" or
--                                "manual" for the BiH bank-transfer path.
--   • subscription_external_id — the provider's own id for the purchase, so a
--                                renewal or refund updates the same row.
--   • subscription_renews_at   — next renewal for subscriptions; NULL for
--                                one-time purchases.
--
-- All four are nullable with no default, so existing rows keep behaving
-- exactly as they do now. Safe to run more than once.

alter table public.users
  add column if not exists subscription_status text;

alter table public.users
  add column if not exists subscription_provider text;

alter table public.users
  add column if not exists subscription_external_id text;

alter table public.users
  add column if not exists subscription_renews_at timestamptz;

-- Constrain the status to the values the app knows how to read, so a typo or
-- an unexpected provider state fails loudly at write time instead of quietly
-- reading as "not subscribed" forever.
alter table public.users
  drop constraint if exists users_subscription_status_check;

alter table public.users
  add constraint users_subscription_status_check
    check (
      subscription_status is null
      or subscription_status in ('active', 'trialing', 'past_due', 'canceled')
    );

-- Webhooks look accounts up by the provider's id when resolving a renewal.
create index if not exists users_subscription_external_id_idx
  on public.users (subscription_external_id)
  where subscription_external_id is not null;
