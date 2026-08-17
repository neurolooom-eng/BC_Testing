// Process Check Sheet — UI.
//
// One working view: the Day Sheet. Every child table (machines, hourly
// readings, shift sign-offs) is added, edited and approved from there.
// The list exists only to pick or create a day.
//
//   #/            day sheets, to pick or create
//   #/new         create a day sheet
//   #/sheet/:id   the Day Sheet — the single working view

let PCS_SESSION = null;

// Hourly entry offers two layouts so the better one can be chosen in use:
// "matrix" edits many slots at once, "form" edits one slot at a time.
const PCS_HOURLY_MODE_KEY = "bestcast_pcs_hourly_mode";
let PCS_HOURLY_MODE = localStorage.getItem(PCS_HOURLY_MODE_KEY) || "matrix";
let PCS_SHOW_ALL_SLOTS = false;
let PCS_SHOW_ARCHIVED = false;
let PCS_FORM_SLOT = null;

// ---------- helpers -----------------------------------------------------

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function fieldInputHtml(field, value, entry) {
  const v = value ?? "";
  const hint = pcsSpecHint(field, entry);
  const hintHtml = hint ? `<span class="spec-hint">${escapeHtml(hint)}</span>` : "";
  const noteHtml = field.note ? `<p class="field-note">${escapeHtml(field.note)}</p>` : "";

  let input;
  if (field.type === "select") {
    const opts = field.options
      .map((o) => `<option value="${escapeHtml(o)}"${String(v) === String(o) ? " selected" : ""}>${escapeHtml(o)}</option>`)
      .join("");
    input = `<select data-key="${field.key}"><option value="">—</option>${opts}</select>`;
  } else {
    const step = field.step ? ` step="${field.step}"` : field.type === "number" ? ' step="any"' : "";
    // inputmode opens the numeric keypad on a tablet rather than the full
    // keyboard — these are entered on the line, not at a desk.
    const mode = field.type === "number" ? ' inputmode="decimal"' : "";
    input = `<input type="${field.type}" data-key="${field.key}" value="${escapeHtml(v)}"${step}${mode}>`;
  }

  return `
    <div class="field" data-field="${field.key}">
      <label>${escapeHtml(field.label)} ${hintHtml}</label>
      ${input}
      ${noteHtml}
      <p class="field-error"></p>
    </div>`;
}

function readForm(container, fields) {
  const entry = {};
  fields.forEach((f) => {
    const input = container.querySelector(`[data-key="${f.key}"]`);
    if (!input) return;
    entry[f.key] = input.value.trim();
  });
  return entry;
}

function paintValidation(container, entry, fields) {
  const result = pcsValidate(entry, fields);
  container.querySelectorAll(".field").forEach((f) => {
    f.classList.remove("has-error");
    const err = f.querySelector(".field-error");
    if (err) err.textContent = "";
  });

  result.outOfSpec.forEach((issue) => {
    const f = container.querySelector(`.field[data-field="${issue.key}"]`);
    if (!f) return;
    f.classList.add("has-error");
    f.querySelector(".field-error").textContent = `Out of spec — ${issue.reason}`;
  });

  fields.forEach((f) => {
    if (!f.required) return;
    const val = entry[f.key];
    if (val === undefined || val === null || val === "") {
      const node = container.querySelector(`.field[data-field="${f.key}"]`);
      if (node) {
        node.classList.add("has-error");
        node.querySelector(".field-error").textContent = "Required";
      }
    }
  });

  return result;
}

// Marks a single field out of spec as it is typed, rather than waiting for
// the record to be saved — the operator should see it while the value is
// still under their hand.
function paintFieldOutOfSpec(fieldNode, field, entry) {
  if (!fieldNode) return;
  const issue = pcsValidate(entry, [field]).outOfSpec[0];
  fieldNode.classList.toggle("oos", !!issue);
  const err = fieldNode.querySelector(".field-error");
  if (err) err.textContent = issue ? `Out of spec — ${issue.reason}` : "";
}

// Live out-of-spec feedback for a form built from fieldInputHtml.
function wireLiveValidation(container, fields) {
  fields.forEach((field) => {
    const node = container.querySelector(`.field[data-field="${field.key}"]`);
    const input = node?.querySelector(`[data-key="${field.key}"]`);
    if (!input) return;

    const check = () => {
      // Fields whose limits depend on another field (rotor RPM on rotor
      // size) need the whole form, not just their own value.
      const entry = readForm(container, fields);
      paintFieldOutOfSpec(node, field, entry);
    };

    input.addEventListener("input", check);
    input.addEventListener("change", () => {
      // A dependency change can move another field in or out of spec.
      fields.forEach((f) => {
        const n = container.querySelector(`.field[data-field="${f.key}"]`);
        if (n) paintFieldOutOfSpec(n, f, readForm(container, fields));
      });
    });

    if (input.value !== "") check();
  });
}

function outOfSpecBanner(issues) {
  if (!issues.length) return "";
  const rows = issues
    .map((i) => `<li><strong>${escapeHtml(i.label)}</strong>: ${escapeHtml(i.value)} — ${escapeHtml(i.reason)}</li>`)
    .join("");
  return `
    <div class="alert alert-danger">
      <p><strong>${issues.length} reading${issues.length === 1 ? "" : "s"} out of spec.</strong>
      Saved anyway so the record matches what actually happened on the line —
      but this sheet is flagged for the admin.</p>
      <ul>${rows}</ul>
      <p class="alert-note">Automated admin email/notification needs a backend —
      pending the Supabase work in BACKLOG.md.</p>
    </div>`;
}

// Whether the signed-in user may perform an action. Controls are hidden
// rather than shown-and-refused, so the sheet reflects what this operator
// can actually do. See rbac.js on why this is not a security boundary.
function pcsCan(actionId) {
  if (typeof rbacCanDo !== "function") return true;
  return rbacCanDo(PCS_SESSION.userid, actionId);
}

function approvalBadge(child) {
  if (!child.approval) return `<span class="pending-badge">Pending</span>`;
  const when = new Date(child.approval.at).toLocaleString();
  return `<span class="ok-badge" title="Approved by ${escapeHtml(child.approval.by)} on ${escapeHtml(when)}">Approved</span>`;
}

function reload(id) {
  renderSheet(document.getElementById("pcs-root"), id);
}

// ---------- list --------------------------------------------------------

function renderList(root) {
  const all = pcsLoadAll().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const archivedCount = all.filter(pcsIsArchived).length;
  // Archived sheets are withdrawn from the working list rather than removed.
  const records = PCS_SHOW_ARCHIVED ? all : all.filter((r) => !pcsIsArchived(r));

  const rows = records
    .map((r) => {
      const flags = pcsOutOfSpecCount(r);
      const pending = pcsPendingApprovalCount(r);
      const archived = pcsIsArchived(r);
      return `
        <tr class="${archived ? "row-locked" : ""}">
          <td>
            <a href="#/sheet/${r.id}">${escapeHtml(r.date || "—")}</a>
            ${archived ? ' <span class="archived-badge">Archived</span>' : ""}
          </td>
          <td>${escapeHtml(r.line || "—")}</td>
          <td>${escapeHtml(r.furnaceNo || "—")}</td>
          <td>${(r.machines || []).length}</td>
          <td>${(r.hourly || []).length}</td>
          <td>${(r.shifts || []).length} / 3</td>
          <td>${flags ? `<span class="flag-badge">${flags} out of spec</span>` : `<span class="ok-badge">In spec</span>`}</td>
          <td>${pending ? `<span class="pending-badge">${pending} pending</span>` : `<span class="ok-badge">Approved</span>`}</td>
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <p class="breadcrumb"><a href="production-records.html">Production Records</a> / Process Check Sheet</p>
    <h1>Process Check Sheet</h1>
    <p class="subtitle">
      QC FMT 038 · Line — Mando Model Line. Open a day sheet to record and approve
      machines, hourly readings and shift sign-offs.
    </p>

    <div class="btn-row" style="margin-bottom:22px;">
      ${pcsCan("action.pcs.sheet.create") ? '<a class="btn" href="#/new">+ New Day Sheet</a>' : '<span class="muted-xs">You do not have permission to create a day sheet.</span>'}
      ${
        archivedCount
          ? `<button class="btn btn-secondary" id="toggle-archived">
               ${PCS_SHOW_ARCHIVED ? "Hide archived" : `Show archived (${archivedCount})`}
             </button>`
          : ""
      }
    </div>

    ${
      records.length
        ? `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Line</th><th>Furnace</th><th>Machines</th>
                  <th>Hourly</th><th>Shifts</th><th>Spec</th><th>Approval</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : `<div class="card"><p>No day sheets yet. Create one to start recording.</p></div>`
    }`;

  root.querySelector("#toggle-archived")?.addEventListener("click", () => {
    PCS_SHOW_ARCHIVED = !PCS_SHOW_ARCHIVED;
    renderList(root);
  });
}

// ---------- new day sheet -----------------------------------------------

function renderNew(root) {
  const today = new Date().toISOString().slice(0, 10);
  root.innerHTML = `
    <p class="breadcrumb"><a href="#/">Process Check Sheet</a> / New</p>
    <h1>New Day Sheet</h1>
    <p class="subtitle">Header details for the day. Machines, hourly readings and shift sign-offs are all recorded on the sheet itself.</p>
    <div class="card">
      <div class="field-grid" id="daily-form">
        ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, f.key === "date" ? today : "", {})).join("")}
      </div>
      <div id="daily-alert"></div>
      <div class="btn-row" style="margin-top:20px;">
        <button class="btn" id="save-daily">Create Day Sheet</button>
        <a class="btn btn-secondary" href="#/">Cancel</a>
      </div>
    </div>`;

  const form = document.getElementById("daily-form");
  document.getElementById("save-daily").addEventListener("click", () => {
    const entry = readForm(form, PCS_DAILY_FIELDS);
    const result = paintValidation(form, entry, PCS_DAILY_FIELDS);
    document.getElementById("daily-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;
    const record = pcsCreateDaily(entry, PCS_SESSION.userid);
    window.location.hash = `#/sheet/${record.id}`;
  });
}

// ---------- the Day Sheet — the single working view ---------------------

function renderSheet(root, id) {
  const record = pcsGet(id);
  if (!record) {
    root.innerHTML = `<div class="card"><p>Day sheet not found. <a href="#/">Back to list</a></p></div>`;
    return;
  }

  const flags = pcsOutOfSpecCount(record);
  const pending = pcsPendingApprovalCount(record);
  const archived = pcsIsArchived(record);

  root.innerHTML = `
    <p class="breadcrumb"><a href="#/">Process Check Sheet</a> / ${escapeHtml(record.date || "")}</p>
    <div class="sheet-head">
      <div>
        <h1>Day Sheet — ${escapeHtml(record.date || "")} · Line ${escapeHtml(record.line || "")}</h1>
        <p class="subtitle" style="margin-bottom:0;">
          Furnace ${escapeHtml(record.furnaceNo || "—")} · ${escapeHtml(record.metalGrade || "")} ·
          ${(record.machines || []).length} machine(s)
        </p>
      </div>
      <div class="sheet-status">
        ${archived ? `<span class="archived-badge">Archived</span>` : ""}
        ${flags ? `<span class="flag-badge">${flags} out of spec</span>` : `<span class="ok-badge">In spec</span>`}
        ${pending ? `<span class="pending-badge">${pending} pending approval</span>` : `<span class="ok-badge">All approved</span>`}
      </div>
    </div>

    ${
      archived
        ? `<div class="alert alert-ok" style="margin-bottom:18px;">
             This day sheet was archived by ${escapeHtml(record.archivedBy || "an administrator")}
             on ${escapeHtml(new Date(record.archivedAt).toLocaleString())}. It is read-only.
           </div>`
        : ""
    }

    <section class="sheet-section" id="sec-header"></section>
    <section class="sheet-section" id="sec-machines"></section>
    <section class="sheet-section" id="sec-shift-details"></section>
    <section class="sheet-section" id="sec-hourly"></section>
    <section class="sheet-section" id="sec-signoff"></section>`;

  // Working order: set the day up, declare the machines, open the shift,
  // record through the shift, then sign it off.
  renderHeaderSection(root.querySelector("#sec-header"), record);
  renderMachinesSection(root.querySelector("#sec-machines"), record);
  renderShiftDetailsSection(root.querySelector("#sec-shift-details"), record);
  renderHourlySection(root.querySelector("#sec-hourly"), record);
  renderShiftSignoffSection(root.querySelector("#sec-signoff"), record);
}

// --- header -------------------------------------------------------------

function renderHeaderSection(panel, record) {
  const archived = pcsIsArchived(record);
  // Once saved, day details are amendable only by those holding the edit
  // permission, and the sheet itself is never deletable — it is a
  // production record. Administrators may archive it instead.
  const canEdit = pcsCan("action.pcs.sheet.edit") && !archived;
  const canArchive = pcsCan("action.pcs.sheet.archive");

  panel.innerHTML = `
    <details class="sheet-block">
      <summary><h2>Day details</h2><span class="muted-xs">Header — recorded once for the day</span></summary>
      <div class="card">
        <fieldset class="fieldset" style="border:none;padding:0;"${canEdit ? "" : " disabled"}>
          <div class="field-grid" id="daily-edit">
            ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, record[f.key], record)).join("")}
          </div>
        </fieldset>
        <div id="daily-edit-alert"></div>
        ${
          canEdit
            ? ""
            : `<p class="muted-xs" style="margin-top:12px;">${
                archived
                  ? "This sheet is archived and cannot be amended."
                  : "You do not have permission to amend day details."
              }</p>`
        }
        <div class="btn-row" style="margin-top:18px;">
          ${canEdit ? '<button class="btn" id="update-daily">Save day details</button>' : ""}
          ${
            canArchive && !archived
              ? '<button class="btn btn-secondary" id="archive-daily">Archive day sheet</button>'
              : ""
          }
          ${
            canArchive && archived
              ? '<button class="btn btn-secondary" id="unarchive-daily">Restore from archive</button>'
              : ""
          }
        </div>
      </div>
    </details>`;

  const form = panel.querySelector("#daily-edit");
  panel.querySelector("#update-daily")?.addEventListener("click", () => {
    const entry = readForm(form, PCS_DAILY_FIELDS);
    const result = paintValidation(form, entry, PCS_DAILY_FIELDS);
    panel.querySelector("#daily-edit-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;
    pcsUpdateDaily(record.id, entry);
    reload(record.id);
  });

  panel.querySelector("#archive-daily")?.addEventListener("click", () => {
    if (!confirm("Archive this day sheet? It becomes read-only and is withdrawn from the working list. Nothing is deleted, and it can be restored.")) return;
    pcsArchiveDaily(record.id, PCS_SESSION.userid);
    reload(record.id);
  });

  panel.querySelector("#unarchive-daily")?.addEventListener("click", () => {
    pcsUnarchiveDaily(record.id);
    reload(record.id);
  });
}

// --- machines -----------------------------------------------------------

function renderMachinesSection(panel, record) {
  const machines = record.machines || [];
  const nearest = pcsNearestCompletedSlot(record.date);

  const rows = machines
    .map((m) => {
      const issues = pcsValidate(m, PCS_MACHINE_FIELDS).outOfSpec;
      const bad = new Set(issues.map((i) => i.key));
      const cells = PCS_MACHINE_FIELDS.map(
        (f) => `<td class="${bad.has(f.key) ? "cell-bad" : ""}">${escapeHtml(m[f.key] ?? "—")}</td>`
      ).join("");
      const running = m.stopSlot === null || m.stopSlot === undefined;
      const window = running
        ? `from ${escapeHtml(PCS_TIME_SLOTS[m.startSlot ?? 0])}`
        : `${escapeHtml(PCS_TIME_SLOTS[m.startSlot ?? 0])} – ${escapeHtml(PCS_TIME_SLOTS[m.stopSlot])}`;
      return `
        <tr>
          ${cells}
          <td>
            <span class="${running ? "ok-badge" : "stopped-badge"}">${running ? "Running" : "Stopped"}</span>
            <br><span class="muted-xs">${window}</span>
          </td>
          <td>${approvalBadge(m)}</td>
          <td class="row-actions">
            ${pcsCan("action.pcs.machine.manage") ? `<button class="link-btn" data-edit-machine="${m.id}">Edit</button>` : ""}
            ${
              !pcsCan("action.pcs.machine.stop")
                ? ""
                : running
                ? `<button class="link-btn" data-stop-machine="${m.id}">Stop</button>`
                : `<button class="link-btn" data-resume-machine="${m.id}">Resume</button>`
            }
            ${
              m.approval
                ? pcsCan("action.pcs.unapprove")
                  ? `<button class="link-btn" data-unapprove="machines:${m.id}">Unapprove</button>`
                  : ""
                : pcsCan("action.pcs.approve")
                ? `<button class="link-btn" data-approve="machines:${m.id}">Approve</button>`
                : ""
            }
            ${pcsCan("action.pcs.machine.delete") ? `<button class="link-btn danger" data-del-machine="${m.id}">Delete</button>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  panel.innerHTML = `
    <details class="sheet-block" open>
      <summary><h2>Machines</h2><span class="muted-xs">${machines.length} on the line — a machine can start or stop mid-day</span></summary>
      <div class="btn-row" style="margin:0 0 14px;">
        ${pcsCan("action.pcs.machine.manage") ? '<button class="btn" id="add-machine">+ Add machine</button>' : ""}
        <span class="muted-xs">Hours outside a machine's running window are recorded as NA.</span>
      </div>
      ${
        machines.length
          ? `<div class="table-wrap">
              <table class="dense">
                <thead><tr>
                  ${PCS_MACHINE_FIELDS.map((f) => `<th>${escapeHtml(f.short || f.label)}</th>`).join("")}
                  <th>Status</th><th>Approval</th><th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`
          : `<div class="card"><p>No machines recorded. Add the machines running on this line today.</p></div>`
      }
    </details>`;

  panel.querySelector("#add-machine")?.addEventListener("click", () =>
    openMachineModal(record, null, nearest)
  );
  panel.querySelectorAll("[data-edit-machine]").forEach((b) =>
    b.addEventListener("click", () => openMachineModal(record, b.dataset.editMachine, nearest))
  );
  panel.querySelectorAll("[data-stop-machine]").forEach((b) =>
    b.addEventListener("click", () => openStopMachineModal(record, b.dataset.stopMachine, nearest))
  );
  panel.querySelectorAll("[data-resume-machine]").forEach((b) =>
    b.addEventListener("click", () => {
      pcsResumeMachine(record.id, b.dataset.resumeMachine);
      reload(record.id);
    })
  );
  panel.querySelectorAll("[data-del-machine]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this machine and its Die Temp readings?")) return;
      pcsDeleteChild(record.id, "machines", b.dataset.delMachine);
      reload(record.id);
    })
  );
  wireApprovalButtons(panel, record);
}

function wireApprovalButtons(panel, record) {
  panel.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => {
      const [kind, id] = b.dataset.approve.split(":");
      pcsApprove(record.id, kind, id, PCS_SESSION.userid);
      reload(record.id);
    })
  );
  panel.querySelectorAll("[data-unapprove]").forEach((b) =>
    b.addEventListener("click", () => {
      const [kind, id] = b.dataset.unapprove.split(":");
      pcsUnapprove(record.id, kind, id);
      reload(record.id);
    })
  );
}

function slotOptions(selected) {
  return PCS_TIME_SLOTS.map(
    (s, i) =>
      `<option value="${i}"${i === Number(selected) ? " selected" : ""}>${escapeHtml(s)} — ${escapeHtml(pcsShiftForSlotIndex(i))}</option>`
  ).join("");
}

function openMachineModal(record, machineId, nearest) {
  const existing = machineId ? (record.machines || []).find((m) => m.id === machineId) : null;
  const entry = existing || {};
  const startSlot = existing ? existing.startSlot ?? 0 : nearest;

  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <h2>${machineId ? "Edit" : "Add"} machine</h2>
        <div class="field-grid" id="machine-form">
          ${PCS_MACHINE_FIELDS.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
          <div class="field" data-field="startSlot">
            <label>Running from <span class="spec-hint">first slot this machine was on the line</span></label>
            <select data-key="startSlot">${slotOptions(startSlot)}</select>
            <p class="field-note">Slots before this are recorded as NA for this machine.</p>
            <p class="field-error"></p>
          </div>
        </div>
        <div id="machine-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-machine">Save</button>
          <button class="btn btn-secondary" id="cancel-machine">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const form = modal.querySelector("#machine-form");

  modal.querySelector("#cancel-machine").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#save-machine").addEventListener("click", () => {
    const data = readForm(form, PCS_MACHINE_FIELDS);
    const result = paintValidation(form, data, PCS_MACHINE_FIELDS);
    modal.querySelector("#machine-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    const slot = Number(form.querySelector('[data-key="startSlot"]').value);
    if (machineId) pcsUpdateChild(record.id, "machines", machineId, { ...data, startSlot: slot });
    else pcsAddMachine(record.id, data, slot);

    modal.remove();
    reload(record.id);
  });
}

function openStopMachineModal(record, machineId, nearest) {
  const machine = (record.machines || []).find((m) => m.id === machineId);
  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal" style="max-width:520px;">
        <h2>Stop machine ${escapeHtml(machine?.machineNo ?? "")}</h2>
        <p class="subtitle">Slots after this are recorded as NA for this machine.</p>
        <div class="field">
          <label>Last slot the machine was running</label>
          <select id="stop-slot">${slotOptions(nearest)}</select>
        </div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="confirm-stop">Stop machine</button>
          <button class="btn btn-secondary" id="cancel-stop">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  modal.querySelector("#cancel-stop").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector("#confirm-stop").addEventListener("click", () => {
    pcsStopMachine(record.id, machineId, modal.querySelector("#stop-slot").value);
    modal.remove();
    reload(record.id);
  });
}

// --- hourly -------------------------------------------------------------

function renderHourlySection(panel, record) {
  const nearest = pcsNearestCompletedSlot(record.date);
  if (PCS_FORM_SLOT === null) PCS_FORM_SLOT = nearest;

  panel.innerHTML = `
    <details class="sheet-block" open>
      <summary><h2>Hourly readings</h2><span class="muted-xs">${(record.hourly || []).length} recorded · nearest completed slot is ${escapeHtml(PCS_TIME_SLOTS[nearest])}</span></summary>
      <div class="view-toggle">
        <button class="toggle-btn${PCS_HOURLY_MODE === "matrix" ? " active" : ""}" data-mode="matrix">Matrix view</button>
        <button class="toggle-btn${PCS_HOURLY_MODE === "form" ? " active" : ""}" data-mode="form">Form view</button>
        <span class="muted-xs">Two layouts for the same data — use whichever suits the line.</span>
      </div>
      <div id="hourly-body"></div>
    </details>`;

  panel.querySelectorAll(".toggle-btn").forEach((b) =>
    b.addEventListener("click", () => {
      PCS_HOURLY_MODE = b.dataset.mode;
      localStorage.setItem(PCS_HOURLY_MODE_KEY, PCS_HOURLY_MODE);
      reload(record.id);
    })
  );

  const body = panel.querySelector("#hourly-body");
  if (PCS_HOURLY_MODE === "matrix") renderHourlyMatrix(body, record, nearest);
  else renderHourlyForm(body, record, nearest);
}

// Matrix: many slots at once. Rows for slots already superseded by a later
// entry are locked, so a correction is possible until the operator moves on.
function renderHourlyMatrix(body, record, nearest) {
  const machines = record.machines || [];
  const lastSlot = PCS_SHOW_ALL_SLOTS ? 47 : nearest;
  const latestRecorded = pcsLatestRecordedSlot(record);

  const header = `
    <tr>
      <th class="sticky-col">Time</th>
      ${PCS_HOURLY_FIELDS.map((f) => `<th title="${escapeHtml(f.label)}">${escapeHtml(f.short || f.label)}</th>`).join("")}
      ${machines
        .map((m) => `<th title="Die Temp — M/C ${escapeHtml(m.machineNo)}">Die °C · M/C ${escapeHtml(m.machineNo)}</th>`)
        .join("")}
      <th>Approval</th>
    </tr>`;

  const rows = [];
  for (let i = 0; i <= lastSlot; i++) {
    const entry = pcsHourlyFor(record, i) || {};
    const locked = pcsHourlyLocked(record, i);
    const issues = new Set(pcsValidate(entry, PCS_HOURLY_FIELDS).outOfSpec.map((x) => x.key));

    const cells = PCS_HOURLY_FIELDS.map((f) => {
      const v = entry[f.key] ?? "";
      const oos = issues.has(f.key);
      if (locked) {
        return `<td class="${oos ? "cell-oos" : ""}">${escapeHtml(v === "" ? "—" : v)}</td>`;
      }
      if (f.type === "select") {
        const opts = f.options
          .map((o) => `<option value="${escapeHtml(o)}"${String(v) === String(o) ? " selected" : ""}>${escapeHtml(o)}</option>`)
          .join("");
        return `<td class="${oos ? "has-oos" : ""}"><select class="cell-input${oos ? " cell-oos" : ""}" data-slot="${i}" data-key="${f.key}"><option value="">—</option>${opts}</select></td>`;
      }
      const step = f.step ? ` step="${f.step}"` : ' step="any"';
      return `<td class="${oos ? "has-oos" : ""}"><input class="cell-input${oos ? " cell-oos" : ""}" type="number" inputmode="decimal" data-slot="${i}" data-key="${f.key}" value="${escapeHtml(v)}"${step}></td>`;
    }).join("");

    const dieCells = machines
      .map((m) => {
        if (!pcsMachineRunningAt(m, i)) return `<td class="cell-na">NA</td>`;
        const v = (entry.dieTemps || {})[m.id] ?? "";
        const bad = v !== "" && pcsValidate({ dieTemp: v }, [PCS_MACHINE_HOURLY_FIELD]).outOfSpec.length;
        if (locked) return `<td class="${bad ? "cell-oos" : ""}">${escapeHtml(v === "" ? "—" : v)}</td>`;
        return `<td class="${bad ? "has-oos" : ""}"><input class="cell-input${bad ? " cell-oos" : ""}" type="number" inputmode="decimal" data-slot="${i}" data-die="${m.id}" value="${escapeHtml(v)}" step="any"></td>`;
      })
      .join("");

    const hasEntry = pcsHourlyFor(record, i);
    const approvalCell = hasEntry
      ? hasEntry.approval
        ? `${approvalBadge(hasEntry)} ${pcsCan("action.pcs.unapprove") ? `<button class="link-btn" data-unapprove="hourly:${hasEntry.id}">Undo</button>` : ""}`
        : pcsCan("action.pcs.approve")
        ? `<button class="link-btn" data-approve="hourly:${hasEntry.id}">Approve</button>`
        : `<span class="pending-badge">Pending</span>`
      : `<span class="muted-xs">—</span>`;

    rows.push(`
      <tr class="${locked ? "row-locked" : ""}${i === latestRecorded ? " row-latest" : ""}">
        <td class="sticky-col">
          <strong>${escapeHtml(PCS_TIME_SLOTS[i])}</strong>
          ${locked ? '<span class="lock-mark" title="Locked — a later slot has been recorded">🔒</span>' : ""}
          <br><span class="muted-xs">${escapeHtml(pcsShiftForSlotIndex(i))}</span>
        </td>
        ${cells}${dieCells}
        <td>${approvalCell}</td>
      </tr>`);
  }

  // The last slot of a shift is where that shift is sent for approval.
  const submitTarget = pcsMatrixSubmitTarget(record, lastSlot);

  body.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px;">
      ${pcsCan("action.pcs.hourly.record") ? '<button class="btn" id="save-matrix">Save changes</button>' : '<span class="muted-xs">Read-only — recording hourly readings is not permitted for your role.</span>'}
      ${
        submitTarget && pcsCan("action.pcs.hourly.record")
          ? `<button class="btn" id="save-send-matrix">Save &amp; Send ${escapeHtml(submitTarget.shift)} for Approval</button>`
          : ""
      }
      <button class="btn btn-secondary" id="toggle-slots">
        ${PCS_SHOW_ALL_SLOTS ? "Show up to current slot" : "Show all 48 slots"}
      </button>
      <span class="muted-xs">Rows lock once a later slot is recorded. Approved rows stay locked.</span>
    </div>
    <div id="matrix-alert"></div>
    <div class="table-wrap matrix-wrap">
      <table class="dense matrix"><thead>${header}</thead><tbody>${rows.join("")}</tbody></table>
    </div>`;

  body.querySelector("#toggle-slots").addEventListener("click", () => {
    PCS_SHOW_ALL_SLOTS = !PCS_SHOW_ALL_SLOTS;
    reload(record.id);
  });

  wireMatrixLiveValidation(body, record);

  function saveMatrix() {
    const bySlot = {};
    body.querySelectorAll(".cell-input").forEach((input) => {
      const slot = Number(input.dataset.slot);
      bySlot[slot] = bySlot[slot] || { fields: {}, dieTemps: {} };
      const value = input.value.trim();
      if (input.dataset.die) bySlot[slot].dieTemps[input.dataset.die] = value;
      else bySlot[slot].fields[input.dataset.key] = value;
    });

    let saved = 0;
    Object.keys(bySlot)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((slot) => {
        const { fields, dieTemps } = bySlot[slot];
        const anyValue =
          Object.values(fields).some((v) => v !== "") || Object.values(dieTemps).some((v) => v !== "");
        if (!anyValue) return;

        const existing = pcsHourlyFor(record, slot) || {};
        const merged = { ...existing.dieTemps, ...dieTemps };
        Object.keys(merged).forEach((k) => merged[k] === "" && delete merged[k]);

        pcsSaveHourly(record.id, slot, { ...fields, dieTemps: merged });
        saved++;
      });

    return saved;
  }

  body.querySelector("#save-matrix")?.addEventListener("click", () => {
    if (!saveMatrix()) {
      body.querySelector("#matrix-alert").innerHTML =
        `<div class="alert alert-ok">Nothing to save — no values entered.</div>`;
      return;
    }
    reload(record.id);
  });

  body.querySelector("#save-send-matrix")?.addEventListener("click", () => {
    saveMatrix();
    submitShiftForApproval(record.id, submitTarget.shift);
  });

  wireApprovalButtons(body, record);
}

// The shift eligible for submission from the matrix: the one whose final
// slot is on screen and still in draft.
function pcsMatrixSubmitTarget(record, lastVisibleSlot) {
  for (let s = PCS_SHIFTS.length - 1; s >= 0; s--) {
    const shift = PCS_SHIFTS[s];
    const range = pcsShiftSlotRange(shift);
    if (range.last > lastVisibleSlot) continue;
    const shiftRecord = pcsShiftRecordFor(record, shift);
    if (!shiftRecord) return { shift, shiftRecord: null };
    if (pcsShiftStatus(shiftRecord) === PCS_SHIFT_STATUS.DRAFT) return { shift, shiftRecord };
    return null; // most recent complete shift already submitted
  }
  return null;
}

// Live out-of-spec fill for the matrix. The whole cell changes as the value
// is typed, so a bad reading is obvious before the operator moves on.
function wireMatrixLiveValidation(body, record) {
  const repaint = (input) => {
    const cell = input.closest("td");
    const row = input.closest("tr");
    if (!cell || !row) return;

    let issue;
    if (input.dataset.die) {
      const v = input.value.trim();
      issue = v === "" ? null : pcsValidate({ dieTemp: v }, [PCS_MACHINE_HOURLY_FIELD]).outOfSpec[0];
    } else {
      const field = PCS_HOURLY_FIELDS.find((f) => f.key === input.dataset.key);
      if (!field) return;
      // Read the whole row so dependent limits (rotor RPM on rotor size)
      // are evaluated against what is actually entered.
      const rowEntry = {};
      row.querySelectorAll(".cell-input[data-key]").forEach((i) => {
        rowEntry[i.dataset.key] = i.value.trim();
      });
      issue = rowEntry[field.key] === "" ? null : pcsValidate(rowEntry, [field]).outOfSpec[0];
    }

    cell.classList.toggle("has-oos", !!issue);
    input.classList.toggle("cell-oos", !!issue);
    if (issue) input.title = `Out of spec — ${issue.reason}`;
    else input.removeAttribute("title");
  };

  body.querySelectorAll(".cell-input").forEach((input) => {
    input.addEventListener("input", () => repaint(input));
    // Rotor size moves the RPM limits, so repaint the whole row on change.
    input.addEventListener("change", () => {
      const row = input.closest("tr");
      row?.querySelectorAll(".cell-input").forEach(repaint);
    });
  });
}

// Sends a shift for approval, showing what is being submitted first. Gaps
// are reported rather than blocking: a slot can legitimately have no
// reading, and refusing would strand the shift.
function submitShiftForApproval(recordId, shiftName) {
  const record = pcsGet(recordId);
  const shiftRecord = pcsShiftRecordFor(record, shiftName);

  if (!shiftRecord) {
    alert(
      `${shiftName} has not been opened yet.\n\n` +
        "Open the shift under Shift details and complete its sign-off before sending it for approval — " +
        "the sign-off carries the operator and supervisor names."
    );
    return;
  }

  const missingSignoff = PCS_SHIFT_SIGNOFF_FIELDS.filter((f) => f.required && !shiftRecord[f.key]);
  if (missingSignoff.length) {
    alert(
      `${shiftName} cannot be sent for approval yet.\n\n` +
        `Complete the sign-off first — missing: ${missingSignoff.map((f) => f.label).join(", ")}.`
    );
    return;
  }

  const missing = pcsMissingSlotsForShift(record, shiftName);
  const oos = pcsOutOfSpecForShift(record, shiftName);

  let message = `Send ${shiftName} for approval?\n\n`;
  if (missing.length) {
    message += `${missing.length} of 16 slots have no reading: ${missing
      .slice(0, 6)
      .map((i) => PCS_TIME_SLOTS[i])
      .join(", ")}${missing.length > 6 ? "…" : ""}\n\n`;
  }
  if (oos.length) {
    message += `${oos.length} out-of-spec reading${oos.length === 1 ? "" : "s"} will be signed for as they stand.\n\n`;
  }
  message += "The shift locks for editing once submitted.";

  if (!confirm(message)) return;

  pcsSubmitShift(recordId, shiftName, PCS_SESSION.userid);
  reload(recordId);
}

// Form: one slot at a time, defaulting to the nearest completed slot.
function renderHourlyForm(body, record, nearest) {
  const slot = PCS_FORM_SLOT ?? nearest;
  const entry = pcsHourlyFor(record, slot) || {};
  const locked = pcsHourlyLocked(record, slot);
  const machines = record.machines || [];

  const dieFields = machines
    .map((m) => {
      const running = pcsMachineRunningAt(m, slot);
      const v = (entry.dieTemps || {})[m.id] ?? "";
      if (!running) {
        return `
          <div class="field">
            <label>Die Temp — M/C ${escapeHtml(m.machineNo)}</label>
            <input value="NA" disabled>
            <p class="field-note">Machine not running in this slot.</p>
          </div>`;
      }
      return `
        <div class="field" data-field="die_${m.id}">
          <label>Die Temp — M/C ${escapeHtml(m.machineNo)} <span class="spec-hint">250–350 °C</span></label>
          <input type="number" step="any" data-die="${m.id}" value="${escapeHtml(v)}"${locked ? " disabled" : ""}>
          <p class="field-error"></p>
        </div>`;
    })
    .join("");

  body.innerHTML = `
    <div class="card">
      <div class="field-grid" style="margin-bottom:18px;">
        <div class="field">
          <label>Time slot <span class="spec-hint">defaults to nearest completed</span></label>
          <select id="form-slot">${slotOptions(slot)}</select>
          <p class="field-note">${locked ? "Locked — a later slot has been recorded, or this row is approved." : "Open for entry."}</p>
        </div>
      </div>

      <fieldset class="fieldset"${locked ? " disabled" : ""}>
        <legend>Furnace readings</legend>
        <div class="field-grid" id="hourly-form">
          ${PCS_HOURLY_FIELDS.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
        </div>
      </fieldset>

      <fieldset class="fieldset" style="margin-top:18px;">
        <legend>Die Temp per machine</legend>
        ${machines.length ? `<div class="field-grid">${dieFields}</div>` : `<p class="muted-xs">No machines added yet.</p>`}
      </fieldset>

      <div id="form-alert"></div>
      <div class="btn-row" style="margin-top:18px;">
        <button class="btn" id="save-hourly"${locked ? " disabled" : ""}>Save reading</button>
        ${
          pcsIsLastSlotOfShift(slot) && !locked
            ? `<button class="btn" id="save-send-hourly">Save &amp; Send ${escapeHtml(pcsShiftForSlotIndex(slot))} for Approval</button>`
            : ""
        }
        ${
          entry.id && !entry.approval && pcsCan("action.pcs.approve")
            ? `<button class="btn btn-secondary" data-approve="hourly:${entry.id}">Approve</button>`
            : ""
        }
        ${entry.approval ? approvalBadge(entry) : ""}
      </div>
    </div>`;

  body.querySelector("#form-slot").addEventListener("change", (e) => {
    PCS_FORM_SLOT = Number(e.target.value);
    reload(record.id);
  });

  const form = body.querySelector("#hourly-form");
  if (form && !locked) {
    wireLiveValidation(form, PCS_HOURLY_FIELDS);

    // Die Temp inputs sit outside the generated field grid, so they get
    // the same live check wired directly.
    body.querySelectorAll("[data-die]").forEach((input) => {
      const node = input.closest(".field");
      const check = () => {
        const v = input.value.trim();
        const issue = v === "" ? null : pcsValidate({ dieTemp: v }, [PCS_MACHINE_HOURLY_FIELD]).outOfSpec[0];
        node?.classList.toggle("oos", !!issue);
        const err = node?.querySelector(".field-error");
        if (err) err.textContent = issue ? `Out of spec — ${issue.reason}` : "";
      };
      input.addEventListener("input", check);
      if (input.value !== "") check();
    });
  }

  function saveHourlyForm() {
    const data = readForm(form, PCS_HOURLY_FIELDS);
    const result = paintValidation(form, data, PCS_HOURLY_FIELDS);
    body.querySelector("#form-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return false;

    const dieTemps = { ...(entry.dieTemps || {}) };
    body.querySelectorAll("[data-die]").forEach((input) => {
      const v = input.value.trim();
      if (v === "") delete dieTemps[input.dataset.die];
      else dieTemps[input.dataset.die] = v;
    });

    pcsSaveHourly(record.id, slot, { ...data, dieTemps });
    return true;
  }

  const saveBtn = body.querySelector("#save-hourly");
  if (saveBtn && !locked) {
    saveBtn.addEventListener("click", () => {
      if (saveHourlyForm()) reload(record.id);
    });
  }

  body.querySelector("#save-send-hourly")?.addEventListener("click", () => {
    if (!saveHourlyForm()) return;
    submitShiftForApproval(record.id, pcsShiftForSlotIndex(slot));
  });

  wireApprovalButtons(body, record);
}

// --- shift details (before the hourly readings) -------------------------
// The shift record is one record presented in two parts: the details set up
// when the shift opens, and the sign-off completed when it closes. This is
// the first part.

function renderShiftDetailsSection(panel, record) {
  const archived = pcsIsArchived(record);
  const recorded = [...(record.shifts || [])].sort(
    (a, b) => PCS_SHIFTS.indexOf(a.shift) - PCS_SHIFTS.indexOf(b.shift)
  );
  const remaining = PCS_SHIFTS.filter((s) => !recorded.some((r) => r.shift === s));

  const cards = recorded
    .map((e) => {
      const locked = pcsShiftLocked(record, e);
      const status = pcsShiftStatus(e);
      const issues = pcsValidate(e, PCS_SHIFT_DETAIL_FIELDS).outOfSpec;
      const bad = new Set(issues.map((i) => i.key));

      const details = PCS_SHIFT_DETAIL_FIELDS.filter((f) => f.key !== "shift")
        .map(
          (f) =>
            `<div class="kv ${bad.has(f.key) ? "cell-oos" : ""}">
              <span>${escapeHtml(f.label)}</span><strong>${escapeHtml(e[f.key] ?? "—")}</strong>
            </div>`
        )
        .join("");

      const pins = PCS_CORE_PIN_CAVITIES.map((n) => {
        const val = (e.corePins || {})[n] || "—";
        const cls = val === "NOT OK" ? "pin bad" : val === "OK" ? "pin ok" : "pin";
        return `<span class="${cls}" title="Cavity ${n}: ${val}">${n}</span>`;
      }).join("");

      return `
        <div class="card">
          <h2>
            ${escapeHtml(e.shift)}
            <span class="${status === "approved" ? "ok-badge" : status === "pending" ? "pending-badge" : "archived-badge"}">
              ${escapeHtml(PCS_SHIFT_STATUS_LABEL[status] || status)}
            </span>
            ${issues.length ? `<span class="flag-badge">${issues.length} out of spec</span>` : ""}
          </h2>
          <div class="kv-grid">${details}</div>
          <div class="pin-row"><span class="muted-xs">Core pin verification (cavity 1–10):</span> ${pins}</div>
          <div class="btn-row" style="margin-top:14px;">
            ${
              pcsCan("action.pcs.shift.record") && !locked
                ? `<button class="link-btn" data-edit-detail="${e.id}">Edit details</button>`
                : `<span class="muted-xs">${
                    archived
                      ? "Archived — read-only."
                      : locked
                      ? "Locked — this shift has closed."
                      : "No permission to amend."
                  }</span>`
            }
            ${
              pcsCan("action.pcs.shift.delete") && !locked && status === PCS_SHIFT_STATUS.DRAFT
                ? `<button class="link-btn danger" data-del-shift="${e.id}">Remove shift</button>`
                : ""
            }
          </div>
        </div>`;
    })
    .join("");

  panel.innerHTML = `
    <details class="sheet-block" open>
      <summary>
        <h2>Shift details</h2>
        <span class="muted-xs">Opened at the start of the shift — alloy in use and die-preparation startup checks</span>
      </summary>
      <div class="btn-row" style="margin:0 0 14px;">
        ${
          pcsCan("action.pcs.shift.record") && remaining.length && !archived
            ? `<button class="btn" id="open-shift">+ Open shift</button>`
            : ""
        }
        <span class="muted-xs">${recorded.length} of ${PCS_SHIFTS.length} shifts opened</span>
      </div>
      ${
        recorded.length
          ? `<div class="cards">${cards}</div>`
          : `<div class="card"><p>No shift opened yet. Open a shift before recording hourly readings against it.</p></div>`
      }
    </details>`;

  panel.querySelector("#open-shift")?.addEventListener("click", () =>
    openShiftDetailModal(record, null, remaining)
  );
  panel.querySelectorAll("[data-edit-detail]").forEach((b) =>
    b.addEventListener("click", () => openShiftDetailModal(record, b.dataset.editDetail, remaining))
  );
  panel.querySelectorAll("[data-del-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Remove this shift? Only a shift still in draft can be removed; its hourly readings are not affected.")) return;
      pcsDeleteChild(record.id, "shifts", b.dataset.delShift);
      reload(record.id);
    })
  );
}

function openShiftDetailModal(record, shiftId, remaining) {
  const existing = shiftId ? (record.shifts || []).find((s) => s.id === shiftId) : null;
  const entry = existing || {};

  // An existing record keeps its own shift; a new one may only take a shift
  // not already opened, so a shift cannot be recorded twice.
  const shiftField = {
    ...PCS_SHIFT_DETAIL_FIELDS[0],
    options: existing ? [existing.shift] : remaining,
  };
  const fields = [shiftField, ...PCS_SHIFT_DETAIL_FIELDS.slice(1)];

  const corePinHtml = `
    <div class="field core-pin-field">
      <label>Core Pin Verification — cavity 1–10</label>
      <div class="pin-inputs">
        ${PCS_CORE_PIN_CAVITIES.map(
          (n) => `
          <label class="pin-input">
            <span>${n}</span>
            <select data-pin="${n}">
              <option value="">—</option>
              <option value="OK"${(entry.corePins || {})[n] === "OK" ? " selected" : ""}>OK</option>
              <option value="NOT OK"${(entry.corePins || {})[n] === "NOT OK" ? " selected" : ""}>NOT OK</option>
            </select>
          </label>`
        ).join("")}
      </div>
    </div>`;

  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <h2>${shiftId ? "Edit" : "Open"} shift details</h2>
        <div class="field-grid" id="shift-detail-form">
          ${fields.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
          ${corePinHtml}
        </div>
        <div id="shift-detail-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-shift-detail">Save</button>
          <button class="btn btn-secondary" id="cancel-shift-detail">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const form = modal.querySelector("#shift-detail-form");
  wireLiveValidation(form, fields);

  modal.querySelector("#cancel-shift-detail").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#save-shift-detail").addEventListener("click", () => {
    const data = readForm(form, fields);
    data.corePins = {};
    form.querySelectorAll("[data-pin]").forEach((sel) => {
      if (sel.value) data.corePins[sel.dataset.pin] = sel.value;
    });

    const result = paintValidation(form, data, fields);
    modal.querySelector("#shift-detail-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    if (shiftId) pcsUpdateChild(record.id, "shifts", shiftId, data);
    else pcsAddChild(record.id, "shifts", { ...data, status: PCS_SHIFT_STATUS.DRAFT, approval: null });

    modal.remove();
    reload(record.id);
  });
}

// --- shift sign-off (after the hourly readings) -------------------------

function renderShiftSignoffSection(panel, record) {
  const archived = pcsIsArchived(record);
  const recorded = [...(record.shifts || [])].sort(
    (a, b) => PCS_SHIFTS.indexOf(a.shift) - PCS_SHIFTS.indexOf(b.shift)
  );

  const cards = recorded
    .map((e) => {
      const status = pcsShiftStatus(e);
      const locked = pcsShiftLocked(record, e);
      const autoRemarks = pcsMachineRemarksForShift(record, e.shift);
      const oos = pcsOutOfSpecForShift(record, e.shift);

      const signoffValues = PCS_SHIFT_SIGNOFF_FIELDS.map(
        (f) => `<div class="kv"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(e[f.key] ?? "—")}</strong></div>`
      ).join("");

      // Machine changes during the shift are derived from each machine's
      // running window, so the remark always matches the sheet.
      const remarksHtml = autoRemarks.length
        ? autoRemarks
            .map(
              (r) =>
                `<div class="remark-auto"><span class="remark-tag">Auto</span><span>${escapeHtml(r.text)}</span></div>`
            )
            .join("")
        : `<p class="muted-xs">No machine was added or stopped during this shift.</p>`;

      const oosHtml = oos.length
        ? `<div class="alert alert-danger" style="margin-top:12px;">
             <p><strong>${oos.length} out-of-spec reading${oos.length === 1 ? "" : "s"} recorded during this shift.</strong>
             These are being signed for as they stand.</p>
             <ul class="oos-summary">
               ${oos
                 .map(
                   (i) =>
                     `<li><strong>${escapeHtml(i.timeSlot)}</strong> — ${escapeHtml(i.label)}: ${escapeHtml(i.value)} (${escapeHtml(i.reason)})</li>`
                 )
                 .join("")}
             </ul>
           </div>`
        : `<div class="alert alert-ok" style="margin-top:12px;">No out-of-spec readings recorded during this shift.</div>`;

      const canSign = pcsCan("action.pcs.shift.record") && !archived && status === PCS_SHIFT_STATUS.DRAFT;

      return `
        <div class="card">
          <h2>
            ${escapeHtml(e.shift)} sign-off
            <span class="${status === "approved" ? "ok-badge" : status === "pending" ? "pending-badge" : "archived-badge"}">
              ${escapeHtml(PCS_SHIFT_STATUS_LABEL[status] || status)}
            </span>
          </h2>

          ${
            e.submittedAt
              ? `<p class="muted-xs">Submitted by ${escapeHtml(e.submittedBy || "—")} on ${escapeHtml(new Date(e.submittedAt).toLocaleString())}.</p>`
              : ""
          }
          ${e.approval ? `<p class="muted-xs">Approved by ${escapeHtml(e.approval.by)} on ${escapeHtml(new Date(e.approval.at).toLocaleString())}.</p>` : ""}

          <div class="kv-grid" style="margin-top:10px;">${signoffValues}</div>

          <h3 style="font-size:13px;margin:14px 0 8px;">Machine changes during this shift</h3>
          ${remarksHtml}

          ${oosHtml}

          <div class="btn-row" style="margin-top:14px;">
            ${canSign ? `<button class="link-btn" data-edit-signoff="${e.id}">Complete sign-off</button>` : ""}
            ${
              status === PCS_SHIFT_STATUS.PENDING && pcsCan("action.pcs.approve")
                ? `<button class="link-btn" data-approve="shifts:${e.id}">Approve shift</button>`
                : ""
            }
            ${
              status !== PCS_SHIFT_STATUS.DRAFT && pcsCan("action.pcs.unapprove") && !archived
                ? `<button class="link-btn" data-reopen-shift="${escapeHtml(e.shift)}">Reopen</button>`
                : ""
            }
          </div>
        </div>`;
    })
    .join("");

  panel.innerHTML = `
    <details class="sheet-block" open>
      <summary>
        <h2>Shift sign-off</h2>
        <span class="muted-xs">Completed at the end of the shift — signatures, machine changes and the exceptions being signed for</span>
      </summary>
      ${
        recorded.length
          ? `<div class="cards">${cards}</div>`
          : `<div class="card"><p>No shift opened yet. Shift sign-off appears once a shift has been opened above.</p></div>`
      }
    </details>`;

  panel.querySelectorAll("[data-edit-signoff]").forEach((b) =>
    b.addEventListener("click", () => openSignoffModal(record, b.dataset.editSignoff))
  );
  panel.querySelectorAll("[data-reopen-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm(`Reopen ${b.dataset.reopenShift} for editing? This withdraws its submission or approval.`)) return;
      pcsReopenShift(record.id, b.dataset.reopenShift);
      reload(record.id);
    })
  );
  wireApprovalButtons(panel, record);
}

function openSignoffModal(record, shiftId) {
  const entry = (record.shifts || []).find((s) => s.id === shiftId) || {};
  const autoRemarks = pcsMachineRemarksForShift(record, entry.shift);
  const oos = pcsOutOfSpecForShift(record, entry.shift);

  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <h2>${escapeHtml(entry.shift || "")} sign-off</h2>

        ${
          autoRemarks.length
            ? `<div style="margin-bottom:16px;">
                 <label style="display:block;font-size:11.5px;text-transform:uppercase;letter-spacing:0.8px;color:var(--content-mute);margin-bottom:6px;">
                   Machine changes during this shift — recorded automatically
                 </label>
                 ${autoRemarks
                   .map(
                     (r) =>
                       `<div class="remark-auto"><span class="remark-tag">Auto</span><span>${escapeHtml(r.text)}</span></div>`
                   )
                   .join("")}
               </div>`
            : ""
        }

        ${
          oos.length
            ? `<div class="alert alert-danger" style="margin-top:0;margin-bottom:16px;">
                 <p><strong>You are signing for ${oos.length} out-of-spec reading${oos.length === 1 ? "" : "s"}.</strong></p>
                 <ul class="oos-summary">
                   ${oos
                     .map(
                       (i) =>
                         `<li><strong>${escapeHtml(i.timeSlot)}</strong> — ${escapeHtml(i.label)}: ${escapeHtml(i.value)} (${escapeHtml(i.reason)})</li>`
                     )
                     .join("")}
                 </ul>
               </div>`
            : ""
        }

        <div class="field-grid" id="signoff-form">
          ${PCS_SHIFT_SIGNOFF_FIELDS.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
        </div>
        <div id="signoff-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-signoff">Save sign-off</button>
          <button class="btn btn-secondary" id="cancel-signoff">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const form = modal.querySelector("#signoff-form");
  wireLiveValidation(form, PCS_SHIFT_SIGNOFF_FIELDS);

  modal.querySelector("#cancel-signoff").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#save-signoff").addEventListener("click", () => {
    const data = readForm(form, PCS_SHIFT_SIGNOFF_FIELDS);
    const result = paintValidation(form, data, PCS_SHIFT_SIGNOFF_FIELDS);
    modal.querySelector("#signoff-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    // The generated remarks are stored with the record so the sheet remains
    // readable if a machine window is later corrected.
    pcsUpdateChild(record.id, "shifts", shiftId, {
      ...data,
      machineRemarks: autoRemarks,
      outOfSpecAtSignoff: oos.length,
    });
    modal.remove();
    reload(record.id);
  });
}

// ---------- router ------------------------------------------------------

function pcsRoute() {
  const root = document.getElementById("pcs-root");
  const hash = window.location.hash || "#/";

  if (hash === "#/new") renderNew(root);
  else if (hash.startsWith("#/sheet/")) renderSheet(root, hash.slice("#/sheet/".length));
  else renderList(root);
}

document.addEventListener("DOMContentLoaded", () => {
  PCS_SESSION = renderTopbar("production-records");
  if (!PCS_SESSION) return;
  if (!rbacRequirePage(PCS_SESSION, "page.process_check_sheet")) return;
  pcsRoute();
  window.addEventListener("hashchange", () => {
    PCS_FORM_SLOT = null;
    pcsRoute();
  });
});
