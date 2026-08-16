# Backlog

## 1. Process Check Sheet refinements — next work item

Seven changes requested against the Process Check Sheet as built in v1.5.0
(machines as day-sheet children, single day-sheet view, matrix and form
hourly entry) and v1.6.0 (role-based access control). Specified here so the
work can start from a settled definition.

These are deliverable on the current static build — none of them are
blocked on the backend, though Task 2's archive and Task 4's approval
routing become real controls rather than UI conventions once section 2
lands.

---

### T1 — Order the day sheet sections

Present the day sheet in this order:

1. Day Details
2. Machines
3. Shift Details
4. Hourly Details

Currently `renderSheet()` in `public/js/pcs.js` emits Day → Machines →
Hourly → Shifts. Shift Details moves above Hourly Details.

The reorder is small in itself, but it is a prerequisite for T4: the
"Save & Send for Approval" control lives in the hourly section and acts on
the shift record, so the shift context should already be on screen above it.

---

### T2 — Day details become controlled once saved

Once a day sheet is saved:

- **No delete.** Remove the delete control, the `action.pcs.sheet.delete`
  permission and `pcsDeleteDaily()`. A production record is not something
  anyone should be able to remove.
- **Edit restricted.** Amending day details stays behind
  `action.pcs.sheet.edit`, which currently sits with Administrator, Quality
  Manager and Shift Supervisor. Decide who should keep it — the intent is
  "only certain people", so Shift Supervisor probably drops off.
- **Archive, for administrators.** Add `action.pcs.sheet.archive`, plus
  `archivedAt` / `archivedBy` on the day sheet. An archived sheet is
  read-only throughout (header, machines, hourly, shifts) and is hidden
  from the sheet list behind a "Show archived" toggle. Archiving is
  reversible by an administrator; the record itself is never destroyed.

**Decision needed:** whether editing day details should also be barred once
any shift on that sheet has been approved, or whether the permission alone
is sufficient control.

---

### T3 — Machine changes recorded as shift remarks

When a machine is added or stopped part-way through a shift, that fact must
appear as a remark on that shift's sign-off.

The data already exists: `machine.startSlot` and `machine.stopSlot` are slot
indices, and each shift covers a known slot range (currently 0–15, 16–31,
32–47 — see ENH-001, section 4). A machine whose start or stop slot falls
inside a shift's range changed state during that shift.

Add a `remarks` field to the shift record, populated automatically with
entries such as:

```
M/C 12 added at 10.30am (auto)
M/C 5 stopped at 2.00pm (auto)
```

Requirements on the field:

- System-generated entries are visually distinct from typed ones and are
  regenerated if a machine's window is subsequently corrected
- The supervisor can add free-text remarks alongside them
- System-generated entries cannot be deleted by hand — they are a record of
  what happened, not a comment

---

### T4 — Shift goes for approval automatically on last entry

When the final hourly reading of a shift is recorded, the shift should be
submitted for approval from the **hourly section**, via a
**"Save & Send for Approval"** control alongside the normal save.

This needs a shift status lifecycle, which does not exist today — a shift
record is currently either approved or not:

```
Draft → Pending Approval → Approved
                ↑              │
                └── Reopened ──┘
```

- The control appears when the slot being saved is the last of its shift
  (slot 15, 31 or 47 under the current fixed pattern)
- Submitting sets the shift record to Pending Approval and locks it for
  editing, consistent with T5
- Approval remains a separate act by someone holding `action.pcs.approve`

**Decisions needed:**

- Should submission be blocked if earlier slots in that shift are
  incomplete, or permitted with the gaps flagged? Blocking is stricter but
  risks stranding a shift that genuinely had no reading for a slot.
- If no shift record exists yet when the last slot is saved, does the
  system create one, or prompt the operator to complete the sign-off first?
  Prompting seems right — the sign-off carries the supervisor's name.

---

### T5 — Older shift details are not editable

A shift record stops being editable once the shift has passed. This mirrors
the rule already applied to hourly readings by `pcsHourlyLocked()`, which
locks a slot once a later slot has been recorded.

Define the equivalent for shifts: a shift record is editable only while it
is the current shift, and locks once a later shift has any entry, or once
it has been submitted or approved. Reopening is an explicit act requiring
`action.pcs.unapprove` and should be recorded.

---

### T6 — Out-of-spec highlighting on entry

Currently a value is checked when the record is saved, and shown with red
text and a red border.

Wanted instead:

- **Immediate.** The check runs as the value is entered, not on save.
- **Whole cell.** The full cell fills, rather than just tinting the text:
  red background with white text in light mode, and a dark-mode treatment
  with equivalent contrast — the light-mode red on a dark background will
  not carry, so the dark palette needs its own pair.
- **Carried forward.** If the operator leaves the value as entered, it is
  listed as an out-of-spec reading during that shift's sign-off, so the
  supervisor signs with the exceptions in front of them.

Contrast must be checked in both themes. Colour alone should not be the
only signal — pair it with a marker or title text so the state survives
greyscale and colour-blind viewing.

This strengthens REQ-PCS-024, which currently says only "shall indicate, in
red"; it will need rewording to cover immediacy and the full-cell treatment.

---

### T7 — Tablet and touch-first data entry

Line workers enter data on a tablet, so the entry surfaces must be built
for touch rather than adapted from the desktop layout.

The matrix view is the problem case: cells are currently 74 px wide with
12 px text and 5 px padding, which is dense by design and too small to hit
reliably.

- Touch targets of at least 44 px for anything tappable — inputs, approve,
  stop, and the small text link-buttons in the machine and shift rows,
  which are currently well under that
- `inputmode="decimal"` on numeric fields so the numeric keypad opens
- Nothing important behind hover, since there is no hover on a touch device
  — the matrix currently puts full field names in `title` attributes
- Landscape tablet as the primary layout, with the time column staying
  pinned while parameters scroll
- Larger, better-separated controls in the modals

**Design tension to resolve:** density and touch targets pull against each
other, and the matrix exists precisely to show many slots at once. Options
are a `@media (pointer: coarse)` treatment that sizes up automatically, an
explicit "touch mode" toggle, or accepting fewer visible columns on tablet.
Worth deciding against a real device before building.

---

## 2. Supabase authentication (deferred — the big one)

Real auth is built and ready (`sql/schema.sql`,
`scripts/import_users_from_excel.py`, `data/users_master.xlsx`, `SETUP.md`)
but **not wired up**. The site runs on temporary hardcoded credentials
instead (see section 5).

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

## 3. Blocked on the backend

These are implemented as far as a static site allows, and each needs
section 2 done first.

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

## 4. Masters (deferred)

Controlled value lists are currently hardcoded — the shift names, line
numbers, furnace identifiers, supervisor names and every acceptance limit
live in `public/js/pcs-spec.js` and `public/js/temp-local-auth.js`. Each
should become a master held in one place and referenced everywhere the
value is used, so a change is made once and takes effect everywhere.

All masters are deferred until the Supabase backend exists (section 2): a
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

## 5. Temporary hardcoded login (current state)

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

## 6. Open questions on the source spreadsheets

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

## 7. Assets

- **`Logo.svg` is not in the repo yet.** Every page references `logo.svg`,
  and the deploy workflow copies a root-level `Logo.svg` into `public/`
  when publishing — but no such file has ever been committed.

  This is no longer a defect (see BUG-004, fixed in 1.4.1): the brand mark
  now falls back to a styled monogram when the asset is absent, so nothing
  renders broken, and the deploy logs a warning rather than failing.
  Committing the actual Bestcast logo as `Logo.svg` in the repository root
  replaces the monogram with the logo — no code change needed.
