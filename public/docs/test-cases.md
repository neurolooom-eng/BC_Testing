# Test Cases

Verification cases for the requirements in the Requirements document. Each
case names the requirement it verifies, so coverage can be checked in both
directions.

**Maintenance rule:** a change that alters behaviour updates the affected
cases in the same change. A new requirement is not complete until at least
one case covers it.

**Result key:** `Pass` · `Fail` · `Blocked` · `Not run`

Last executed against **v1.4.1**.

---

## 1. Authentication

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-AUTH-001 | REQ-AUTH-001, REQ-AUTH-002 | Signed out | Open sign-in page. Enter `msv` / `123`. Submit. | Access granted; dashboard displayed. | Pass |
| TC-AUTH-002 | REQ-AUTH-003 | Signed out | Enter `msv` / `wrong`. Submit. | Access denied; message "Invalid User ID or password." shown; still on sign-in page. | Pass |
| TC-AUTH-003 | REQ-AUTH-003 | Signed out | Enter `nobody` / `123`. Submit. | Access denied; same message; message does not reveal which field was wrong. | Pass |
| TC-AUTH-004 | REQ-AUTH-004 | Signed out | Enter `msv` in User ID. Submit. | Field accepts the value; no browser validation message about email format. | Pass |
| TC-AUTH-005 | REQ-AUTH-005 | Signed out | Request `dashboard.html` directly by URL. | Sign-in page displayed instead. | Pass |
| TC-AUTH-006 | REQ-AUTH-005 | Signed out | Request `process-check-sheet.html` directly by URL. | Sign-in page displayed instead. | Pass |
| TC-AUTH-007 | REQ-AUTH-006 | Signed in | Open the profile menu. Select Log out. | Session ended; sign-in page displayed; back navigation does not restore access. | Pass |
| TC-AUTH-008 | REQ-AUTH-007 | Signed in | Close the browser tab. Reopen the site. | Sign-in page displayed. | Pass |
| TC-AUTH-009 | REQ-AUTH-008 | Signed out | Inspect page source for credential values. | Credentials are not present in client-side code. | Fail — see BUG-006 (Deferred) |

## 2. Navigation and Shell

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-NAV-001 | REQ-NAV-001 | Signed in | Visit Overview, Production Records and Process Check Sheet in turn. | Navigation bar present on every page. | Pass |
| TC-NAV-002 | REQ-NAV-002 | Signed in | Inspect the navigation bar. | Overview, Production Records, Reports and Team are present. | Pass |
| TC-NAV-003 | REQ-NAV-003, REQ-NAV-008 | Signed in | Select Team. | Dropdown opens containing Roster; it is drawn over page content and page content is not visible through it. | Pass |
| TC-NAV-004 | REQ-NAV-004 | Signed in | Navigate to Production Records. | The Production Records entry is shown as active; others are not. | Pass |
| TC-NAV-005 | REQ-NAV-005, REQ-NAV-009 | Signed in | Reduce the viewport width until the entries no longer fit one row. | Entries wrap to a further row; the bar grows in height; no entry is clipped. | Pass |
| TC-NAV-006 | REQ-NAV-006 | Signed in | At 320 px width, attempt to reach every navigation entry. | All four entries reachable without horizontal scrolling. | Pass |
| TC-NAV-007 | REQ-NAV-007 | Signed in, long page | Scroll the Process Check Sheet list to the bottom. | Navigation bar remains visible at the top of the viewport. | Pass |
| TC-NAV-008 | REQ-NAV-008 | Signed in | Open the Team dropdown, then scroll the page. | Dropdown closes rather than detaching from its trigger. | Pass |

## 3. Responsiveness and Theme

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-UI-001 | REQ-UI-001 | Signed in | Display each page at 320, 375, 768, 1024, 1440 and 2560 px width. | Content legible and operable at every width; no overlapping or clipped elements. | Pass |
| TC-UI-002 | REQ-UI-002 | Signed in | At each width above, attempt to scroll the page horizontally. | Page body does not scroll horizontally. | Pass |
| TC-UI-003 | REQ-UI-003 | Daily record with several hourly readings | At 375 px width, view the Hourly tab. | The readings table scrolls horizontally within its own container; the page does not. | Pass |
| TC-UI-004 | REQ-UI-004, REQ-UI-005 | First visit, no theme stored | Load the dashboard. | Dark theme applied. | Pass |
| TC-UI-005 | REQ-UI-004 | Signed in | Activate the theme control. | Page content switches to the light theme. | Pass |
| TC-UI-006 | REQ-UI-006 | Light theme selected | Reload the page; navigate to another page. | Light theme still applied. | Pass |
| TC-UI-007 | REQ-UI-007 | Signed in | Compare the navigation bar in both themes. | Bar colours identical in both. | Pass |
| TC-UI-008 | REQ-UI-008 | Light theme selected | Inspect page content below the bar. | Content rendered in monochrome. | Pass |

## 4. Build Identification

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-BLD-001 | REQ-BLD-001 | Published site | Inspect the footer of sign-in, dashboard, production records and check sheet pages. | Version, build number and build date/time shown on each. | Pass |
| TC-BLD-002 | REQ-BLD-002, REQ-BLD-004 | Published site | Inspect the footer values. | Build number is a positive integer; date/time is in UTC. | Pass |
| TC-BLD-003 | REQ-BLD-003 | Two consecutive publications | Record the build number of each. | The later build number is strictly greater. | Pass |
| TC-BLD-004 | REQ-BLD-003 | Publication from a non-`main` branch, then from `main` | Record both build numbers. | Ordering holds across branches. | Pass |
| TC-BLD-005 | REQ-BLD-005 | Published site | Inspect the version string. | Conforms to `MAJOR.MINOR.PATCH`. | Pass |
| TC-BLD-006 | REQ-BLD-006 | A change removing or altering an existing capability incompatibly | Review the version increment applied. | MAJOR incremented; MINOR and PATCH reset to 0. | Not run — no breaking change released to date |
| TC-BLD-007 | REQ-BLD-007 | A change adding a capability (e.g. the Process Check Sheet module, v1.3.0) | Review the version increment applied. | MINOR incremented; PATCH reset to 0. | Pass |
| TC-BLD-008 | REQ-BLD-008 | A defect-correction change (e.g. BUG-005, v1.3.2) | Review the version increment applied. | PATCH incremented; MAJOR and MINOR unchanged. | Pass |

## 5. Process Check Sheet

### 5.1 Record structure

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-PCS-001 | REQ-PCS-001 | Signed in | Create a check sheet with all daily-once items. | Record created and listed. | Pass |
| TC-PCS-002 | REQ-PCS-002 | Daily record exists | Add two hourly readings. | Both listed against that daily record. | Pass |
| TC-PCS-003 | REQ-PCS-003 | Daily record exists | Add a 1st Shift record. | Listed against that daily record; shift count shows 1/3. | Pass |
| TC-PCS-004 | REQ-PCS-004 | Daily record with hourly and shift children | Delete the daily record. | Record and all children removed; none remain listed. | Pass |
| TC-PCS-005 | REQ-PCS-005, REQ-MST-003 | Daily record with a record for every shift in the Shift Master | Attempt to add a further shift record. | Addition prevented; no shift can be recorded twice. | Blocked — deferred, depends on the Shift Master (ENH-001) |

### 5.2 Time structure

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-PCS-010 | REQ-PCS-010 | Add-hourly form open | Inspect the Time list. | 48 entries, first 6.30am, last 6.00am. | Pass |
| TC-PCS-011 | REQ-PCS-011 | Add-hourly form open | Select 6.30am, then 2.30pm, then 10.30pm. | Assigned to 1st, 2nd and 3rd Shift respectively. | Pass |
| TC-PCS-012 | REQ-PCS-011 | Add-hourly form open | Select 2.00pm and 10.00pm. | Assigned to 1st and 2nd Shift respectively (shift boundaries). | Pass |
| TC-PCS-014 | REQ-PCS-011, REQ-MST-002 | Shift Master defines shift timings other than three equal 8-hour shifts | Record an hourly reading and inspect the shift assigned. | Assignment follows the timings in the master, not a fixed slot count. | Blocked — deferred, depends on the Shift Master (ENH-001) |
| TC-PCS-013 | REQ-PCS-012 | Hourly readings recorded | View the Hourly tab. | Each row shows its time slot and the shift it belongs to. | Pass |

### 5.3 Data entry and validation

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-PCS-019 | REQ-PCS-020 | New check sheet and add-hourly forms | Compare each field's input type against the tolerances specification. | Items specified as numeric accept numeric entry; items specified with a fixed value set are presented as selections; date items accept a date. | Pass |
| TC-PCS-020 | REQ-PCS-021 | New check sheet form | Inspect the Line field. | Offers only 01, 02, 03, 06. | Pass |
| TC-PCS-021 | REQ-PCS-021 | New check sheet form | Inspect the Furnace field. | Offers only HF1–HF6, HF11, HF12. | Pass |
| TC-PCS-022 | REQ-PCS-021 | Add-shift form | Inspect the Shift Supervisor field. | Offers only VIMAL, BHARATHI, MOHAN, NAVEEN, ASHOK. | Pass |
| TC-PCS-023 | REQ-PCS-022, REQ-PCS-024 | Add-hourly form | Enter Melting Metal Temp 850. Save. | Field indicated in red, stating it is above the 700–800 °C limits. | Pass |
| TC-PCS-024 | REQ-PCS-022 | Add-hourly form | Enter Melting Metal Temp 740. Save. | No out-of-specification indication. | Pass |
| TC-PCS-025 | REQ-PCS-022 | Add-hourly form | Enter Pressure 5 bar and Die Temp 400 °C. Save. | Both indicated as above their limits. | Pass |
| TC-PCS-026 | REQ-PCS-023 | Add-hourly form | Select rotor size 100mm; enter Rotor RPM 603. | Accepted; within 550–650. | Pass |
| TC-PCS-027 | REQ-PCS-023 | Add-hourly form | Select rotor size 190mm; enter Rotor RPM 603. | Indicated as above the 350–400 limits. | Pass |
| TC-PCS-028 | REQ-PCS-023, REQ-PCS-029 | Add-hourly form | Change rotor size from 100mm to 190mm. | Displayed acceptance limits for Rotor RPM change to 350–400. | Pass |
| TC-PCS-029 | REQ-PCS-022 | Add-hourly form | Enter Dross Cleaning 25 min. | Indicated as not equal to the required 20 min. | Pass |
| TC-PCS-030 | REQ-PCS-026 | Add-hourly form | Enter an out-of-limit value with all mandatory items complete. Save. | Record saved and listed, with the value marked out of specification. | Pass |
| TC-PCS-031 | REQ-PCS-027 | Add-hourly form | Leave Die Temp empty. Save. | Save prevented; Die Temp identified as required. | Pass |
| TC-PCS-032 | REQ-PCS-024, REQ-PCS-025 | Daily record with one out-of-limit reading | View the check sheet list. | That daily record shows an out-of-specification count. | Pass |
| TC-PCS-033 | REQ-PCS-024 | As above | View the Hourly tab. | The offending cell is shown in red within the row. | Pass |
| TC-PCS-034 | REQ-PCS-028 | Add-shift form | Set cavities 1–10 to a mix of OK and NOT OK. Save. | All ten results stored and displayed. | Pass |
| TC-PCS-035 | REQ-PCS-029 | Add-hourly form | Inspect numeric fields. | Each displays its acceptance limits. | Pass |
| TC-PCS-036 | REQ-PCS-030 | Out-of-limit value recorded | Check for an administrator alert. | Alert transmitted. | Blocked — deferred, requires backend |

### 5.4 Persistence

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-PCS-040 | REQ-PCS-040 | Records entered | Reload the page. | All records still present. | Pass |
| TC-PCS-041 | REQ-PCS-041 | Record entered on device A | Open the site on device B as another user. | The record is visible. | Fail — deferred, see Backlog |
| TC-PCS-042 | REQ-PCS-042 | Completed daily record | Request a printable copy of the sheet. | Sheet rendered in the QC FMT 038 layout suitable for printing. | Blocked — deferred, not implemented |

## 6. Masters

All cases below are blocked pending the Shift Master and its siblings
(ENH-001 and the Masters section of the Backlog).

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-MST-001 | REQ-MST-001 | Signed in as an administrator | Open the Shift Master. | Each shift lists a code, display name, start time, end time and sequence. | Blocked — deferred |
| TC-MST-002 | REQ-MST-002 | Shift Master defined | Record entries at times spanning a shift boundary. | Each entry is attributed to the shift whose timings contain it. | Blocked — deferred |
| TC-MST-003 | REQ-MST-003 | A shift marked inactive in the master | Open any shift selector. | The inactive shift is not offered. | Blocked — deferred |
| TC-MST-004 | REQ-MST-004 | Signed in as an administrator | Open the masters area. | Masters exist for line, furnace, alloy grade, machine, personnel, rotor size and acceptance limits. | Blocked — deferred |
| TC-MST-005 | REQ-MST-005 | Line master maintained | Add a production line to the master; open the check sheet form. | The new line is offered without any code change or redeployment. | Blocked — deferred |
| TC-MST-006 | REQ-MST-005 | Tolerance master maintained | Alter an acceptance limit; record a value against the former limit. | Validation applies the new limit. | Blocked — deferred |
| TC-MST-007 | REQ-MST-006 | Signed in as a non-administrator | Attempt to open a master for maintenance. | Access refused. | Blocked — deferred |
| TC-MST-008 | REQ-MST-007 | Historic record referencing a master value | Deactivate that value; reopen the historic record. | The record still displays the value it was recorded against. | Blocked — deferred |

## 7. Developer Documentation

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-DEV-001 | REQ-DEV-001 | Signed in as `msv` | Open the profile menu. | Dev Page link present; page opens. | Pass |
| TC-DEV-002 | REQ-DEV-001 | Signed in as a non-developer account | Request `dev.html` directly by URL. | Access refused; redirected to the dashboard. | Pass |
| TC-DEV-003 | REQ-DEV-002 | On the Dev Page | Inspect the sub-page navigation. | Version History, Requirements, Test Cases, Bugs and Backlog all present and each opens. | Pass |
| TC-DEV-004 | REQ-DEV-005 | Requirements and Test Cases open | For each requirement, locate a case naming it. | Every requirement is named by at least one case. | Pass |
| TC-DEV-005 | REQ-DEV-003 | Requirements open | Review each requirement statement. | Each is a single "shall" statement, stating one verifiable capability, with a verification method given. | Pass |
| TC-DEV-006 | REQ-DEV-004 | Bugs open | Review each entry with status Fixed. | Each states symptom, root cause, correction applied, and the version the correction shipped in. | Pass |
| TC-DEV-007 | REQ-DEV-006 | A merged change that altered behaviour | Inspect that change's contents. | Requirements and Test Cases were updated within the same change. | Pass |

## 8. Deployment

| ID | Verifies | Preconditions | Steps | Expected result | Result |
|---|---|---|---|---|---|
| TC-DEP-001 | REQ-DEP-001 | Change merged to `main` | Observe the publication workflow. | Workflow runs and completes; change visible on the published site. | Pass |
| TC-DEP-002 | REQ-DEP-002 | Published site | Request the site root address. | Sign-in page displayed. | Pass |
| TC-DEP-003 | REQ-DEP-003 | Brand mark present at repository root | Publish. | Brand mark displayed on the sign-in page and in the navigation bar. | Not run — asset not yet supplied |
| TC-DEP-004 | REQ-DEP-004 | Brand mark absent | Publish. | Workflow completes and emits a warning. | Pass |
| TC-DEP-005 | REQ-DEP-005 | Brand mark absent | View the sign-in page and the navigation bar on each page. | A monogram placeholder is shown in place of the logo; no broken or empty image appears. | Pass |
| TC-DEP-006 | REQ-DEP-005 | Brand mark absent | View the Process Check Sheet page, where the bar is built after the document load pass. | Monogram shown in the bar, as on statically authored pages. | Pass |
