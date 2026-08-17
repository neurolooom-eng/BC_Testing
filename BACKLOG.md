# Backlog

## 1. Supabase authentication (deferred — the big one)

Real auth is built and ready (`sql/schema.sql`,
`scripts/import_users_from_excel.py`, `data/users_master.xlsx`, `SETUP.md`)
but **not wired up**. The site runs on temporary hardcoded credentials
instead (see section 4).

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

### Enforcing the access model server-side
Since v1.6.0 access is defined properly — roles, per-user grants and
denials over pages, actions, exec links, sheet links and variables,
maintained in Configuration (`js/rbac.js`). Every page and control is
gated against it.

But it is still a **client-side check only**: the whole model lives in
`localStorage` and anyone can edit it with dev tools, so it governs what
the interface offers rather than what a user can actually reach.

The model itself does not need redesigning — it needs enforcing. Move
roles, grants and denials into Supabase tables and express the same rules
as row level security policies, so the server reaches the same decision the
interface does. Configuration then becomes the maintenance screen for real
permissions rather than for local preferences.

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
red with an automated alert sent to admin."*

The highlighting is done and then some: the whole cell fills as the value
is typed, and every breach is listed again in the shift sign-off. The
**alert is not** — sending mail needs a backend. Once on Supabase, do this
with a database trigger or Edge Function on insert into `pcs_hourly` /
`pcs_shift`. Until then the UI says plainly that no alert was sent, rather
than implying one was.

### Check sheet printing
The tolerances sheet notes: *"Per day 3 times shift wise submission from
shift supervisors, all datas should be printed in check sheet documents."*

The submission half is done as of v1.7.0: each shift is submitted for
approval from its last hourly reading and locks on submission. **Printing
is not** — it still needs a print or PDF view laid out like the paper
QC FMT 038 form, so a signed shift can be filed as a document.

## 3. Masters (deferred)

Controlled value lists are currently hardcoded — the shift names, line
numbers, furnace identifiers, supervisor names and every acceptance limit
live in `public/js/pcs-spec.js` and `public/js/temp-local-auth.js`. Each
should become a master held in one place and referenced everywhere the
value is used, so a change is made once and takes effect everywhere.

All masters are deferred until the Supabase backend exists (section 1): a
master maintained in the browser cannot be shared between users, which
defeats the purpose of having one.

### ENH-001 — Shift Master

*Reclassified from BUG-007. See the Bugs register for why.*

A single definition of every shift and its timings, linked to every place a
shift is referenced.

**Fields:** shift code · display name · start time · end time · sequence ·
active flag

**Consumers — every place a shift is currently derived or named:**
- Process Check Sheet hourly readings, where a reading's shift is presently
  inferred from its position in the time-slot list (16 slots per shift, a
  hardcoded assumption that breaks if shift lengths ever differ)
- Process Check Sheet shift records, whose shift selector is presently a
  hardcoded three-item list
- Shift supervisor assignment
- Future reports and rosters

**What it enables:**
- A daily record accepts at most one record per shift defined in the master,
  satisfying REQ-PCS-005 as a consequence of the data model rather than as a
  separate check bolted onto the form (this is the ENH-001 case that
  replaces BUG-007)
- Shift timings become data, so a change to shift patterns needs no code
  change
- The time-slot to shift mapping is computed from the timings rather than
  assumed

**Removes:** the `PCS_SHIFTS` constant and the fixed 16-slots-per-shift
assumption in `public/js/pcs-spec.js`.

### Other masters

Same treatment, same reasoning — each currently hardcoded:

| Master | Values today | Referenced by |
|---|---|---|
| Line | 01, 02, 03, 06 | Check sheet daily record |
| Furnace | HF1–HF6, HF11, HF12 | Check sheet daily record |
| Alloy / Metal Grade | AC2A; Best Cast and other alloy flags | Daily and shift records |
| Machine | M/C number, BC number | Daily and shift records |
| Personnel | Operators, shift supervisors, in-charge | Shift records, sign-off |
| Rotor | 100 mm → 550–650 RPM; 190 mm → 350–400 RPM | Hourly readings |
| Tolerance / Specification | Acceptance limits for every numeric item | Hourly, shift and daily validation |

The Tolerance master is the most valuable of these: acceptance limits
currently change only by editing and redeploying code, when they should be
maintained by quality staff against the approved tolerances document.

## 4. Temporary hardcoded login (current state)

Seven accounts are hardcoded in `public/js/temp-local-auth.js`, all with
the password `123`:

| User ID | Role | Purpose |
|---|---|---|
| msv | Administrator | Original working account |
| pnk | Administrator | Original working account |
| administrator | Administrator | Role test fixture |
| quality_manager | Quality Manager | Role test fixture |
| shift_supervisor | Shift Supervisor | Role test fixture |
| operator | Operator | Role test fixture |
| viewer | Viewer | Role test fixture |

**This is not secure.** The credentials are readable in page source, and
"login" is a client-side JavaScript check with no server behind it —
nothing stops anyone from skipping `login.html` entirely. Fine for
exercising the UI; must be replaced before real users or real production
data are involved.

### Cleanup required before real use

The five role fixtures exist so the access model can be exercised from
each side without reassigning roles in Configuration — sign in as
`operator` to see exactly what an operator sees. They are **test data and
must not survive into production use.**

When Supabase auth lands (section 1), all of this goes together:

1. Delete the five role fixtures from `TEMP_USERS`. Each carries a
   `roleId` naming the role it was created for; that account-to-role
   mapping is what the real roster has to reproduce for genuine users.
2. Delete `msv` and `pnk` as well, and `public/js/temp-local-auth.js`
   entirely with them.
3. Remove `DEV_PAGE_USERS` — already a derived remnant that nothing
   reads, since dev access became the `page.dev` permission.
4. **Clear the stored access configuration** (`bestcast_rbac_config` in
   `localStorage`) on every device that has run a test build. The
   fixtures persist there after the code is gone, because the
   configuration is stored, not recomputed. Configuration has a reset
   control for this.
5. Confirm afterwards that no account signs in with `123`, and that the
   roles themselves are untouched — the roles are real and stay; only the
   accounts holding them are disposable.

Note for step 4: `rbacLoad()` deliberately admits any sign-in account
missing from a stored configuration, so that adding an account cannot
lock it out of everything. That reconciliation is what makes the fixtures
reappear on an older device, and it is removed as part of this cleanup.

### Test data generator — also to be removed

`public/js/pcs-demo.js` generates plausible check sheet data so the module
can be exercised without typing sixteen slots by hand. It fills day
details, machines, shift details, a whole shift's hourly readings and the
sign-off, in either of two modes — every value in spec, or with the
occasional deliberate breach so the out-of-spec highlighting and the
sign-off exception list have something to show.

Values are derived from the field definitions rather than hardcoded, so
generated data follows the acceptance limits as those limits change.

Removed alongside the accounts:

1. Delete `public/js/pcs-demo.js`.
2. Remove its `<script>` tag from `public/process-check-sheet.html`.
3. Remove `pcsDemoControls()`, `pcsDemoModePicker()`, `wireDemoControls()`
   and `PCS_DEMO_MODE` from `public/js/pcs.js`, and the five
   `wireDemoControls(panel, record)` calls and the `data-demo` controls in
   each section.
4. Remove the `action.pcs.demo.fill` permission from `public/js/rbac.js`,
   and the `.demo-bar` / `.demo-controls` / `.demo-tag` rules from
   `public/css/pcs.css`.
5. Check for generated records left in `localStorage`
   (`bestcast_pcs_records`) on test devices — plausible-looking readings
   attributed to fixture accounts are worse than obviously fake ones.

The generator is gated behind `action.pcs.demo.fill`, held only by
Administrator, so an operator never sees it. That gate is a convenience,
not a safeguard — the same client-side caveat as everything else here
(BUG-006).

Sessions are kept in `sessionStorage`, so they last only for the current
tab (the "Remember me" option was removed).

## 5. Open questions on the source spreadsheets

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

## 6. Assets

- **`Logo.svg` is not in the repo yet.** Every page references `logo.svg`,
  and the deploy workflow copies a root-level `Logo.svg` into `public/`
  when publishing — but no such file has ever been committed.

  This is no longer a defect (see BUG-004, fixed in 1.4.1): the brand mark
  now falls back to a styled monogram when the asset is absent, so nothing
  renders broken, and the deploy logs a warning rather than failing.
  Committing the actual Bestcast logo as `Logo.svg` in the repository root
  replaces the monogram with the logo — no code change needed.
