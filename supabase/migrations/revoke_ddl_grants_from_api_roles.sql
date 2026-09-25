-- Take TRUNCATE (and the other two DDL-ish privileges) away from the roles a
-- browser can hold.
--
-- Supabase's default `grant all` gives anon and authenticated TRUNCATE,
-- REFERENCES and TRIGGER on every table in public. None of them are used by
-- this app, and TRUNCATE is the dangerous one: row level security does not
-- apply to it, so the policies that keep each owner to their own rows would not
-- stop it emptying a whole table. Today it is unreachable only because PostgREST
-- never issues TRUNCATE — which makes the API surface, not the database, the
-- thing holding the line. This moves the line back into the database.
--
-- SELECT/INSERT/UPDATE/DELETE are untouched: the app's server client runs as
-- `authenticated` and relies on them, fenced by RLS (and, for users, by the
-- column grants in restrict_users_table_writes.sql).

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- And for tables created later, so a new migration does not quietly reopen it.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
