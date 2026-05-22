-- Migration: link media_files back to the guest upload session
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
--
-- What this does:
--   • Adds upload_session_id to media_files so we know which guest uploaded each file
--   • Creates an index for fast joins
--
-- This is idempotent — safe to run multiple times.

alter table public.media_files
  add column if not exists upload_session_id uuid
    references public.guest_upload_sessions (id)
    on delete set null;

create index if not exists idx_media_upload_session
  on public.media_files (upload_session_id);
