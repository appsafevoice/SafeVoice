# Supabase Signup OTP Setup

SafeVoice now expects signup confirmation to use a 6-digit email code.

This app is currently configured to use Supabase project:

- `ocicgncelxteqlzzuikz`

To make Supabase send a code instead of a clickable confirmation link:

1. Open the Supabase Dashboard for this project.
2. Go to `Authentication` -> `Templates`.
3. Open the `Confirm signup` email template.
4. Use `{{ .Token }}` in the email body.
5. Remove `{{ .ConfirmationURL }}` from that template if you do not want link-based confirmation.
6. You can paste the HTML from `supabase/email-templates/confirm-signup.html` as the email body.

To make sure the code is exactly 6 digits:

- Hosted Supabase:
  In project `ocicgncelxteqlzzuikz`, set the Auth config value `mailer_otp_length` to `6`.
- Local Supabase CLI project:
  Set `auth.email.otp_length = 6` in `supabase/config.toml`, then restart Supabase.

If your email is currently sending 8 digits, your Auth OTP length is configured to `8`. Updating the template alone will not change that.

Notes:

- This template is used for the public signup flow in the app.
- The same template is also used when a Super Admin creates a new admin login from the Admin Management screen.
- The verification UI in the app is now available at `/verify-email`.
- The provided template includes both the OTP (`{{ .Token }}`) and a button to open `{{ .SiteURL }}/verify-email?email={{ .Email }}`.
- OTP length changes only affect newly sent emails.
