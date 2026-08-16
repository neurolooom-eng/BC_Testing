# Requirements

System requirements for the Bestcast web application, written in INCOSE
style: each requirement is a single "shall" statement that is necessary,
unambiguous, singular, feasible and verifiable.

**Convention:** `The <subject> shall <action> <object> <condition/constraint>`

**Maintenance rule:** this document is updated in the same change that
alters behaviour. A change that adds, removes or modifies a capability
updates the affected requirements and their test cases before it merges.

**Status key:** `Implemented` · `Partial` · `Deferred` (see Backlog)

---

## 1. Authentication (AUTH)

Current authentication is a temporary client-side mechanism; see the
Backlog for the Supabase replacement. Requirements below describe intended
behaviour independent of that mechanism.

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-AUTH-001 | The system shall require a User ID and password to be supplied before granting access to any page other than the sign-in page. | Restrict the application to authorised personnel. | Test | Implemented |
| REQ-AUTH-002 | The system shall grant access when the supplied credentials match an authorised account. | Permit legitimate access. | Test | Implemented |
| REQ-AUTH-003 | The system shall reject sign-in when the supplied credentials do not match an authorised account, and shall display the message "Invalid User ID or password." | Deny unauthorised access without disclosing which field was wrong. | Test | Implemented |
| REQ-AUTH-004 | The system shall accept User ID values that are not formatted as email addresses. | Plant accounts are short identifiers such as `msv`, not addresses. | Test | Implemented |
| REQ-AUTH-005 | The system shall redirect an unauthenticated user to the sign-in page when any protected page is requested. | Prevent direct URL access to protected content. | Test | Implemented |
| REQ-AUTH-006 | The system shall provide a sign-out control that terminates the session and returns the user to the sign-in page. | Allow shared-terminal users to end their session. | Demonstration | Implemented |
| REQ-AUTH-007 | The system shall terminate the user session when the browser tab is closed. | Shop-floor terminals are shared between shifts. | Test | Implemented |
| REQ-AUTH-008 | The system shall verify credentials server-side such that authorisation cannot be bypassed by modifying client-side code. | Client-side checks are not a security boundary. | Inspection | Deferred |

## 2. Navigation and Application Shell (NAV)

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-NAV-001 | The system shall present a top navigation bar on every authenticated page. | Consistent access to all modules. | Inspection | Implemented |
| REQ-NAV-002 | The navigation bar shall provide entries for Overview, Production Records, Reports and Team. | Defined top-level information architecture. | Inspection | Implemented |
| REQ-NAV-003 | The Team entry shall expose Roster as a sub-item. | Roster is subordinate to Team, not a peer. | Demonstration | Implemented |
| REQ-NAV-004 | The navigation bar shall visually indicate which entry corresponds to the page currently displayed. | Orientation within the application. | Inspection | Implemented |
| REQ-NAV-005 | The navigation bar shall wrap its entries onto additional rows when the entries exceed the available viewport width. | Every entry must remain reachable without horizontal scrolling. | Test | Implemented |
| REQ-NAV-006 | The navigation bar shall not require horizontal scrolling to reach any entry at any supported viewport width. | Horizontal scrolling hides navigation on small screens. | Test | Implemented |
| REQ-NAV-007 | The navigation bar shall remain visible at the top of the viewport while page content is scrolled vertically. | Navigation available from anywhere on long pages. | Demonstration | Implemented |
| REQ-NAV-008 | Navigation dropdown menus shall be displayed over page content at full opacity. | Menu contents must be legible against arbitrary page content. | Inspection | Implemented |
| REQ-NAV-009 | The navigation bar shall increase in height as required to accommodate wrapped entries. | A fixed height would clip wrapped rows. | Test | Implemented |

## 3. User Interface and Responsiveness (UI)

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-UI-001 | The system shall render all pages legibly and operably at viewport widths from 320 px to 2560 px. | Supports mobile, tablet and desktop use on the shop floor and in the office. | Test | Implemented |
| REQ-UI-002 | The system shall not require horizontal scrolling of the page body at any supported viewport width. | Horizontal page scroll makes content unreachable and detaches fixed elements. | Test | Implemented |
| REQ-UI-003 | The system shall confine content wider than the viewport, such as data tables, to horizontal scrolling within that content's own container. | Wide tabular data must remain viewable without breaking page layout. | Test | Implemented |
| REQ-UI-004 | The system shall provide a control to switch between light and dark themes. | Shop-floor lighting varies by shift. | Demonstration | Implemented |
| REQ-UI-005 | The system shall apply the dark theme by default when no theme has been selected. | Defined default appearance. | Test | Implemented |
| REQ-UI-006 | The system shall retain the selected theme across page loads and sessions on the same device. | Avoid re-selecting on every visit. | Test | Implemented |
| REQ-UI-007 | The navigation bar shall retain identical colours in both light and dark themes. | Brand identity is carried by the bar. | Inspection | Implemented |
| REQ-UI-008 | The system shall render page content other than the navigation bar in a monochrome palette when the light theme is selected. | Specified light-mode treatment. | Inspection | Implemented |

## 4. Build Identification (BLD)

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-BLD-001 | The system shall display the version number, build number and build date/time in the footer of every page. | Traceability of a reported defect to a specific build. | Inspection | Implemented |
| REQ-BLD-002 | The build number shall be a positive integer. | Unambiguous ordering. | Inspection | Implemented |
| REQ-BLD-003 | Each build number shall be strictly greater than the build number of the preceding build, irrespective of the branch built. | Build numbers must totally order releases. | Analysis | Implemented |
| REQ-BLD-004 | The build date/time shall record the instant of publication, expressed in UTC. | Site is maintained across time zones. | Inspection | Implemented |
| REQ-BLD-005 | The version number shall conform to semantic versioning as `MAJOR.MINOR.PATCH`. | Industry-standard configuration management. | Inspection | Implemented |
| REQ-BLD-006 | The MAJOR version shall be incremented when a change is not backward compatible. | Signal breaking change. | Inspection | Implemented |
| REQ-BLD-007 | The MINOR version shall be incremented when backward-compatible functionality is added. | Signal new capability. | Inspection | Implemented |
| REQ-BLD-008 | The PATCH version shall be incremented when a backward-compatible defect correction is made. | Signal fix-only release. | Inspection | Implemented |

## 5. Process Check Sheet (PCS)

Digital implementation of form QC FMT 038 for the Mando model line.

### 5.1 Record structure

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-PCS-001 | The Process Check Sheet module shall represent each production day as one day sheet containing the daily-once data items. | The paper sheet is organised per day and per line. | Inspection | Implemented |
| REQ-PCS-002 | The module shall associate zero or more hourly reading records with each day sheet. | Hourly readings are subordinate to the day's sheet. | Test | Implemented |
| REQ-PCS-003 | The module shall associate zero or more shift records with each day sheet. | Shift sign-offs are subordinate to the day's sheet. | Test | Implemented |
| REQ-PCS-004 | The module shall delete all associated machine, hourly and shift records when a day sheet is deleted. | Prevent orphaned child records. | Test | Implemented |
| REQ-PCS-006 | The module shall associate zero or more machine records with each day sheet, each holding M/C number, BC number, die coat thickness, die preheat temperature, cooling time, pouring time and tilting time. | Several machines run on one line in a day, each with its own settings; the paper sheet carries a block of these per day. | Inspection | Implemented |
| REQ-PCS-007 | The module shall record a Die Temp reading for each machine for each hourly time slot. | Die temperature is a per-machine, per-hour measurement on the paper sheet. | Test | Implemented |
| REQ-PCS-008 | The module shall record, for each machine, the time slot at which it started running and, where applicable, the time slot at which it stopped. | A machine may be introduced or withdrawn part-way through a shift. | Test | Implemented |
| REQ-PCS-009 | The module shall permit an operator to add a machine, and to stop a running machine, while recording hourly data. | Machine changes occur mid-shift and must be recordable without leaving the entry task. | Demonstration | Implemented |
| REQ-PCS-015 | The module shall record NA for each machine for each time slot outside that machine's running window. | A slot in which a machine was not running is a complete answer, distinct from one nobody has filled in. | Test | Implemented |
| REQ-PCS-016 | The module shall exclude a value recorded as NA from acceptance-limit evaluation. | NA states that no measurement applies, so it cannot be out of specification. | Test | Implemented |
| REQ-PCS-005 | The module shall accept at most one shift record per shift defined in the Shift Master, for a given daily record. | A shift is recorded once; duplicate or excess records corrupt the day's data. | Test | Deferred — depends on REQ-MST-001 |

### 5.2 Time structure

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-PCS-010 | The module shall provide 48 hourly reading time slots at 30-minute intervals, commencing at 06:30 and concluding at 06:00 the following day. | Matches the recording interval of the paper sheet. | Test | Implemented |
| REQ-PCS-011 | The module shall assign each time slot to exactly one shift, determined by the timings held in the Shift Master. | Each reading must be attributable to a shift, and shift timings are subject to change. | Test | Partial — assignment implemented against a fixed three-shift, 16-slot pattern pending REQ-MST-001 |
| REQ-PCS-012 | The module shall display the shift assigned to a time slot alongside each hourly reading. | Supervisors review by shift. | Inspection | Implemented |

### 5.3 Data entry and validation

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-PCS-020 | The module shall present each data item using the data type defined for that item in the approved tolerances specification. | Prevents free-text entry of controlled values. | Inspection | Implemented |
| REQ-PCS-021 | The module shall restrict entry of an enumerated data item to the values defined for that item in the approved tolerances specification. | Eliminates transcription errors such as "pk" for "ok". | Test | Implemented |
| REQ-PCS-022 | The module shall evaluate each numeric data item against the acceptance limits defined for that item in the approved tolerances specification. | Detect out-of-specification process conditions. | Test | Implemented |
| REQ-PCS-023 | The module shall evaluate Rotor RPM against the acceptance limits corresponding to the rotor size selected for that reading. | Acceptance limits differ by rotor size (100 mm: 550–650; 190 mm: 350–400). | Test | Implemented |
| REQ-PCS-024 | The module shall indicate, in red, each data item whose value lies outside its acceptance limits. | Required by the tolerances specification. | Inspection | Implemented |
| REQ-PCS-025 | The module shall indicate on the check sheet list the count of out-of-specification values recorded against each daily record. | Supervisors must identify affected sheets without opening each one. | Test | Implemented |
| REQ-PCS-026 | The module shall record a value that lies outside its acceptance limits when the operator confirms entry. | The record must reflect actual process conditions, not only compliant ones. | Test | Implemented |
| REQ-PCS-027 | The module shall prevent a record from being saved while any mandatory data item is empty, and shall identify each such item. | Incomplete records are not auditable. | Test | Implemented |
| REQ-PCS-028 | The module shall record the verification result of each of core pin cavities 1 to 10 for each shift record. | Required by the paper sheet. | Inspection | Implemented |
| REQ-PCS-029 | The module shall display, for each numeric data item, the acceptance limits applicable to that item. | Operators should not need the paper tolerance sheet to hand. | Inspection | Implemented |
| REQ-PCS-030 | The module shall transmit an alert to the administrator when a value outside its acceptance limits is recorded. | Required by the tolerances specification. | Test | Deferred |

### 5.4 Working view, entry layouts and approval

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-PCS-050 | The module shall present the day sheet as the single working view, from which every machine, hourly reading and shift record is added, edited and approved. | One place to work avoids navigating between screens while recording against a live line. | Demonstration | Implemented |
| REQ-PCS-051 | The module shall offer hourly entry in a matrix layout, in which the readings for multiple time slots are editable together. | Recording several slots in one pass suits catching up after a busy period. | Demonstration | Implemented |
| REQ-PCS-052 | The module shall offer hourly entry in a form layout, in which the readings for a single time slot are editable. | Recording one slot at a time suits entry as the shift proceeds. | Demonstration | Implemented |
| REQ-PCS-053 | The module shall retain the selected hourly entry layout across page loads on the same device. | The layout is an operator preference, not a per-visit choice. | Test | Implemented |
| REQ-PCS-054 | The module shall default the selected time slot for hourly entry to the most recently completed time slot. | The reading being recorded is almost always the one just finished. | Test | Implemented |
| REQ-PCS-055 | The module shall prevent modification of an hourly reading once a reading for a later time slot has been recorded. | Correcting the entry just made is legitimate; revising superseded history is not. | Test | Implemented |
| REQ-PCS-056 | The module shall permit an authorised user to approve a machine, hourly or shift record. | Supervisory sign-off is required on recorded process data. | Test | Implemented |
| REQ-PCS-057 | The module shall record the identity of the approver and the time of approval against each approved record. | Sign-off must be attributable. | Test | Implemented |
| REQ-PCS-058 | The module shall prevent modification of an approved record until its approval is withdrawn. | Approved data is a controlled record. | Test | Implemented |
| REQ-PCS-059 | The module shall indicate on each day sheet the number of records awaiting approval. | Supervisors must see outstanding sign-offs without opening each record. | Test | Implemented |

### 5.5 Persistence

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-PCS-040 | The module shall retain recorded data across page reloads and browser restarts. | Entries must not be lost. | Test | Implemented |
| REQ-PCS-041 | The module shall make a record entered by one user visible to all other authorised users. | Three shift supervisors record against the same daily sheet. | Test | Deferred |
| REQ-PCS-042 | The module shall render a submitted check sheet in the layout of form QC FMT 038 for printing. | Required by the tolerances specification. | Demonstration | Deferred |

## 6. Access Control and Configuration (AC)

Access is granted through roles. Per-user grants and denials exist for
exceptions and are off by default.

**Note on enforcement:** these requirements describe what the application
offers and permits in the browser. Until the checks are enforced
server-side (REQ-AUTH-008, BUG-006) they are not a security boundary.

### 6.1 Model

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-AC-001 | The system shall maintain a set of roles, each defining the operations permitted on each resource. | Access is administered per role rather than per person. | Inspection | Implemented |
| REQ-AC-002 | The system shall assign zero or more roles to each user. | A person may hold more than one responsibility. | Test | Implemented |
| REQ-AC-003 | The system shall derive a user's access from the union of the permissions of their assigned roles. | Role-based access is the default and only mechanism required. | Test | Implemented |
| REQ-AC-004 | The system shall permit an administrator to grant a user an operation in addition to those conferred by their roles. | Occasional exceptions arise before a role change is justified. | Test | Implemented |
| REQ-AC-005 | The system shall permit an administrator to deny a user an operation otherwise conferred by their roles. | An individual may need to be withheld from one operation. | Test | Implemented |
| REQ-AC-006 | The system shall apply a denial in preference to any grant of the same operation. | A withheld operation must not be reinstated by a role. | Test | Implemented |
| REQ-AC-007 | The system shall create each user with no additional grants and no denials. | Role-based access is the default; exceptions are deliberate. | Test | Implemented |
| REQ-AC-008 | The system shall report, for each operation shown to an administrator, whether it derives from a role, from an additional grant, or from a denial. | Exceptions must be visible rather than indistinguishable from role access. | Inspection | Implemented |
| REQ-AC-009 | The system shall report the count of additional and denied operations held by each user. | Accumulated exceptions must be noticeable without inspecting each user. | Test | Implemented |
| REQ-AC-010 | The system shall withhold all access from a user marked inactive. | Departures must be revocable in one step. | Test | Implemented |
| REQ-AC-011 | The system shall remove a deleted role from every user to which it was assigned. | Prevent references to a role that no longer exists. | Test | Implemented |
| REQ-AC-012 | The system shall prevent deletion of a role designated as a system role. | The administrator role must remain, or configuration becomes unreachable. | Test | Implemented |
| REQ-AC-013 | The system shall remove every role permission and per-user exception referring to a resource when that resource is deleted. | A reused identifier must not silently inherit former grants. | Test | Implemented |

### 6.2 Cloning access

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-AC-020 | The system shall permit an administrator to copy one user's access to another user. | Staff joining an existing team are usually granted the same access as a colleague. | Test | Implemented |
| REQ-AC-021 | The system shall permit role assignments, additional grants and denials to be selected independently when copying access. | Copying a colleague's roles should not silently duplicate their one-off exceptions. | Test | Implemented |
| REQ-AC-022 | The system shall copy role assignments only, unless additional grants or denials are expressly selected. | The safe default. | Test | Implemented |
| REQ-AC-023 | The system shall offer copying that replaces the recipient's access and copying that adds to it. | Both "make them the same as" and "also give them" are needed. | Test | Implemented |
| REQ-AC-024 | The system shall reject an attempt to copy a user's access to themselves. | A meaningless operation that would obscure a mis-selection. | Test | Implemented |

### 6.3 Resources under control

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-AC-030 | The system shall control access to pages, actions, exec links, sheet links and variables. | These are the distinct things a user may be permitted to reach or perform. | Inspection | Implemented |
| REQ-AC-031 | The system shall define, for each resource type, the operations that may be permitted on it. | Viewing a variable and editing it are different privileges. | Inspection | Implemented |
| REQ-AC-032 | The system shall permit an administrator to maintain the register of each resource type. | New pages, actions and links are added as the application grows. | Test | Implemented |
| REQ-AC-033 | The system shall omit from the navigation any page the signed-in user may not view. | Offering an unreachable destination is a defect in the interface. | Test | Implemented |
| REQ-AC-034 | The system shall redirect a user who requests a page they may not view to a page they may. | Direct entry of an address must not bypass the interface. | Test | Implemented |
| REQ-AC-035 | The system shall omit any control whose action the signed-in user may not perform. | The same reasoning as REQ-AC-033, applied to actions. | Test | Implemented |
| REQ-AC-036 | The system shall report, for each resource, the number of roles granting access to it. | Identifies resources nobody can reach and resources granted too widely. | Inspection | Implemented |

## 7. Masters (MST)

Controlled value lists are presently embedded in application code. These
requirements define their replacement by maintained masters. All are
deferred pending the backend — see the Backlog.

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-MST-001 | The system shall maintain a master of shifts, each defining a shift code, display name, start time, end time and sequence. | Shift timings are operational data and change without code changes. | Inspection | Deferred |
| REQ-MST-002 | The system shall determine the shift applicable to any recorded time from the Shift Master. | One definition of shift boundaries, used everywhere, rather than an assumption repeated per module. | Test | Deferred |
| REQ-MST-003 | The system shall offer, wherever a shift is selected, only those shifts marked active in the Shift Master. | Retired shift patterns must not be selectable, while historic records referencing them remain readable. | Test | Deferred |
| REQ-MST-004 | The system shall maintain masters for production line, furnace, alloy grade, machine, personnel, rotor size and acceptance limits. | The same values are referenced by several modules and must not diverge. | Inspection | Deferred |
| REQ-MST-005 | The system shall apply a change made to a master to every module referencing that master, without modification to application code. | A maintained master that requires a redeployment to change is not a master. | Test | Deferred |
| REQ-MST-006 | The system shall restrict maintenance of masters to authorised administrative users. | Controlled values govern acceptance of production data. | Test | Deferred |
| REQ-MST-007 | The system shall retain records that reference a master value after that value is deactivated. | Historic check sheets must remain complete and auditable. | Test | Deferred |

## 8. Developer Documentation (DEV)

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-DEV-001 | The system shall restrict access to the developer pages to authorised developer accounts. | Internal engineering information. | Test | Partial |
| REQ-DEV-002 | The developer pages shall provide sub-pages for Version History, Requirements, Test Cases, Bugs and Backlog. | Single location for engineering records. | Inspection | Implemented |
| REQ-DEV-003 | Requirements shall be expressed in INCOSE style as single "shall" statements that are unambiguous and verifiable. | Consistent, reviewable specification. | Inspection | Implemented |
| REQ-DEV-004 | Each recorded defect shall state its cause, the correction applied, and the version in which the correction was released. | Traceability from defect to release. | Inspection | Implemented |
| REQ-DEV-005 | Each requirement shall be traceable to at least one test case. | Demonstrates coverage. | Analysis | Implemented |
| REQ-DEV-006 | The Requirements and Test Cases documents shall be updated in the same change that alters the behaviour they describe. | Documentation drifts if updated separately. | Inspection | Implemented |

## 9. Deployment (DEP)

| ID | Requirement | Rationale | Verification | Status |
|---|---|---|---|---|
| REQ-DEP-001 | The system shall publish the contents of the `public/` directory when a change is merged to the `main` branch. | Continuous delivery of the site. | Demonstration | Implemented |
| REQ-DEP-002 | The system shall serve the sign-in page at the site root address. | Users arrive at the bare domain. | Test | Implemented |
| REQ-DEP-003 | The publication process shall incorporate the brand mark held at the repository root into the published site. | Root is the single source of truth for the asset. | Test | Implemented |
| REQ-DEP-004 | The publication process shall complete successfully, emitting a warning, when the brand mark is absent. | A missing optional asset must not block release. | Test | Implemented |
| REQ-DEP-005 | The system shall display a placeholder brand mark when the brand mark asset cannot be loaded. | The asset is supplied separately from the code, so its absence is a foreseeable state and must not present as a rendering fault. | Test | Implemented |
