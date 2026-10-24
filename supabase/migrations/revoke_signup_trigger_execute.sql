-- The signup trigger function is not an API.
--
-- public.handle_auth_user_created() is SECURITY DEFINER and lives in the
-- exposed schema, so with the default EXECUTE grant to PUBLIC anyone holding the
-- anon key could call it as /rest/v1/rpc/handle_auth_user_created (Supabase
-- advisors 0028/0029). It is meant to run only as the trigger on auth.users.
--
-- Postgres checks EXECUTE on a trigger function when the trigger is created,
-- not each time it fires, so signups keep working after this.

revoke execute on function public.handle_auth_user_created() from public, anon, authenticated;
