# Changelog

Version numbers follow semver — see `VERSIONING.md` at the repo root.
Build number and build date shown in the site footer are generated
automatically per deploy and are not tracked here.

## 1.5.0 — 2026-08-16

**Machines are now a child of the day sheet**
- M/C No., BC No., die coat thickness, preheat temp, cooling/pouring/
  tilting times move off the day header into a repeating machine table,
  matching the block on the paper sheet
- **Die Temp is recorded per machine per time slot**, as on the paper
  sheet, rather than once per hour for the whole line
- A machine carries a running window: it can be **added part-way through
  a shift** and **stopped** at any slot, both from the day sheet
- Slots outside a machine's running window are recorded as **NA** — a
  complete answer rather than a blank, and excluded from spec checking
- Existing day sheets are migrated automatically: former header machine
  details become a single machine, with its Die Temp readings attached

**One working view**
- The day sheet is now the single view. Machines, hourly readings and
  shift sign-offs are all added, edited and approved there — the separate
  tabbed sub-views are gone
- **Approval** added on machines, hourly readings and shift records,
  recording who approved and when. Approved records lock until the
  approval is withdrawn; pending counts show on the sheet and in the list

**Hourly entry — two layouts to compare in use**
- **Matrix view**: many slots editable at once, one column per furnace
  parameter and one per machine Die Temp, with NA cells shaded
- **Form view**: one slot at a time, full field labels and spec hints
- Both default the slot to the **nearest completed** half-hour
- Past data locks on the next update: a reading stays editable while it is
  the most recent, and locks once a later slot is recorded
- The chosen layout is remembered per device

## 1.4.1 — 2026-08-16

**BUG-004 fixed — brand mark no longer renders as an empty circle**
- The brand mark now falls back to a styled monogram when the logo asset
  can't be loaded (`js/brand.js`), so a missing or late-arriving asset can
  no longer present as a broken image
- `renderTopbar()` initialises its own mark directly, since it builds the
  bar after the document's load pass
- `Logo.svg` still isn't committed, so the monogram is what shows today —
  committing it at the repository root swaps in the real logo with no code
  change

**BUG-007 reclassified as an enhancement**
- Constraining shift records in the form would have treated the symptom.
  The real gap is that shifts have no single definition: the names are
  hardcoded and the boundaries are a fixed assumption of 16 time slots,
  with no timings recorded anywhere
- Now tracked as ENH-001 — Shift Master — in the Backlog, alongside the
  other masters (line, furnace, alloy, machine, personnel, rotor and
  acceptance limits), all deferred pending the backend
- Requirements added for masters (REQ-MST-001 to 007); REQ-PCS-005 and
  REQ-PCS-011 now derive from the Shift Master rather than from constants

No defects are currently open.

## 1.4.0 — 2026-08-16

**Adaptive navigation**
- The nav no longer scrolls sideways — entries wrap onto further rows when
  they exceed the viewport width, and the bar grows in height to fit them
  (fixes BUG-008)
- Below 1024px the nav moves to its own full-width row under the brand and
  user controls; sizing steps down again at 640px and 400px

**Responsive across mobile, tablet and desktop**
- Pages render legibly from 320px to 2560px, with no horizontal page scroll
  at any width — wide tables still scroll inside their own container
- Form grids, the shift core-pin grid, and the entry modal all collapse
  properly on narrow screens instead of forcing overflow

**Dev documentation**
- The Dev page is now a hub with five sub-pages: Version History,
  Requirements, Test Cases, Bugs and Backlog
- **Requirements** — 65 requirements in INCOSE style covering every module
  built so far, each with rationale, verification method and status
- **Test Cases** — 74 cases, every requirement traced to at least one
- **Bugs** — full defect register: symptom, root cause, correction, and the
  version each fix shipped in
- Markdown is rendered in-page by a small local renderer (`js/md.js`) — no
  external dependency
- `VERSIONING.md` now carries the standing rule that requirements, test
  cases, bugs and changelog are updated in the same change as the
  behaviour they describe

## 1.3.2 — 2026-08-16

Fixes the top bar breaking up when a nav dropdown is opened on a sub-page.

- The Team dropdown was being clipped inside the nav instead of overlaying
  the page. `.main-nav` sets `overflow-x: auto`, and CSS forces the other
  axis to clip too, so the dropdown was trapped in the bar and produced
  scrollbars. It's now `position: fixed` (placed from the trigger's rect in
  `topbar.js`), so it escapes that clipping and overlays content fully.
- `.main-nav` was missing `min-width: 0`, so as a flex child it refused to
  shrink and widened the whole bar past the viewport — which scrolled the
  page sideways and left the sticky bar not covering the full width.
- Top bar now has an opaque base background colour under its gradients, so
  content scrolling underneath can't show through.
- Nav scrollbars hidden, page-level horizontal scroll clipped, and open
  dropdowns close on scroll/resize (a fixed element can't follow its
  trigger).

## 1.3.1 — 2026-08-16

- Point every logo reference (login, signup, and the shared top bar) at
  `logo.svg` instead of the never-created `images/logo.png`
- Deploy workflow now copies a root-level `Logo.svg` into `public/` when
  publishing, so the repo root can stay the source of truth even though
  only `public/` is deployed. Warns rather than fails if it's missing.

  Note: `Logo.svg` still has to be committed — it isn't in the repo yet,
  so the brand mark stays an empty circle until then.

## 1.3.0 — 2026-08-15

- New **Process Check Sheet** module (QC FMT 038) under Production Records,
  with the parent/child structure from the PCS Update sheet:
  - **Daily once** data is the parent record (date, line, metal grade,
    furnace, M/C no., die pre-heat, cooling/pouring/tilting times, die prep
    checks, in-charge sign)
  - **Hourly** readings are children — 30-minute slots from 6.30am to
    6.00am, auto-labelled with their shift
  - **Shift once (8 hrs)** entries are children — three per day, each with
    DPT, sets rejected, alloy, BC no., die coat thickness, core pin
    verification for cavities 1–10, and operator/supervisor sign-off
- Field types, dropdown options and spec ranges are all driven by the
  Tolerances sheet (`js/pcs-spec.js` is the single source of truth), and
  out-of-spec readings are highlighted in red at the field, row and sheet
  level
- New `production-records.html` landing page listing shop-floor modules
- Top bar extracted into shared `css/app.css` + `js/topbar.js` so the
  dashboard and new pages stay in sync instead of duplicating markup

## 1.2.0 — 2026-08-15

- Top bar nav: "Roster" removed as a top-level item, replaced by
  "Production Records"; Roster now lives under a "Team" dropdown instead
- Removed the "Remember me" feature entirely (checkbox and the
  persistent-login behavior it drove) — login sessions are back to
  lasting only for the current tab (`sessionStorage`)
- Added a light/dark theme toggle to the dashboard top bar (default:
  dark). The top bar's own colors never change; toggling switches the
  rest of the page (content, cards, footer) to a black-and-white palette

## 1.1.0 — 2026-08-15

- Redesigned `dashboard.html` with a top bar navigation (brand, 4 nav
  items — Overview/Roster/Reports/Team, no search or notifications per
  request), matching the site's navy/teal/orange/cream color scheme
- User menu moved into a dropdown under the profile avatar (Dev Page
  link for `msv`/`pnk`, Log out)

## 1.0.0 — 2026-08-15

Baseline release: the point at which formal versioning started.

- Login page (`login.html`) wired to temporary hardcoded credentials
  (`msv`, `pnk`) while Supabase setup is on the backlog (see `BACKLOG.md`)
- Dashboard (`dashboard.html`) landing page after login, with logout
- "Remember me" defaults to checked; sessions persist across browser
  restarts (`localStorage`), not just the tab
- Self-service signup (`signup.html`) disabled with a clear message —
  nowhere for new accounts to go until Supabase is wired up
- Build footer on every page: version, build number, build date/time —
  generated by the GitHub Actions deploy workflow on every publish
- Dev Page (`dev.html`, this changelog) restricted to `msv` and `pnk`
- Full Supabase Auth integration built and ready in `sql/schema.sql`,
  `scripts/import_users_from_excel.py`, `data/users_master.xlsx` —
  documented in `SETUP.md`, deferred in `BACKLOG.md`
- GitHub Pages deployment via GitHub Actions (`deploy-pages.yml`)

### Pre-1.0 history (unversioned)

Earlier work, before version numbers were introduced:

- Added Supabase auth wiring and the Excel user roster
- Added the GitHub Pages deploy workflow
- Added an `index.html` redirect to the login page
- Fixed the User ID field's browser validation blocking login
