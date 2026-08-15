// Process Check Sheet — UI.
//
// Three views, routed off the URL hash:
//   #/            list of daily check sheets
//   #/new         create a daily (parent) record
//   #/record/:id  one daily record + its hourly and shift child entries

let PCS_SESSION = null;

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

// Paints per-field errors and returns the validation result.
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
      pending the Supabase work in BACKLOG.md. For now the flag shows here and
      in the check sheet list.</p>
    </div>`;
}

// ---------- list view ---------------------------------------------------

function renderList(root) {
  const records = pcsLoadAll().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const rows = records
    .map((r) => {
      const flags = pcsOutOfSpecCount(r);
      return `
        <tr>
          <td><a href="#/record/${r.id}">${escapeHtml(r.date || "—")}</a></td>
          <td>${escapeHtml(r.line || "—")}</td>
          <td>${escapeHtml(r.machineNo || "—")}</td>
          <td>${escapeHtml(r.furnaceNo || "—")}</td>
          <td>${(r.hourly || []).length}</td>
          <td>${(r.shifts || []).length} / 3</td>
          <td>${flags ? `<span class="flag-badge">${flags} out of spec</span>` : `<span class="ok-badge">In spec</span>`}</td>
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <p class="breadcrumb"><a href="production-records.html">Production Records</a> / Process Check Sheet</p>
    <h1>Process Check Sheet</h1>
    <p class="subtitle">
      QC FMT 038 · Line — Mando Model Line. Each daily sheet is the parent record;
      hourly readings and per-shift sign-offs are entered against it.
    </p>

    <div class="btn-row" style="margin-bottom:22px;">
      <a class="btn" href="#/new">+ New Check Sheet</a>
    </div>

    ${
      records.length
        ? `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Line</th><th>M/C No.</th><th>Furnace</th>
                  <th>Hourly entries</th><th>Shifts</th><th>Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : `<div class="card"><p>No check sheets yet. Create one to start recording.</p></div>`
    }`;
}

// ---------- new daily record -------------------------------------------

function renderNew(root) {
  root.innerHTML = `
    <p class="breadcrumb"><a href="#/">Process Check Sheet</a> / New</p>
    <h1>New Check Sheet</h1>
    <p class="subtitle">Daily once data — entered at the start of the day, shared by every hourly reading and shift below it.</p>
    <div class="card">
      <div class="field-grid" id="daily-form">
        ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, "", {})).join("")}
      </div>
      <div id="daily-alert"></div>
      <div class="btn-row" style="margin-top:20px;">
        <button class="btn" id="save-daily">Create Check Sheet</button>
        <a class="btn btn-secondary" href="#/">Cancel</a>
      </div>
    </div>`;

  const form = document.getElementById("daily-form");
  document.getElementById("save-daily").addEventListener("click", () => {
    const entry = readForm(form, PCS_DAILY_FIELDS);
    const result = paintValidation(form, entry, PCS_DAILY_FIELDS);
    document.getElementById("daily-alert").innerHTML = outOfSpecBanner(result.outOfSpec);

    if (result.missing.length) return; // required fields must be filled

    const record = pcsCreateDaily(entry, PCS_SESSION.userid);
    window.location.hash = `#/record/${record.id}`;
  });
}

// ---------- record detail ----------------------------------------------

function renderRecord(root, id) {
  const record = pcsGet(id);
  if (!record) {
    root.innerHTML = `<div class="card"><p>Check sheet not found. <a href="#/">Back to list</a></p></div>`;
    return;
  }

  root.innerHTML = `
    <p class="breadcrumb"><a href="#/">Process Check Sheet</a> / ${escapeHtml(record.date || "")}</p>
    <h1>Check Sheet — ${escapeHtml(record.date || "")} · Line ${escapeHtml(record.line || "")}</h1>
    <p class="subtitle">M/C ${escapeHtml(record.machineNo || "—")} · Furnace ${escapeHtml(record.furnaceNo || "—")} · ${escapeHtml(record.metalGrade || "")}</p>

    <div class="tabs">
      <button class="tab active" data-tab="daily">Daily once</button>
      <button class="tab" data-tab="hourly">Hourly (${(record.hourly || []).length})</button>
      <button class="tab" data-tab="shift">Shift once (${(record.shifts || []).length}/3)</button>
    </div>

    <section class="tab-panel" data-panel="daily"></section>
    <section class="tab-panel" data-panel="hourly" hidden></section>
    <section class="tab-panel" data-panel="shift" hidden></section>`;

  root.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      root.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      root.querySelectorAll(".tab-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== tab.dataset.tab;
      });
    });
  });

  renderDailyPanel(root.querySelector('[data-panel="daily"]'), record);
  renderHourlyPanel(root.querySelector('[data-panel="hourly"]'), record);
  renderShiftPanel(root.querySelector('[data-panel="shift"]'), record);
}

function renderDailyPanel(panel, record) {
  panel.innerHTML = `
    <div class="card">
      <div class="field-grid" id="daily-edit">
        ${PCS_DAILY_FIELDS.map((f) => fieldInputHtml(f, record[f.key], record)).join("")}
      </div>
      <div id="daily-edit-alert"></div>
      <div class="btn-row" style="margin-top:20px;">
        <button class="btn" id="update-daily">Save changes</button>
        <button class="btn btn-danger" id="delete-daily">Delete sheet</button>
      </div>
    </div>`;

  const form = panel.querySelector("#daily-edit");
  panel.querySelector("#update-daily").addEventListener("click", () => {
    const entry = readForm(form, PCS_DAILY_FIELDS);
    const result = paintValidation(form, entry, PCS_DAILY_FIELDS);
    panel.querySelector("#daily-edit-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;
    pcsUpdateDaily(record.id, entry);
    panel.querySelector("#daily-edit-alert").insertAdjacentHTML(
      "afterbegin",
      `<div class="alert alert-ok">Saved.</div>`
    );
  });

  panel.querySelector("#delete-daily").addEventListener("click", () => {
    if (!confirm("Delete this check sheet and all its hourly and shift entries?")) return;
    pcsDeleteDaily(record.id);
    window.location.hash = "#/";
  });
}

// --- hourly -------------------------------------------------------------

function renderHourlyPanel(panel, record) {
  const entries = [...(record.hourly || [])].sort(
    (a, b) => PCS_HOURLY_FIELDS[0].options.indexOf(a.timeSlot) - PCS_HOURLY_FIELDS[0].options.indexOf(b.timeSlot)
  );

  const cols = PCS_HOURLY_FIELDS.filter((f) => f.key !== "timeSlot");
  const rows = entries
    .map((e) => {
      const issues = pcsValidate(e, PCS_HOURLY_FIELDS).outOfSpec;
      const badKeys = new Set(issues.map((i) => i.key));
      const cells = cols
        .map((c) => `<td class="${badKeys.has(c.key) ? "cell-bad" : ""}">${escapeHtml(e[c.key] ?? "—")}</td>`)
        .join("");
      const slotIndex = PCS_HOURLY_FIELDS[0].options.indexOf(e.timeSlot);
      return `
        <tr>
          <td><strong>${escapeHtml(e.timeSlot)}</strong><br><span class="muted-xs">${escapeHtml(pcsShiftForSlotIndex(slotIndex))}</span></td>
          ${cells}
          <td><button class="link-btn" data-edit-hourly="${e.id}">Edit</button>
              <button class="link-btn danger" data-del-hourly="${e.id}">Delete</button></td>
        </tr>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn" id="add-hourly">+ Add hourly reading</button>
      <span class="muted-xs">30-minute slots, 6.30am → 6.00am across three shifts.</span>
    </div>
    ${
      entries.length
        ? `<div class="table-wrap">
            <table class="dense">
              <thead><tr><th>Time</th>${cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}<th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : `<div class="card"><p>No hourly readings recorded yet.</p></div>`
    }`;

  panel.querySelector("#add-hourly").addEventListener("click", () => openChildModal(record, "hourly", null));
  panel.querySelectorAll("[data-edit-hourly]").forEach((b) =>
    b.addEventListener("click", () => openChildModal(record, "hourly", b.dataset.editHourly))
  );
  panel.querySelectorAll("[data-del-hourly]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this hourly reading?")) return;
      pcsDeleteChild(record.id, "hourly", b.dataset.delHourly);
      renderRecord(document.getElementById("pcs-root"), record.id);
    })
  );
}

// --- shift --------------------------------------------------------------

function renderShiftPanel(panel, record) {
  const entries = [...(record.shifts || [])].sort(
    (a, b) => PCS_SHIFTS.indexOf(a.shift) - PCS_SHIFTS.indexOf(b.shift)
  );

  const cards = entries
    .map((e) => {
      const issues = pcsValidate(e, PCS_SHIFT_FIELDS).outOfSpec;
      const badKeys = new Set(issues.map((i) => i.key));
      const details = PCS_SHIFT_FIELDS.filter((f) => f.key !== "shift")
        .map(
          (f) =>
            `<div class="kv ${badKeys.has(f.key) ? "cell-bad" : ""}">
              <span>${escapeHtml(f.label)}</span><strong>${escapeHtml(e[f.key] ?? "—")}</strong>
            </div>`
        )
        .join("");

      const pins = PCS_CORE_PIN_CAVITIES.map((n) => {
        const val = (e.corePins || {})[n] || "—";
        const cls = val === "NOT OK" ? "pin bad" : val === "OK" ? "pin ok" : "pin";
        return `<span class="${cls}" title="Cavity ${n}">${n}</span>`;
      }).join("");

      return `
        <div class="card">
          <h2>${escapeHtml(e.shift)} ${issues.length ? `<span class="flag-badge">${issues.length} out of spec</span>` : ""}</h2>
          <div class="kv-grid">${details}</div>
          <div class="pin-row"><span class="muted-xs">Core pin verification (cavity 1–10):</span> ${pins}</div>
          <div class="btn-row" style="margin-top:14px;">
            <button class="link-btn" data-edit-shift="${e.id}">Edit</button>
            <button class="link-btn danger" data-del-shift="${e.id}">Delete</button>
          </div>
        </div>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn" id="add-shift">+ Add shift entry</button>
      <span class="muted-xs">Three submissions per day, one per shift supervisor.</span>
    </div>
    ${entries.length ? `<div class="cards">${cards}</div>` : `<div class="card"><p>No shift entries recorded yet.</p></div>`}`;

  panel.querySelector("#add-shift").addEventListener("click", () => openChildModal(record, "shifts", null));
  panel.querySelectorAll("[data-edit-shift]").forEach((b) =>
    b.addEventListener("click", () => openChildModal(record, "shifts", b.dataset.editShift))
  );
  panel.querySelectorAll("[data-del-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this shift entry?")) return;
      pcsDeleteChild(record.id, "shifts", b.dataset.delShift);
      renderRecord(document.getElementById("pcs-root"), record.id);
    })
  );
}

// --- add/edit modal for child entries -----------------------------------

function openChildModal(record, kind, childId) {
  const fields = kind === "hourly" ? PCS_HOURLY_FIELDS : PCS_SHIFT_FIELDS;
  const existing = childId ? (record[kind] || []).find((c) => c.id === childId) : {};
  const entry = existing || {};
  const title = kind === "hourly" ? "Hourly reading" : "Shift entry";

  const corePinHtml =
    kind === "shifts"
      ? `<div class="field core-pin-field">
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
        </div>`
      : "";

  const modal = el(`
    <div class="modal-backdrop">
      <div class="modal">
        <h2>${childId ? "Edit" : "Add"} ${title}</h2>
        <div class="field-grid" id="child-form">
          ${fields.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
          ${corePinHtml}
        </div>
        <div id="child-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-child">Save</button>
          <button class="btn btn-secondary" id="cancel-child">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(modal);

  const form = modal.querySelector("#child-form");

  // Rotor RPM's valid band depends on rotor size — refresh the hint live.
  const rotorSelect = form.querySelector('[data-key="rotorSize"]');
  if (rotorSelect) {
    rotorSelect.addEventListener("change", () => {
      const current = readForm(form, fields);
      const rpmField = PCS_HOURLY_FIELDS.find((f) => f.key === "rotorRpm");
      const hint = form.querySelector('.field[data-field="rotorRpm"] .spec-hint');
      if (hint) hint.textContent = pcsSpecHint(rpmField, current);
    });
  }

  modal.querySelector("#cancel-child").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector("#save-child").addEventListener("click", () => {
    const data = readForm(form, fields);

    if (kind === "shifts") {
      data.corePins = {};
      form.querySelectorAll("[data-pin]").forEach((sel) => {
        if (sel.value) data.corePins[sel.dataset.pin] = sel.value;
      });
    }

    const result = paintValidation(form, data, fields);
    modal.querySelector("#child-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    if (childId) pcsUpdateChild(record.id, kind, childId, data);
    else pcsAddChild(record.id, kind, data);

    modal.remove();
    renderRecord(document.getElementById("pcs-root"), record.id);
  });
}

// ---------- router ------------------------------------------------------

function pcsRoute() {
  const root = document.getElementById("pcs-root");
  const hash = window.location.hash || "#/";

  if (hash === "#/new") renderNew(root);
  else if (hash.startsWith("#/record/")) renderRecord(root, hash.slice("#/record/".length));
  else renderList(root);
}

document.addEventListener("DOMContentLoaded", () => {
  PCS_SESSION = renderTopbar("production-records");
  if (!PCS_SESSION) return;
  pcsRoute();
  window.addEventListener("hashchange", pcsRoute);
});
