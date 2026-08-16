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
    input = `<input type="${field.type}" data-key="${field.key}" value="${escapeHtml(v)}"${step}>`;
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
  const records = pcsLoadAll().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const rows = records
    .map((r) => {
      const flags = pcsOutOfSpecCount(r);
      const pending = pcsPendingApprovalCount(r);
      return `
        <tr>
          <td><a href="#/sheet/${r.id}">${escapeHtml(r.date || "—")}</a></td>
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
        ${flags ? `<span class="flag-badge">${flags} out of spec</span>` : `<span class="ok-badge">In spec</span>`}
        ${pending ? `<span class="pending-badge">${pending} pending approval</span>` : `<span class="ok-badge">All approved</span>`}
      </div>
    </div>

    <section class="sheet-section" id="sec-header"></section>
    <section class="sheet-section" id="sec-machines"></section>
    <section class="sheet-section" id="sec-hourly"></section>
    <section class="sheet-section" id="sec-shifts"></section>`;

  renderHeaderSection(root.querySelector("#sec-header"), record);
  renderMachinesSection(root.querySelector("#sec-machines"), record);
  renderHourlySection(root.querySelector("#sec-hourly"), record);
  renderShiftsSection(root.querySelector("#sec-shifts"), record);
}

// --- header -------------------------------------------------------------

function renderHeaderSection(panel, record) {
  panel.innerHTML = `
    <details class="sheet-block">
      <summary><h2>Day details</h2><span class="muted-xs">Header — recorded once for the day</span></summary>
      <div class="card">
        <div class="field-grid" id="daily-edit">
          ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, record[f.key], record)).join("")}
        </div>
        <div id="daily-edit-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          ${pcsCan("action.pcs.sheet.edit") ? '<button class="btn" id="update-daily">Save day details</button>' : ""}
          ${pcsCan("action.pcs.sheet.delete") ? '<button class="btn btn-danger" id="delete-daily">Delete day sheet</button>' : ""}
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

  panel.querySelector("#delete-daily")?.addEventListener("click", () => {
    if (!confirm("Delete this day sheet and all its machines, hourly readings and shift records?")) return;
    pcsDeleteDaily(record.id);
    window.location.hash = "#/";
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
      if (locked) {
        return `<td class="${issues.has(f.key) ? "cell-bad" : ""}">${escapeHtml(v === "" ? "—" : v)}</td>`;
      }
      if (f.type === "select") {
        const opts = f.options
          .map((o) => `<option value="${escapeHtml(o)}"${String(v) === String(o) ? " selected" : ""}>${escapeHtml(o)}</option>`)
          .join("");
        return `<td><select class="cell-input" data-slot="${i}" data-key="${f.key}"><option value="">—</option>${opts}</select></td>`;
      }
      const step = f.step ? ` step="${f.step}"` : ' step="any"';
      return `<td><input class="cell-input${issues.has(f.key) ? " cell-bad" : ""}" type="number" data-slot="${i}" data-key="${f.key}" value="${escapeHtml(v)}"${step}></td>`;
    }).join("");

    const dieCells = machines
      .map((m) => {
        if (!pcsMachineRunningAt(m, i)) return `<td class="cell-na">NA</td>`;
        const v = (entry.dieTemps || {})[m.id] ?? "";
        const bad = v !== "" && pcsValidate({ dieTemp: v }, [PCS_MACHINE_HOURLY_FIELD]).outOfSpec.length;
        if (locked) return `<td class="${bad ? "cell-bad" : ""}">${escapeHtml(v === "" ? "—" : v)}</td>`;
        return `<td><input class="cell-input${bad ? " cell-bad" : ""}" type="number" data-slot="${i}" data-die="${m.id}" value="${escapeHtml(v)}" step="any"></td>`;
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

  body.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px;">
      ${pcsCan("action.pcs.hourly.record") ? '<button class="btn" id="save-matrix">Save changes</button>' : '<span class="muted-xs">Read-only — recording hourly readings is not permitted for your role.</span>'}
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

  body.querySelector("#save-matrix")?.addEventListener("click", () => {
    const bySlot = {};
    body.querySelectorAll(".cell-input").forEach((input) => {
      const slot = Number(input.dataset.slot);
      bySlot[slot] = bySlot[slot] || { fields: {}, dieTemps: {} };
      const value = input.value.trim();
      if (input.dataset.die) bySlot[slot].dieTemps[input.dataset.die] = value;
      else bySlot[slot].fields[input.dataset.key] = value;
    });

    const allIssues = [];
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
        allIssues.push(
          ...pcsValidate(fields, PCS_HOURLY_FIELDS).outOfSpec.map((x) => ({
            ...x,
            label: `${PCS_TIME_SLOTS[slot]} — ${x.label}`,
          }))
        );
      });

    if (!saved) {
      body.querySelector("#matrix-alert").innerHTML =
        `<div class="alert alert-ok">Nothing to save — no values entered.</div>`;
      return;
    }
    reload(record.id);
  });

  wireApprovalButtons(body, record);
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

  const saveBtn = body.querySelector("#save-hourly");
  if (saveBtn && !locked) {
    saveBtn.addEventListener("click", () => {
      const form = body.querySelector("#hourly-form");
      const data = readForm(form, PCS_HOURLY_FIELDS);
      const result = paintValidation(form, data, PCS_HOURLY_FIELDS);
      body.querySelector("#form-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
      if (result.missing.length) return;

      const dieTemps = { ...(entry.dieTemps || {}) };
      body.querySelectorAll("[data-die]").forEach((input) => {
        const v = input.value.trim();
        if (v === "") delete dieTemps[input.dataset.die];
        else dieTemps[input.dataset.die] = v;
      });

      pcsSaveHourly(record.id, slot, { ...data, dieTemps });
      reload(record.id);
    });
  }

  wireApprovalButtons(body, record);
}

// --- shifts -------------------------------------------------------------

function renderShiftsSection(panel, record) {
  const entries = [...(record.shifts || [])].sort(
    (a, b) => PCS_SHIFTS.indexOf(a.shift) - PCS_SHIFTS.indexOf(b.shift)
  );

  const cards = entries
    .map((e) => {
      const issues = pcsValidate(e, PCS_SHIFT_FIELDS).outOfSpec;
      const bad = new Set(issues.map((i) => i.key));
      const details = PCS_SHIFT_FIELDS.filter((f) => f.key !== "shift")
        .map(
          (f) =>
            `<div class="kv ${bad.has(f.key) ? "cell-bad" : ""}">
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
          <h2>${escapeHtml(e.shift)} ${issues.length ? `<span class="flag-badge">${issues.length} out of spec</span>` : ""} ${approvalBadge(e)}</h2>
          <div class="kv-grid">${details}</div>
          <div class="pin-row"><span class="muted-xs">Core pin verification (cavity 1–10):</span> ${pins}</div>
          <div class="btn-row" style="margin-top:14px;">
            ${pcsCan("action.pcs.shift.record") ? `<button class="link-btn" data-edit-shift="${e.id}">Edit</button>` : ""}
            ${
              e.approval
                ? pcsCan("action.pcs.unapprove")
                  ? `<button class="link-btn" data-unapprove="shifts:${e.id}">Unapprove</button>`
                  : ""
                : pcsCan("action.pcs.approve")
                ? `<button class="link-btn" data-approve="shifts:${e.id}">Approve</button>`
                : ""
            }
            ${pcsCan("action.pcs.shift.delete") ? `<button class="link-btn danger" data-del-shift="${e.id}">Delete</button>` : ""}
          </div>
        </div>`;
    })
    .join("");

  panel.innerHTML = `
    <details class="sheet-block" open>
      <summary><h2>Shift sign-off</h2><span class="muted-xs">${entries.length} of 3 shifts recorded</span></summary>
      <div class="btn-row" style="margin:0 0 14px;">
        ${pcsCan("action.pcs.shift.record") ? '<button class="btn" id="add-shift">+ Add shift entry</button>' : ""}
      </div>
      ${entries.length ? `<div class="cards">${cards}</div>` : `<div class="card"><p>No shift entries recorded yet.</p></div>`}
    </details>`;

  panel.querySelector("#add-shift")?.addEventListener("click", () => openShiftModal(record, null));
  panel.querySelectorAll("[data-edit-shift]").forEach((b) =>
    b.addEventListener("click", () => openShiftModal(record, b.dataset.editShift))
  );
  panel.querySelectorAll("[data-del-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this shift entry?")) return;
      pcsDeleteChild(record.id, "shifts", b.dataset.delShift);
      reload(record.id);
    })
  );
  wireApprovalButtons(panel, record);
}

function openShiftModal(record, shiftId) {
  const existing = shiftId ? (record.shifts || []).find((s) => s.id === shiftId) : null;
  const entry = existing || {};

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
        <h2>${shiftId ? "Edit" : "Add"} shift entry</h2>
        <div class="field-grid" id="shift-form">
          ${PCS_SHIFT_FIELDS.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
          ${corePinHtml}
        </div>
        <div id="shift-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-shift">Save</button>
          <button class="btn btn-secondary" id="cancel-shift">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);
  const form = modal.querySelector("#shift-form");

  modal.querySelector("#cancel-shift").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#save-shift").addEventListener("click", () => {
    const data = readForm(form, PCS_SHIFT_FIELDS);
    data.corePins = {};
    form.querySelectorAll("[data-pin]").forEach((sel) => {
      if (sel.value) data.corePins[sel.dataset.pin] = sel.value;
    });

    const result = paintValidation(form, data, PCS_SHIFT_FIELDS);
    modal.querySelector("#shift-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    if (shiftId) pcsUpdateChild(record.id, "shifts", shiftId, data);
    else pcsAddChild(record.id, "shifts", { ...data, approval: null });

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
