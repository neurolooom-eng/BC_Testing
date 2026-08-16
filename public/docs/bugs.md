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
