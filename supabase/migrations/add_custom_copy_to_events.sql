-- Per-event wording for the public gallery and the guest upload page.
--
-- A flat object of dictionary keys to the owner's own text, e.g.
--   {"gallery.browseCurated": "Hvala što ste bili s nama!"}
-- A key that is missing (or an empty object) means "use the standard text",
-- so the default is '{}' and existing events are unaffected.
--
-- The app whitelists keys and caps each value before writing
-- (src/lib/custom-copy.ts); the size check is the database's own backstop.
alter table public.events
  add column if not exists custom_copy jsonb not null default '{}'::jsonb;

alter table public.events
  drop constraint if exists events_custom_copy_is_small_object;

alter table public.events
  add constraint events_custom_copy_is_small_object
  check (jsonb_typeof(custom_copy) = 'object' and pg_column_size(custom_copy) < 32768);
