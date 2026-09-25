-- An account could make itself an admin at signup.
--
-- handle_auth_user_created copies raw_user_meta_data into public.users, and that
-- metadata is whatever the client sends as `options.data` to
-- POST /auth/v1/signup. Anyone holding the public anon key can call that
-- endpoint directly, skipping signupAction entirely, with
--
--     { "email": ..., "password": ..., "data": { "role": "admin" } }
--
-- and the trigger — SECURITY DEFINER, so neither RLS nor the column grants in
-- restrict_users_table_writes.sql apply — wrote role = 'admin'. The /admin
-- layout trusts that column. Proven against the live database in a
-- rolled-back transaction before this change: the row came out as admin.
--
-- restrict_users_table_writes.sql closed the UPDATE route to the same column;
-- this closes the INSERT route. The rule for both: user_metadata is the user's
-- to edit, so nothing that grants anything may be read from it.
--
--   role         — never from metadata. Every new account is a photographer;
--                  admin is granted only by an existing admin.
--   plan_tier    — kept as the plan picked on the pricing page, but only as a
--                  hint: the payment webhooks overwrite it with what was bought,
--                  and an unpaid account is held by the trial whatever it says.
--   account_type — the user's own choice; whitelisted so a bad value falls back
--                  instead of failing the signup on the check constraint.
--   preferred_locale — new: the language they signed up in, so the dashboard
--                  and the confirmation email both start in it.
--
-- ON CONFLICT no longer touches role or plan_tier, so a stray re-insert can
-- neither promote nor demote anybody.

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.users (id, email, full_name, role, account_type, plan_tier, preferred_locale)
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'full_name', ''),
    'photographer',
    case when meta ->> 'account_type' = 'couple' then 'couple' else 'photographer' end,
    case when meta ->> 'plan_tier' = 'pro' then 'pro' else 'solo' end,
    case when meta ->> 'locale' in ('en', 'bs') then meta ->> 'locale' end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      account_type = excluded.account_type;
  return new;
end;
$$;
