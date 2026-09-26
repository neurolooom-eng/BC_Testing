# Bugs

Defect register. Every defect records its symptom, root cause, the
correction applied, and the version the correction shipped in.

**Maintenance rule:** a defect is logged here when found, and updated with
its fix version when the correction is released. Fixed entries are kept,
not deleted — the history is the point.

**Status key:** `Fixed` · `Open` · `Deferred` (accepted for now; see Backlog)

**Severity key:** `Critical` (blocks use) · `Major` (impairs a function) ·
`Minor` (cosmetic or worked around)

---

## Summary

| ID | Title | Severity | Status | Fixed in |
|---|---|---|---|---|
| BUG-001 | Sign-in impossible — User ID field rejected non-email values | Critical | Fixed | pre-1.0.0 |
| BUG-002 | Published site served the repository README, not the application | Critical | Fixed | pre-1.0.0 |
| BUG-003 | Site root address did not open the sign-in page | Major | Fixed | pre-1.0.0 |
| BUG-004 | Brand mark renders as an empty circle | Minor | Fixed | 1.4.1 |
| BUG-005 | Navigation dropdown clipped inside the bar; page scrolled sideways | Major | Fixed | 1.3.2 |
| BUG-006 | Authentication enforced only in client-side code | Critical | Deferred | — |
| BUG-007 | A fourth shift record can be added to a daily record | Minor | Reclassified | — |
| BUG-008 | Navigation scrolled horizontally instead of wrapping | Major | Fixed | 1.4.0 |
| BUG-009 | Saving an hourly reading appeared to do nothing | Major | Fixed | 1.7.1 |
| BUG-010 | Stated Rotor RPM limits did not follow the selected rotor size | Major | Fixed | 1.7.1 |
| BUG-011 | Test data and auto-fill buttons missing on devices with stored config from before v1.8.0 | Major | Fixed | 1.9.1 |
| BUG-012 | Sign-in could land an operator on the wrong furnace's day sheet | Major | Fixed | 2.3.1 |
| BUG-013 | One tap on a later slot in the Operator view could lock earlier empty slots | Major | Fixed | 2.3.1 |
| BUG-014 | Offline fallback hung on a connected-but-dead network | Major | Fixed | 2.3.1 |
| BUG-015 | Offline, an uncached page was replaced by the check sheet under its address | Minor | Fixed | 2.3.1 |
| BUG-016 | Offline could serve files from two different deploys together | Minor | Fixed | 2.3.1 |
| BUG-017 | Following a link in the collapsed menu left the menu open | Minor | Fixed | 2.3.1 |
| BUG-018 | Form view "Save & Send" gave no feedback when readings were blank | Minor | Fixed | 2.3.1 |

No defects are currently open. BUG-006 is a deferred design decision and
BUG-007 has been reclassified as an enhancement; both are tracked in the
Backlog.

---

## BUG-001 — Sign-in impossible: User ID field rejected non-email values

- **Severity:** Critical
- **Status:** Fixed
- **Fixed in:** pre-1.0.0 (before version numbering was introduced)
- **Affects:** REQ-AUTH-004
- **Covered by:** TC-AUTH-004

**Symptom.** Entering the account `msv` produced the browser message
"Please include an '@' in the email address. 'msv' is missing an '@'." The
form never submitted, so no account could sign in.

**Root cause.** The User ID input was declared `type="email"`, a leftover
from the original Supabase design where the User ID was the user's email
address. The temporary plant accounts are short identifiers, so the
browser's built-in email validation rejected them before the form's own
handler ran.

**Correction.** Changed the input to `type="text"` in `public/login.html`.
Validation of the identifier is the application's responsibility, not the
browser's, now that identifiers are not addresses.

---

## BUG-002 — Published site served the repository README, not the application

- **Severity:** Critical
- **Status:** Fixed
- **Fixed in:** pre-1.0.0
- **Affects:** REQ-DEP-001
- **Covered by:** TC-DEP-001

**Symptom.** The published address displayed a rendered copy of the
repository README instead of the sign-in page.

**Root cause.** GitHub Pages was configured with the source "Deploy from a
branch", which publishes the whole repository through Jekyll and renders
the root README as the index. The application lives in `public/`, which was
never being published.

**Correction.** Added a GitHub Actions workflow that publishes only
`public/`, and switched the Pages source setting to "GitHub Actions". The
setting change is made in repository settings and cannot be committed, so
it is recorded here as part of the fix.

---

## BUG-003 — Site root address did not open the sign-in page

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** pre-1.0.0
- **Affects:** REQ-DEP-002
- **Covered by:** TC-DEP-002

**Symptom.** The bare site address did not present the application;
`login.html` had to be requested explicitly.

**Root cause.** No `index.html` existed in the published directory, so the
server had no default document to serve.

**Correction.** Added `public/index.html`, which redirects to `login.html`
and also offers a plain link for clients that do not follow the redirect.

---

## BUG-004 — Brand mark renders as an empty circle

- **Severity:** Minor
- **Status:** Fixed
- **Fixed in:** 1.4.1 (partial corrections in 1.3.1)
- **Affects:** REQ-DEP-003, REQ-DEP-005
- **Covered by:** TC-DEP-003, TC-DEP-005

**Symptom.** The sign-in page and the navigation bar showed an empty circle
where the Bestcast logo should be.

**Root cause.** Three distinct causes, corrected in two stages.

1. Every page referenced `images/logo.png`, a path that was never created —
   no image file had been committed to the repository.
2. Once the intended asset location was given as the repository root, that
   location sits outside `public/` and so is not published, meaning a
   root-level file would still not have been served.
3. The brand mark had no defined appearance for the case where the asset is
   unavailable. Because the asset is supplied separately from the code, an
   `<img>` with no file resolved to a broken image — the empty circle. The
   page had no way to degrade.

**Correction applied (1.3.1).** Repointed all references to `logo.svg`, and
added a publication step that copies a root-level `Logo.svg` into `public/`
at build time, so the repository root remains the source of truth. The
lookup is case-insensitive and a missing file emits a warning rather than
failing the build.

**Correction applied (1.4.1).** Added `js/brand.js`, which substitutes a
styled monogram for any brand mark whose image fails to load. The mark now
has a defined appearance in both states, so a missing or late-arriving
asset can no longer present as a rendering fault. `renderTopbar()` invokes
it directly for the bar it builds, since that happens after the document's
own load pass.

**Note.** `Logo.svg` has still not been committed, so the monogram is what
is currently displayed. That is now correct behaviour rather than a defect:
committing the asset at the repository root replaces the monogram with the
logo, with no further code change. Supplying the asset is tracked in the
Backlog.

---

## BUG-005 — Navigation dropdown clipped inside the bar; page scrolled sideways

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 1.3.2
- **Affects:** REQ-NAV-008, REQ-UI-002
- **Covered by:** TC-NAV-003, TC-UI-002

**Symptom.** Opening the Team menu on a sub-page produced scrollbars inside
the navigation bar instead of a menu over the page. The page also scrolled
horizontally, leaving the breadcrumb clipped and the bar not spanning the
scrolled width.

**Root cause.** Two compounding causes. First, `.main-nav` set
`overflow-x: auto`; CSS does not permit `overflow-y: visible` alongside a
clipped axis, so the vertical axis was clipped as well and the dropdown —
an absolutely positioned descendant — was trapped inside the bar. Second,
`.main-nav` had no `min-width: 0`, so as a flex child it defaulted to
`min-width: auto` and refused to shrink below its content width, widening
the bar past the viewport and forcing the page to scroll horizontally.

**Correction.** Made `.nav-dropdown` `position: fixed`, placed from the
trigger's viewport rectangle in `topbar.js`, so it escapes the clipping
context entirely. Added `min-width: 0` to `.main-nav`. Gave the bar an
opaque base background colour beneath its gradient layers, applied
`overflow-x: clip` at page level, and made open menus close on scroll and
resize since a fixed element cannot follow its trigger.

---

## BUG-006 — Authentication enforced only in client-side code

- **Severity:** Critical
- **Status:** Deferred — accepted while the application is in testing
- **Affects:** REQ-AUTH-008, REQ-DEV-001
- **Covered by:** TC-AUTH-009

**Symptom.** Account identifiers and passwords are readable in the page
source. Session checks and the developer-page restriction run entirely in
the browser and can be bypassed with developer tools.

**Root cause.** The application is a static site with no server component.
The temporary authentication in `js/temp-local-auth.js` was introduced
deliberately so the interface could be exercised before the Supabase
backend was configured.

**Planned correction.** Restore the Supabase authentication already built
(`sql/schema.sql`, `scripts/import_users_from_excel.py`), and enforce the
developer-page restriction with a role on `public.profiles` under row level
security. See the Backlog.

**Accepted because** no production data is held and no real user accounts
exist. This must be corrected before either becomes true.

---

## BUG-007 — A fourth shift record can be added to a daily record

- **Severity:** Minor
- **Status:** Reclassified as an enhancement — see ENH-001 in the Backlog
- **Affects:** REQ-PCS-005, REQ-MST-001, REQ-MST-003

**Symptom.** The Process Check Sheet accepts more than three shift records
against one daily record, and permits two records for the same shift.

**Root cause.** The shift entry form offers all three shifts unconditionally
and does not test the shifts already recorded against that daily record.

**Why reclassified.** Constraining the count in the form would treat the
symptom while leaving the underlying gap: shifts have no single definition.
The three shift names are hardcoded in `js/pcs-spec.js`, the boundary
between them is a hardcoded assumption of 16 consecutive time slots, and
neither carries the shift timings themselves. Any rule about "how many
shifts may be recorded" should derive from a Shift Master rather than a
constant in the form.

This is therefore scoped as ENH-001 — Shift Master — in the Backlog, where
a single definition of every shift and its timings is linked to each place a
shift is referenced. The record-count constraint (REQ-PCS-005) becomes a
consequence of that master rather than a separate check.

No defect entry remains open for this; it is tracked as planned work.

---

## BUG-008 — Navigation scrolled horizontally instead of wrapping

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 1.4.0
- **Affects:** REQ-NAV-005, REQ-NAV-006, REQ-NAV-009
- **Covered by:** TC-NAV-005, TC-NAV-006

**Symptom.** On narrow viewports the navigation entries were reachable only
by scrolling the bar sideways, so entries were effectively hidden on
smaller screens.

**Root cause.** `.main-nav` was laid out as a single non-wrapping row with
horizontal scrolling as the overflow strategy, and `.topbar` had a fixed
height of 86 px, which would in any case have clipped a wrapped second row.

**Correction.** Replaced horizontal scrolling with `flex-wrap: wrap` on both
the bar and the nav, and changed the bar's fixed height to a minimum height
so it grows as rows wrap. Below 1024 px the nav moves onto its own
full-width row beneath the brand and user controls; entry padding and type
size step down again at 640 px and 400 px.

---

## BUG-009 — Saving an hourly reading appeared to do nothing

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 1.7.1
- **Affects:** REQ-PCS-090, REQ-PCS-091
- **Covered by:** TC-PCS-120, TC-PCS-121, TC-PCS-122

**Symptom.** In the form layout, pressing Save produced no visible change:
the same slot remained selected, showing the same values. Operators could
not tell whether the reading had been stored, and were liable to press it
again.

**Root cause.** The reading was in fact being saved. The form then
re-rendered the same slot, which — being the most recently recorded — was
still unlocked and still populated, so the result was pixel-identical to
the state before the press. Two things were missing rather than broken:
the form did not move on, and nothing confirmed the save.

**Correction.** On a successful save the form now advances to the following
slot, which is the next reading due, and shows a one-shot confirmation
naming the slot saved and the slot now selected. Advancing is clamped at
the final slot of the day.

---

## BUG-010 — Stated Rotor RPM limits did not follow the selected rotor size

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 1.7.1
- **Affects:** REQ-PCS-092, REQ-PCS-023
- **Covered by:** TC-PCS-124, TC-PCS-125

**Symptom.** Selecting a 190mm rotor left the Rotor RPM field still stating
550–650 RPM, the 100mm band. The validation used the correct band, so a
value could be marked out of spec while the limits printed beside it said it
was acceptable — the field contradicted itself until the record was saved
and the form re-rendered.

**Root cause.** The live validation added in 1.7.0 repainted the
out-of-spec state and the error text on every keystroke, but the spec hint
was written once when the field was first rendered and never revisited. For
every other field that is correct, since their limits are fixed; Rotor RPM
is the only item whose limits depend on another field.

**Correction.** Fields declaring a dependent range now have their stated
limits recomputed alongside their validation, so hint and verdict are always
derived from the same evaluation.

## BUG-011 — Test data and auto-fill buttons missing on devices with stored config from before v1.8.0

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 1.9.1
- **Affects:** REQ-FIX-010, REQ-FIX-016
- **Covered by:** TC-FIX-012, TC-FIX-013, TC-FIX-023, TC-FIX-024

**Symptom.** On a browser that had used the app before v1.8.0, the "Fill"
(test data) and "Auto-fill" buttons never appeared — even when signed in as
an administrator who should hold the `action.pcs.demo.fill` permission.
Clearing localStorage or using a fresh browser made them appear.

**Root cause.** `rbacLoad()` reconciled missing user accounts on load (added
in v1.8.0) but did not reconcile missing resources. A stored access
configuration from before v1.8.0 had no `action.pcs.demo.fill` entry, so
`rbacCanDo` could not find it and returned false. Every control gated behind
that permission stayed hidden.

**Correction.** `rbacLoad()` now merges any seed resources whose id is
absent from the stored config, and copies the matching role grants from the
seed so the resource is reachable by the roles that should hold it. Existing
entries and grants are left alone, preserving any reassignments made in
Configuration.

## BUG-012 — Sign-in could land an operator on the wrong furnace's day sheet

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OPX-013, REQ-OPX-014
- **Covered by:** TC-OPX-014, TC-OPX-017, TC-OPX-021 – TC-OPX-024

**Symptom.** On a tablet holding open day sheets for more than one line or
furnace on the same production day, signing in as a line user opened one of
them directly, with nothing asking which. With no sheet for today, it
opened the most recent older sheet, however old, again without saying so.

**Root cause.** `qrFindSheet()` in `quick-record.js` returned the last of
today's sheets in storage order, or failing that the latest-dated sheet,
and `qrLandingPage()` redirected to whatever it returned. Neither looked at
line or furnace, or at how many candidates there were.

**Correction.** `qrLandingPage()` redirects only when exactly one open
sheet exists for the current production day; otherwise the user lands on
the dashboard. The dashboard shows one Quick Record card per open sheet for
today, each naming its line and furnace, and falls back to a single "Most
recent" card only when nothing is open for today.

## BUG-013 — One tap on a later slot in the Operator view could lock earlier empty slots

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OPX-007, REQ-OPX-017
- **Covered by:** TC-OPX-025 – TC-OPX-028

**Symptom.** In the Operator view, tapping a later chip on the slot strip
(or pressing › past the current slot) and saving locked every empty slot
before it. Only a user permitted to unlock for rework could reopen them.

**Root cause.** `pcsHourlyLocked()` locks every slot earlier than the latest
recorded one — intended, so a reading cannot be changed after the operator
has moved on. The Operator view made any slot one tap away and saved with
no check on what the save would lock.

**Correction.** Before saving, the Operator view lists the empty slots
between the latest recorded reading and the slot being saved. If there are
any, it names them, says they will lock, and offers "Go to" the first one
or "Save anyway"; the save goes ahead only on the latter. Matrix and Form
views are unchanged.

## BUG-014 — Offline fallback hung on a connected-but-dead network

- **Severity:** Major
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OFF-001, REQ-OFF-007
- **Covered by:** TC-OFF-008

**Symptom.** With the tablet connected to wifi that was passing no traffic,
pages and files were left loading rather than served from the cache.

**Root cause.** The service worker fell back to the cache only when `fetch`
rejected. A connection that is up but not answering does not reject
promptly, so the cache was never consulted while the request hung.

**Correction.** The service worker serves the cached copy of a request if
the network has not answered within 4 seconds. The network request carries
on and refreshes the cache if it answers later. Where nothing is cached for
the request, it keeps waiting for the network as before.

## BUG-015 — Offline, an uncached page was replaced by the check sheet under its address

- **Severity:** Minor
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OFF-001, REQ-OFF-008
- **Covered by:** TC-OFF-009

**Symptom.** Offline, opening a page that had never been cached (for
example `knowledge.html`) displayed the Process Check Sheet while the
address bar still showed the page asked for.

**Root cause.** The service worker's fallback for any uncached navigation
was `process-check-sheet.html`, whatever page had been requested.

**Correction.** An uncached navigation now receives a short offline notice
naming the page requested, with a button to the Process Check Sheet.

## BUG-016 — Offline could serve files from two different deploys together

- **Severity:** Minor
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OFF-001, REQ-OFF-009
- **Covered by:** TC-OFF-010

**Symptom.** No observed failure; found in review. Offline, a page could be
served from files cached at different times — HTML from one deploy and a
script from an earlier one.

**Root cause.** The cache name was fixed (`bestcast-shell-v1`), so a deploy
never changed the service worker and the shell was never replaced as a
whole. Files were refreshed one at a time, only when fetched online.

**Correction.** The deploy workflow stamps the build number into the cache
name. Each deploy therefore changes `sw.js`, the browser installs the new
worker, which precaches the full shell (bypassing the HTTP cache), and the
previous build's cache is deleted on activation.

## BUG-017 — Following a link in the collapsed menu left the menu open

- **Severity:** Minor
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OPX-016
- **Covered by:** TC-OPX-030

**Symptom.** Following a link in the collapsed tablet navigation left the
menu open. The page navigated away, so this was visible only when returning
to the page from the browser's back/forward cache.

**Root cause.** The document click handler in `topbar.js` kept the menu
open for any click inside the nav outside the Team menu — the reverse of
its comment, which said following a link closes it.

**Correction.** A click on a link inside the nav now closes it; clicks
elsewhere inside the nav leave it open.

## BUG-018 — Form view "Save & Send" gave no feedback when readings were blank

- **Severity:** Minor
- **Status:** Fixed
- **Fixed in:** 2.3.1
- **Affects:** REQ-OPX-010
- **Covered by:** TC-OPX-031

**Symptom.** In the Form view, pressing "Save & Send" with required readings
blank did nothing visible beyond marking the fields, while the ordinary Save
button showed a "Not saved" notification.

**Root cause.** v2.3.0 added the refusal notification to the Save button's
handler but not to the "Save & Send" handler.

**Correction.** "Save & Send" now shows the same notification when the save
is refused.
