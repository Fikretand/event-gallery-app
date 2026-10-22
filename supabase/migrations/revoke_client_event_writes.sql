-- Browsers may no longer insert or update events and event_settings directly.
--
-- Security audit 2026-10-20 (medium, rls-entitlement-columns-tenant-writable):
-- the RLS policies check only that the row is the caller's own, and the table
-- grants allowed every column. With the public anon key and their own session
-- an owner could insert events past their plan's event limit, or move a One
-- Event's event_date / expires_at to 2099, and the app's limits never ran.
-- (media_files was closed the same way in bind_object_keys_to_owner.sql.)
--
-- What the app does as `authenticated` after this: SELECT and DELETE of its own
-- events (RLS), nothing else on these two tables. Creating and editing an event,
-- its settings, cover and guest-facing texts go through the service role after
-- the ownership and plan checks in src/lib/events.ts and src/lib/actions.ts.
--
-- Order: apply only after the code that writes with the service role is
-- deployed, or creating and saving events fails.

begin;

revoke insert, update on public.events from anon, authenticated;
revoke insert, update on public.event_settings from anon, authenticated;

commit;
