# Tera Kairos responsive website v7

This version keeps the approved v6 design and adds a verified enquiry workflow.

## New in v7
- Adds a required visitor email field.
- Replaces the old `mailto:` form submission with a secure API submission.
- Enquiries stay pending until the visitor clicks a one-time verification link.
- Verification links expire after 60 minutes.
- Only verified enquiries are delivered to `tera.kairos@yahoo.com`.
- Adds honeypot spam protection and basic server-side rate limiting.
- Adds a dedicated verification result page.
- Scrubs personal form fields from Supabase after successful delivery.

See **EMAIL_VERIFICATION_SETUP.md** for the one-time Supabase + Resend configuration steps.

Until `config.js` is connected to the deployed Supabase function, the form will safely show a setup message rather than opening the visitor's email application.
