-- Migration: add preferred_locale column to public.users
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What this does:
--   • Adds a nullable `preferred_locale` text column so users can persist
--     their dashboard UI language (currently "en" or "bs").
--   • Nullable + no default so existing rows stay untouched and the app
--     treats NULL as "no preference, follow URL / browser default".
--   • Constrains the column to known locale codes to catch typos.

alter table public.users
  add column if not exists preferred_locale text;

alter table public.users
  drop constraint if exists users_preferred_locale_check;

alter table public.users
  add constraint users_preferred_locale_check
    check (preferred_locale is null or preferred_locale in ('en', 'bs'));
