# Auth email templates

Paste these into Supabase → **Authentication → Emails → Templates**. They are
kept here so the wording is versioned with the code that receives the links.

| Template in Supabase | Subject file | Body file |
|---|---|---|
| Confirm sign up | `confirm-signup.subject.txt` | `confirm-signup.html` |
| Reset password  | `reset-password.subject.txt` | `reset-password.html` |

## Do these in this order

1. **Custom SMTP first** (Authentication → Emails → SMTP Settings). Without it,
   Supabase delivers auth mail *only to members of the project's team* and
   refuses every other address — so turning on confirmation before this would
   stop real people from ever activating an account.
2. **Site URL** (Authentication → URL Configuration) must be the production
   address. The links below are built from `{{ .SiteURL }}`.
3. Paste both templates.
4. Only then turn on **Confirm email** (Sign In / Providers → Email).

## Why the links look like this

They point at `/auth/confirm?token_hash=…&type=…` rather than Supabase's
default `{{ .ConfirmationURL }}`. The default goes through a PKCE code that only
works in the browser that started the flow, so someone who signs up on a laptop
and opens the mail on their phone would fail. `token_hash` is verified on our
server and works anywhere.

## Language

`{{ .Data }}` is the user's metadata; signup stores `locale` there. The check is
written with `with` on purpose. Rendered with Go's text/template, the obvious
`{{ if eq .Data.locale "en" }}` is fine for a missing key, but fails outright —
"nil pointer evaluating interface {}.locale" — when an account has no metadata
at all, and a template error means the mail is not sent. The `with` form was
rendered against bs, en, a missing key, empty metadata and nil metadata, and
produced the right language in every case. Anything that is not explicitly
`"en"` gets Bosnian — the primary market.

Keep them short and plain: one link, no marketing, no user-supplied text (not
even the name). Supabase's deliverability guidance is explicit that anything
promotional in an auth mail raises the chance it lands in spam.
