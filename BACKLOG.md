# Backlog

## 1. Supabase authentication (deferred — the big one)

Real auth is built and ready (`sql/schema.sql`,
`scripts/import_users_from_excel.py`, `data/users_master.xlsx`, `SETUP.md`)
but **not wired up**. The site runs on temporary hardcoded credentials
instead (see section 3).

Several other items below are blocked on this, because they all need a
real server-side identity and a real database rather than the browser.

### Steps to pick it back up

1. Follow `SETUP.md` steps 1–5: create the Supabase project, run the
   schema, fill in `public/js/supabase-client.js`, populate
   `data/users_master.xlsx`, run the import script.
2. Restore the Supabase-backed login flow:
   - **`login.html`** — replace the `temp-local-auth.js` + `auth.js` script
     tags with:
     ```html
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-client.js"></script>
     <script src="js/auth.js"></script>
     ```
     `js/auth.js` currently holds the temporary local-credential version;
     restore the Supabase version from git history (the commit that added
     `temp-local-auth.js` replaced it).
   - **`signup.html`** — restore its `supabase-js` + `supabase-client.js` +
     `signup.js` tags, and restore `signup.js`'s Supabase logic (currently
     a "temporarily unavailable" stub — see git history).
   - **`js/topbar.js`** — `renderTopbar()` calls `tempGetSession()` and
     redirects to `login.html` when there's no session. Point it at
     `supabase.auth.getSession()` instead. This one change covers
     `dashboard.html`, `production-records.html` and
     `process-check-sheet.html`, since they all render through it.
   - **`dev.html`** — same session check, plus the dev-page gate (below).
3. Note the login page's User ID field is `type="text"` (the temp accounts
   `msv`/`pnk` aren't emails). Supabase authenticates by email, so either
   switch it back to `type="email"` or map User ID → email on submit.
4. Delete `public/js/temp-local-auth.js` and the temporary accounts.

## 2. Blocked on the backend

These are implemented as far as a static site allows, and each needs
section 1 done first.

### Dev page access control
`dev.html` is restricted to `msv` and `pnk` via `DEV_PAGE_USERS` in
`temp-local-auth.js` — a **client-side check only**. Anyone can bypass it
with dev tools. Replace with a real role on `public.profiles` (e.g.
`role = 'Admin'`) enforced by RLS.

### Process Check Sheet storage
The PCS module stores records in `localStorage` (`js/pcs-store.js`), so
data stays on whichever machine typed it in and is not shared between
users or shifts. This is the single biggest limitation of the module —
three shift supervisors cannot see each other's entries.

Move to Supabase tables mirroring the parent/child structure:
- `pcs_daily` — the daily once record (parent)
- `pcs_hourly` — hourly readings, FK to `pcs_daily`
- `pcs_shift` — shift entries, FK to `pcs_daily`, including the core pin
  cavity map

`js/pcs-store.js` is deliberately isolated: swap its function bodies for
Supabase queries and the UI above it needs no changes.

### Out-of-spec admin alerts
The tolerances sheet requires: *"Out of spec data must be highlighted in
red with an automated alert sent to admin."* The red highlighting is done
(field, row and sheet level). The **alert is not** — sending mail needs a
backend. Once on Supabase, do this with a database trigger or Edge
Function on insert into `pcs_hourly` / `pcs_shift`. Until then the UI says
plainly that no alert was sent, rather than implying one was.

### Check sheet printing / submission
The tolerances sheet notes: *"Per day 3 times shift wise submission from
shift supervisors, all datas should be printed in check sheet documents."*
Not started — needs a print/PDF view laid out like the paper QC FMT 038
form, and a submit-and-lock step per shift so a submitted sheet can't be
quietly edited afterwards.

## 3. Temporary hardcoded login (current state)

Two accounts are hardcoded in `public/js/temp-local-auth.js`:

| User ID | Password |
|---|---|
| msv | 123 |
| pnk | 123 |

**This is not secure.** The credentials are readable in page source, and
"login" is a client-side JavaScript check with no server behind it —
nothing stops anyone from skipping `login.html` entirely. Fine for
exercising the UI; must be replaced before real users or real production
data are involved.

Sessions are kept in `sessionStorage`, so they last only for the current
tab (the "Remember me" option was removed).

## 4. Open questions on the source spreadsheets

- **Tilting Time tolerance** — the cell in `Tolerances_updated_.xlsx`
  contains the date `2026-12-14`, which is Excel autocorrecting `12-14`.
  Currently read as **12–14 sec**. Needs confirming: the filled sample in
  `Master_Cpy_Process_Check_sheet.xlsx_Update.xlsx` records 16 sec, which
  would be out of spec under that reading.
- **Missing 12.00am slot** — the paper sheet's time row jumps from 11.30pm
  to 12.30am. Treated as a transcription slip; the module includes 12.00am
  for a full 48 slots (16 per shift).
- **Holding furnace / No. of Charges** — the sample sheet has dates typed
  into this row instead of charge counts, so the intended unit is unclear.
  Currently a plain number.

## 5. Assets

- `public/images/logo.png` doesn't exist yet — both the login page and the
  top bar reference it, so the brand mark renders as an empty circle. Needs
  the actual Bestcast logo file committed to the repo.
