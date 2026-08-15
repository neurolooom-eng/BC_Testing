# Backlog

## Supabase authentication (deferred)

Real auth is built and ready to go (`sql/schema.sql`, `scripts/import_users_from_excel.py`,
`data/users_master.xlsx`, `SETUP.md`) but **not currently wired up**. The
site is running on temporary hardcoded credentials instead — see below.

**When ready to pick this back up:**

1. Follow `SETUP.md` steps 1–5 (create the Supabase project, run the schema,
   fill in `public/js/supabase-client.js`, populate `data/users_master.xlsx`,
   run the import script).
2. Swap `public/login.html`, `public/signup.html`, and `public/dashboard.html`
   back to the Supabase-backed scripts:
   - `login.html`: replace the `temp-local-auth.js` + `auth.js` script tags
     with:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-client.js"></script>
     <script src="js/auth.js"></script>
     ```
     `js/auth.js` currently contains the temporary local-credential version —
     restore the Supabase version (see git history: the commit that added
     `temp-local-auth.js` replaced it) or ask Claude to redo the Supabase wiring.
   - `signup.html`: restore its `supabase-js` + `supabase-client.js` +
     `signup.js` script tags, and restore `signup.js`'s Supabase logic
     (also replaced by a "temporarily unavailable" stub — see git history).
   - `dashboard.html`: restore the Supabase session check.
3. Delete `public/js/temp-local-auth.js` and the two temporary accounts below.

## Temporary hardcoded login (current state)

Two accounts are hardcoded in `public/js/temp-local-auth.js` for testing,
**not backed by any real authentication system**:

| User ID | Password |
|---|---|
| msv | 123 |
| pnk | 123 |

**This is not secure** — the credentials are visible in the page source to
anyone who opens dev tools, and "login" is just a client-side JavaScript
check with no server behind it. This is fine for kicking the tires on the
UI, but must not be used once real users or real data are involved. Move to
the Supabase setup above before that happens.
