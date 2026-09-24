-- Stop an account from promoting itself to admin, or to a paid plan.
--
-- The UPDATE policy on public.users was `USING (auth.uid() = id)` with no
-- WITH CHECK. Postgres then reuses the USING expression as the check, and that
-- expression constrains only `id` -- every other column was freely writable by
-- the row's own owner. `authenticated` also held a table-wide UPDATE grant, and
-- the anon key is public by design (it ships in the client bundle), so any
-- signed-up account could send
--
--     PATCH /rest/v1/users?id=eq.<its own uid>   {"role": "admin"}
--
-- and walk into /admin, which trusts exactly that column
-- (src/app/admin/layout.tsx:18-19). The same request could set plan_tier or
-- subscription_status and hand itself a paid plan for nothing.
--
-- The fix is a column-scoped grant. The only UPDATE this application performs
-- as the `authenticated` role is the profile save in src/lib/actions.ts:307-320,
-- and it writes exactly the twelve columns granted back below. Every privileged
-- write -- role, plan_tier, subscription_* -- goes through the service-role
-- client (src/lib/admin-actions.ts, the two billing webhooks), which bypasses
-- grants and RLS entirely. So nothing here narrows what the app can do.

begin;

-- These come from Supabase's default `grant all`. Drop them for the two roles a
-- browser can ever hold.
revoke insert, update, delete on public.users from anon, authenticated;

-- Hand back only the profile fields the settings form actually writes.
grant update (
  full_name,
  city,
  phone,
  avatar_url,
  website_url,
  instagram_url,
  facebook_url,
  bio,
  show_on_homepage,
  public_profile_consent,
  public_email_on_homepage,
  preferred_locale
) on public.users to authenticated;

-- State the check explicitly instead of relying on Postgres reusing USING.
-- Belt and braces: the grant above is what actually stops the escalation, but a
-- future `grant update on public.users` would silently reopen it, and this
-- clause would not.
drop policy if exists "users can update their own profile" on public.users;
create policy "users can update their own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

commit;
