// Process Check Sheet — UI.
//
// One working view: the Day Sheet. Every child table (machines, hourly
// readings, shift sign-offs) is added, edited and approved from there.
// The list exists only to pick or create a day.
//
//   #/            day sheets, to pick or create
//   #/new         create a day sheet
//   #/sheet/:id   the Day Sheet — the single working view
//   #/print/:id   printable view of a day sheet (QC FMT 038)
//
// This file holds shared state, helpers, and the router.
// Section renderers live in pcs-list.js, pcs-sheet.js, pcs-hourly.js
// and pcs-shift.js — loaded after this file.

let PCS_SESSION = null;

// Hourly entry offers two layouts so the better one can be chosen in use:
// "matrix" edits many slots at once, "form" edits one slot at a time.
const PCS_HOURLY_MODE_KEY = "bestcast_pcs_hourly_mode";
let PCS_HOURLY_MODE = localStorage.getItem(PCS_HOURLY_MODE_KEY) || "matrix";
let PCS_SHOW_ALL_SLOTS = false;
let PCS_SHOW_ARCHIVED = false;
// Which shift the matrix is scoped to; null follows the shift in progress.
let PCS_MATRIX_SHIFT = null;
let PCS_FORM_SLOT = null;
// One-shot confirmation shown after a reading is saved, since the form
// then moves on to the next slot and the save would otherwise be silent.
let PCS_FORM_FLASH = null;

// ---------- helpers -----------------------------------------------------

// esc() and el() live in util.js — loaded before this file.
const escapeHtml = esc;

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

function paintFieldOutOfSpec(fieldNode, field, entry) {
  if (!fieldNode) return;

  if (field.dynamicRange) {
    const hint = fieldNode.querySelector(".spec-hint");
    if (hint) hint.textContent = pcsSpecHint(field, entry);
  }

  const issue = pcsValidate(entry, [field]).outOfSpec[0];
  fieldNode.classList.toggle("oos", !!issue);
  const err = fieldNode.querySelector(".field-error");
  if (err) err.textContent = issue ? `Out of spec — ${issue.reason}` : "";
}

function wireLiveValidation(container, fields) {
  fields.forEach((field) => {
    const node = container.querySelector(`.field[data-field="${field.key}"]`);
    const input = node?.querySelector(`[data-key="${field.key}"]`);
    if (!input) return;

    const check = () => {
      const entry = readForm(container, fields);
      paintFieldOutOfSpec(node, field, entry);
    };

    input.addEventListener("input", check);
    input.addEventListener("change", () => {
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

// ---------- test data generation (fixture) ------------------------------

let PCS_DEMO_MODE = "in-spec";

function pcsDemoControls(label, id) {
  if (!pcsCan("action.pcs.demo.fill")) return "";
  return `
    <span class="demo-controls">
      <span class="demo-tag">Test data</span>
      <button class="btn btn-secondary" data-demo="${id}">Fill ${escapeHtml(label)}</button>
    </span>`;
}

function pcsDemoModePicker() {
  if (!pcsCan("action.pcs.demo.fill")) return "";
  return `
    <div class="demo-bar">
      <span class="demo-tag">Test data</span>
      <label class="shift-picker">
        <span class="muted-xs">Mode</span>
        <select id="demo-mode">
          <option value="in-spec"${PCS_DEMO_MODE === "in-spec" ? " selected" : ""}>In spec only</option>
          <option value="occasional"${PCS_DEMO_MODE === "occasional" ? " selected" : ""}>Occasional out of spec</option>
        </select>
      </label>
      <button class="btn btn-secondary" data-demo="hourly">Fill this shift's readings</button>
      <button class="btn btn-secondary" data-demo="whole-shift">Fill shift end to end</button>
      <span class="muted-xs">Values generated from the acceptance limits. Test fixture.</span>
    </div>`;
}

function wireDemoControls(container, record) {
  container.querySelector("#demo-mode")?.addEventListener("change", (e) => {
    PCS_DEMO_MODE = e.target.value;
  });

  container.querySelectorAll("[data-demo]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const what = btn.dataset.demo;
      const mode = PCS_DEMO_MODE;
      const currentShift = pcsShiftForSlotIndex(pcsNearestCompletedSlot(record.date));
      const shift = PCS_MATRIX_SHIFT || currentShift;

      if (what === "day") {
        pcsUpdateDaily(record.id, pcsDemoDayDetails(mode));
      } else if (what === "machines") {
        pcsDemoMachines(record.id, mode, 2);
      } else if (what === "shift-details") {
        pcsDemoShiftDetails(record.id, shift, mode);
      } else if (what === "hourly") {
        const n = pcsDemoHourlyForShift(record.id, shift, mode);
        if (!n) {
          alert(`No open slots to fill in ${shift} — its readings are locked or already recorded.`);
          return;
        }
      } else if (what === "signoff") {
        if (!pcsDemoSignoff(record.id, shift)) {
          alert(`${shift} has not been opened yet. Fill its shift details first.`);
          return;
        }
      } else if (what === "whole-shift") {
        pcsDemoWholeShift(record.id, shift, mode);
      }

      reload(record.id);
    })
  );
}

// ---------- auto-fill (form-level test fixture) -------------------------

function pcsAutoFillForm(container, fields, opts = {}) {
  const data = pcsDemoFill(fields, {
    breach: pcsDemoBreachNow(PCS_DEMO_MODE),
    seed: opts.seed || {},
  });

  fields.forEach((f) => {
    if (opts.skip && opts.skip.includes(f.key)) return;
    const input = container.querySelector(`[data-key="${f.key}"]`);
    if (!input || input.disabled) return;
    input.value = data[f.key] ?? "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  container.querySelectorAll("[data-pin]").forEach((sel) => {
    sel.value = PCS_DEMO_MODE === "occasional" && Math.random() < 0.05 ? "NOT OK" : "OK";
  });

  return data;
}

function pcsAutoFillDieTemps(container) {
  container.querySelectorAll("[data-die]").forEach((input) => {
    if (input.disabled) return;
    input.value = pcsDemoValue(PCS_MACHINE_HOURLY_FIELD, {}, pcsDemoBreachNow(PCS_DEMO_MODE));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pcsAutoFillMatrix(body) {
  const rows = new Map();
  body.querySelectorAll(".cell-input").forEach((input) => {
    const slot = Number(input.dataset.slot);
    if (!rows.has(slot)) rows.set(slot, []);
    rows.get(slot).push(input);
  });

  rows.forEach((inputs) => {
    const data = pcsDemoFill(PCS_HOURLY_FIELDS, { breach: pcsDemoBreachNow(PCS_DEMO_MODE) });
    inputs.forEach((input) => {
      if (input.dataset.die) {
        input.value = pcsDemoValue(PCS_MACHINE_HOURLY_FIELD, {}, pcsDemoBreachNow(PCS_DEMO_MODE));
      } else {
        input.value = data[input.dataset.key] ?? "";
      }
    });
    inputs.forEach((input) => input.dispatchEvent(new Event("input", { bubbles: true })));
  });

  return rows.size;
}

function pcsAutoFillButton(id, label = "Auto-fill") {
  if (!pcsCan("action.pcs.demo.fill")) return "";
  return `<button type="button" class="btn btn-secondary" data-autofill="${id}">
            <span class="demo-tag">Test</span> ${escapeHtml(label)}
          </button>`;
}

// ---------- router ------------------------------------------------------

function pcsRoute() {
  const root = document.getElementById("pcs-root");
  const hash = window.location.hash || "#/";

  if (hash === "#/new") renderNew(root);
  else if (hash.startsWith("#/print/")) {
    const record = pcsGet(hash.slice("#/print/".length));
    if (record && typeof pcsPrintOpen === "function") pcsPrintOpen(record);
    else renderList(root);
  }
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
