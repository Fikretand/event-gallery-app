-- The last checkout that failed with a lead's code, with the payment
-- provider's own message. Runtime logs on Hobby last an hour; this keeps the
-- reason where /admin/leads can show it. Service role only, like the table.
alter table public.leads
  add column if not exists last_checkout_error text,
  add column if not exists last_checkout_error_at timestamptz;
