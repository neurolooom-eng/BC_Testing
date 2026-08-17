# Changelog

Version numbers follow semver — see `VERSIONING.md` at the repo root.
Build number and build date shown in the site footer are generated
automatically per deploy and are not tracked here.

## 1.8.0 — 2026-08-17

**Test fixtures — removed before real use, see BACKLOG.md**

**A dummy account per role**
- Five accounts named for the roles they carry — `administrator`,
  `quality_manager`, `shift_supervisor`, `operator`, `viewer` — all with
  password `123`, alongside the existing `msv` and `pnk`
- Each carries exactly its role's access, so the model can be seen from
  each side without reassigning roles in Configuration: sign in as
  `operator` to see what an operator sees
- An account missing from a stored access configuration is now admitted on
  load with its own role, so devices that ran an earlier build pick the new
  accounts up. An assignment already made in Configuration is left alone.

**A test data generator**
- Fills day details, machines, shift details, a whole shift's hourly
  readings, and the sign-off — per module, or end to end for a shift
- Two modes: every value **in spec**, or **occasional out of spec** so the
  cell highlighting, the sign-off exception list and the sheet counters
  have something to report
- Values are derived from the field definitions, not hardcoded, so they
  follow the acceptance limits as those change — including Rotor RPM
  following the rotor size generated beside it
- Machines are given staggered start slots, and no Die Temp is generated
  for a machine that was not running, so NA handling and the generated
  shift remarks have something real to describe
- Gated behind a new `action.pcs.demo.fill` permission held only by
  Administrator, and styled deliberately apart from the working controls

## 1.7.1 — 2026-08-17

**BUG-009 fixed — saving an hourly reading appeared to do nothing**
- The reading was being saved, but the form re-rendered the same slot with
  the same values, so the result was identical to the state before the
  press. It now advances to the following slot — the next reading due —
  and confirms the save, naming the slot stored and the slot now selected.
  Advancing stops at the final slot of the day.

**BUG-010 fixed — stated Rotor RPM limits did not follow rotor size**
- Selecting a 190mm rotor left the field stating 550–650 RPM while the
  validation used 350–400, so a value could be flagged out of spec beside
  limits saying it was fine. The live validation added in 1.7.0 repainted
  the verdict on every keystroke but never revisited the stated limits.
  Fields with a dependent range now recompute both from the same
  evaluation.

**Matrix scoped to a shift**
- The matrix showed the whole day from 6.30am, with a toggle between "up to
  current slot" and all 48. It now shows **one shift at a time**, defaulting
  to the shift in progress up to the most recently completed slot
- A shift selector switches between the three, marking which is current; a
  completed shift is shown in full, and the shift in progress keeps a
  control to reveal its remaining slots

## 1.7.0 — 2026-08-16

Process Check Sheet refinements T1–T7, plus the shift split.

**Shift split into two sections**
- A shift is still one record, but is now captured in two parts where each
  belongs in the working day: **Shift Details** (which shift, alloy, and
  the die-preparation startup checks) before the hourly readings, and
  **Shift Sign-off** (signatures, remarks, exceptions) after them

**T1 — Day sheet order**
- Day Details → Machines → Shift Details → Hourly Details → Shift Sign-off

**T2 — Day details controlled once saved**
- **Delete removed entirely.** A day sheet is a production record
- **Archive** added for those holding the permission: the sheet becomes
  read-only throughout and leaves the working list, behind a "Show
  archived" toggle. Reversible; nothing is destroyed
- Amending day details now requires `action.pcs.sheet.edit`, which Shift
  Supervisor no longer holds — they open the day and record against it,
  but amending the header is a narrower group

**T3 — Machine changes as shift remarks**
- A machine started or stopped mid-shift is remarked automatically against
  that shift's sign-off, with machine number and time
- Remarks are derived from each machine's running window rather than typed,
  so they cannot contradict the sheet; they are labelled and cannot be
  edited away. A separate free-text remarks field sits alongside

**T4 — Shift sent for approval from the hourly section**
- Shift status lifecycle added: **Draft → Pending approval → Approved**,
  with reopen for genuine corrections
- On the final slot of a shift, hourly entry offers **Save & Send for
  Approval** — in both the matrix and form layouts
- Before submitting, states how many slots have no reading and how many
  out-of-spec readings are being signed for. Gaps do not block submission
  (a slot can legitimately have no reading); an incomplete sign-off does,
  since submission asserts it

**T5 — Older shifts locked**
- A shift locks once submitted, approved, or once a later shift has been
  opened or has readings — mirroring the hourly rule. Its hourly slots
  lock with it

**T6 — Out-of-spec highlighting on entry**
- The **whole cell** now fills as the value is typed, rather than tinting
  text on save. Separate colour pairs for light and dark, and an added `!`
  marker so the state survives greyscale and colour-blind viewing
- Dependent limits repaint live — changing rotor size immediately re-checks
  the RPM cell against the new band
- Every out-of-spec reading from the shift is listed in its sign-off, so
  the supervisor signs with the exceptions in front of them

**T7 — Tablet and touch entry**
- Where the pointer is coarse, every target grows to at least 44 px and the
  matrix relaxes — density is worth less than hitting the right cell
- Numeric fields open the numeric keypad
- Row actions stay visible rather than sitting behind hover

## 1.6.0 — 2026-08-16

**Configuration module — users, roles and access control**

New Configuration page (administrators only) with eight sections:

- **Users** — accounts, role assignment, active/inactive, and a per-user
  Access view showing every operation and where it comes from
- **Roles** — five seeded roles (Administrator, Quality Manager, Shift
  Supervisor, Operator, Viewer) with a full permission editor
- **Access Matrix** — every role against every resource, at a glance
- **Pages, Actions, Exec Links, Sheet Links, Variables** — the registers of
  everything access can be granted on, each maintainable

**Access is role-based by default.** A user's access is the union of their
roles' permissions. Per-user *additional grants* and *denials* exist for
exceptions, are empty on every new user, and are always displayed as
exceptions rather than blended into role access — a denial always beats a
grant.

**Cloning** copies one user's access to another. Roles only by default, so
copying a colleague's access doesn't silently duplicate their one-off
exceptions; additional grants and denials can be included deliberately,
and either replace the recipient's access or merge with it.

**Enforcement across the app**
- Navigation omits pages the user may not view; an empty Team menu is
  dropped rather than left as a dead end
- Requesting a page directly redirects if the user may not view it
- Check sheet controls — create, edit, delete, machine changes, hourly
  recording, approve and unapprove — are each hidden unless permitted
- The Dev page gate moved from a hardcoded user list to the `page.dev`
  permission

Note: this is UI-level access control, not a security boundary, until the
checks run server-side (BUG-006 / REQ-AUTH-008). The roles and permissions
defined here are what the Supabase row level security policies should be
built from.

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
