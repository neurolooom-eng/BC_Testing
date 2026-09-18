// Process Check Sheet — hourly readings section (matrix + form views).
// Loaded after pcs.js (helpers, state) and before the router.

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
      ${pcsDemoModePicker()}
      <div id="hourly-body"></div>
    </details>`;

  panel.querySelectorAll(".toggle-btn").forEach((b) =>
    b.addEventListener("click", () => {
      PCS_HOURLY_MODE = b.dataset.mode;
      localStorage.setItem(PCS_HOURLY_MODE_KEY, PCS_HOURLY_MODE);
      reload(record.id);
    })
  );

  wireDemoControls(panel, record);

  const body = panel.querySelector("#hourly-body");
  if (PCS_HOURLY_MODE === "matrix") renderHourlyMatrix(body, record, nearest);
  else renderHourlyForm(body, record, nearest);
}

function renderHourlyMatrix(body, record, nearest) {
  const machines = record.machines || [];
  const latestRecorded = pcsLatestRecordedSlot(record);

  const currentShift = pcsShiftForSlotIndex(nearest);
  const shiftName = PCS_MATRIX_SHIFT || currentShift;
  const range = pcsShiftSlotRange(shiftName);
  const isCurrentShift = shiftName === currentShift;

  const firstSlot = range.first;
  const lastSlot =
    isCurrentShift && !PCS_SHOW_ALL_SLOTS ? Math.min(nearest, range.last) : range.last;

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
  for (let i = firstSlot; i <= lastSlot; i++) {
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
          ${locked ? `<span class="lock-mark" title="Locked">🔒</span>${pcsCan("action.pcs.unapprove") ? ` <button class="link-btn unlock-btn" data-unlock="${i}" title="Unlock for rework">🔓</button>` : ""}` : ""}
          <br><span class="muted-xs">${escapeHtml(pcsShiftForSlotIndex(i))}</span>
        </td>
        ${cells}${dieCells}
        <td>${approvalCell}</td>
      </tr>`);
  }

  const submitTarget = pcsMatrixSubmitTarget(record, shiftName, lastSlot);

  body.innerHTML = `
    <div class="btn-row" style="margin-bottom:12px;">
      ${pcsCan("action.pcs.hourly.record") ? '<button class="btn" id="save-matrix">Save changes</button>' : '<span class="muted-xs">Read-only — recording hourly readings is not permitted for your role.</span>'}
      ${pcsCan("action.pcs.hourly.record") ? pcsAutoFillButton("matrix", "Auto-fill matrix") : ""}
      ${
        submitTarget && pcsCan("action.pcs.hourly.record")
          ? `<button class="btn" id="save-send-matrix">Save &amp; Send ${escapeHtml(submitTarget.shift)} for Approval</button>`
          : ""
      }
      <label class="shift-picker">
        <span class="muted-xs">Shift</span>
        <select id="matrix-shift">
          ${PCS_SHIFTS.map(
            (s) =>
              `<option value="${escapeHtml(s)}"${s === shiftName ? " selected" : ""}>${escapeHtml(s)}${
                s === currentShift ? " (current)" : ""
              }</option>`
          ).join("")}
        </select>
      </label>
      ${
        isCurrentShift
          ? `<button class="btn btn-secondary" id="toggle-slots">
               ${PCS_SHOW_ALL_SLOTS ? "Up to current slot" : "Show whole shift"}
             </button>`
          : ""
      }
      <span class="muted-xs">
        ${escapeHtml(PCS_TIME_SLOTS[firstSlot])}–${escapeHtml(PCS_TIME_SLOTS[lastSlot])} ·
        rows lock once a later slot is recorded.
      </span>
    </div>
    <div id="matrix-alert"></div>
    <div class="table-wrap matrix-wrap">
      <table class="dense matrix"><thead>${header}</thead><tbody>${rows.join("")}</tbody></table>
    </div>`;

  body.querySelector("#toggle-slots")?.addEventListener("click", () => {
    PCS_SHOW_ALL_SLOTS = !PCS_SHOW_ALL_SLOTS;
    reload(record.id);
  });

  body.querySelector("#matrix-shift")?.addEventListener("change", (e) => {
    PCS_MATRIX_SHIFT = e.target.value;
    PCS_SHOW_ALL_SLOTS = false;
    reload(record.id);
  });

  wireMatrixLiveValidation(body, record);

  body.querySelector('[data-autofill="matrix"]')?.addEventListener("click", () => {
    const filled = pcsAutoFillMatrix(body);
    if (!filled) alert("No editable rows on screen to fill.");
  });

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

function pcsMatrixSubmitTarget(record, shiftName, lastVisibleSlot) {
  const range = pcsShiftSlotRange(shiftName);
  if (!range || range.last > lastVisibleSlot) return null;
  const shiftRecord = pcsShiftRecordFor(record, shiftName);
  if (shiftRecord && pcsShiftStatus(shiftRecord) !== PCS_SHIFT_STATUS.DRAFT) return null;
  return { shift: shiftName, shiftRecord };
}

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
    input.addEventListener("change", () => {
      const row = input.closest("tr");
      row?.querySelectorAll(".cell-input").forEach(repaint);
    });
  });
}

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
          <p class="field-note">${locked ? `Locked — a later slot has been recorded, or this row is approved.${pcsCan("action.pcs.unapprove") ? ` <button class="link-btn unlock-btn" data-unlock="${slot}" title="Unlock for rework">Unlock for rework</button>` : ""}` : "Open for entry."}</p>
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

      <div id="form-alert">${
        PCS_FORM_FLASH ? `<div class="alert alert-ok">${escapeHtml(PCS_FORM_FLASH)} Now on ${escapeHtml(PCS_TIME_SLOTS[slot])}.</div>` : ""
      }</div>
      <div class="btn-row" style="margin-top:18px;">
        <button class="btn" id="save-hourly"${locked ? " disabled" : ""}>Save reading</button>
        ${!locked ? pcsAutoFillButton("hourly-form", "Auto-fill") : ""}
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

  PCS_FORM_FLASH = null;

  body.querySelector("#form-slot").addEventListener("change", (e) => {
    PCS_FORM_SLOT = Number(e.target.value);
    reload(record.id);
  });

  const form = body.querySelector("#hourly-form");
  if (form && !locked) {
    wireLiveValidation(form, PCS_HOURLY_FIELDS);

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

  body.querySelector('[data-autofill="hourly-form"]')?.addEventListener("click", () => {
    pcsAutoFillForm(body.querySelector("#hourly-form"), PCS_HOURLY_FIELDS);
    pcsAutoFillDieTemps(body);
  });

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
      if (!saveHourlyForm()) return;
      PCS_FORM_SLOT = Math.min(slot + 1, PCS_TIME_SLOTS.length - 1);
      PCS_FORM_FLASH = `${PCS_TIME_SLOTS[slot]} saved.`;
      reload(record.id);
    });
  }

  body.querySelector("#save-send-hourly")?.addEventListener("click", () => {
    if (!saveHourlyForm()) return;
    submitShiftForApproval(record.id, pcsShiftForSlotIndex(slot));
  });

  wireApprovalButtons(body, record);
}
