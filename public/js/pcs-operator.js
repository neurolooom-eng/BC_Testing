// Process Check Sheet — Operator view.
//
// A third hourly layout, alongside matrix and form, built for the person
// actually on the line: one time slot at a time, large targets, readings
// grouped the way they are taken rather than in storage order, and a single
// obvious action at the bottom of the screen.
//
// The matrix stays the supervisor's view — it compares slots side by side.
// This view never scrolls sideways and never asks which row you are on.

// Readings grouped in the order they are physically taken at the furnace,
// so the operator works down the screen in the same order as down the line.
const PCS_OPERATOR_GROUPS = [
  { title: "Charge", keys: ["holdingFurnaceCharges", "ingotKgs", "drossCleaning"] },
  { title: "Temperatures", keys: ["meltingMetalTemp", "holdingFurnaceTemp"] },
  {
    title: "Degassing",
    keys: ["coverall", "degassingMin", "pressure", "flowRate", "rotorSize", "rotorRpm", "degassingKillingTime"],
  },
  { title: "Gas check", keys: ["gasCheckKMould", "gasCheckVacuum"] },
  { title: "Environment", keys: ["roomTemp", "humidity"] },
];

function pcsOperatorField(field, value, entry) {
  const v = value ?? "";
  const hint = pcsSpecHint(field, entry);
  const hintHtml = hint ? `<span class="op-spec">${escapeHtml(hint)}</span>` : "";

  let input;
  if (field.type === "select") {
    const opts = field.options
      .map((o) => `<option value="${escapeHtml(o)}"${String(v) === String(o) ? " selected" : ""}>${escapeHtml(o)}</option>`)
      .join("");
    input = `<select class="op-input" data-key="${field.key}"><option value="">—</option>${opts}</select>`;
  } else {
    const step = field.step ? ` step="${field.step}"` : ' step="any"';
    input = `<input class="op-input" type="number" inputmode="decimal" data-key="${field.key}" value="${escapeHtml(v)}"${step}>`;
  }

  return `
    <div class="field op-field" data-field="${field.key}">
      <label>${escapeHtml(field.label)}</label>
      ${hintHtml}
      ${input}
      <p class="field-error"></p>
    </div>`;
}

// The nearest earlier slot that actually has a reading — the one whose
// values are worth offering as a starting point.
function pcsPreviousRecordedSlot(record, slot) {
  let best = null;
  (record.hourly || []).forEach((h) => {
    if (h.slotIndex < slot && (best === null || h.slotIndex > best.slotIndex)) best = h;
  });
  return best;
}

function renderHourlyOperator(body, record, nearest) {
  const slot = PCS_FORM_SLOT ?? nearest;
  const entry = pcsHourlyFor(record, slot) || {};
  const locked = pcsHourlyLocked(record, slot);
  const machines = record.machines || [];
  const shiftName = pcsShiftForSlotIndex(slot);
  const range = pcsShiftSlotRange(shiftName);
  const canRecord = pcsCan("action.pcs.hourly.record");

  // Progress across the shift, so the operator can see at a glance how much
  // of their shift is on the sheet without opening the matrix.
  let done = 0;
  for (let i = range.first; i <= range.last; i++) if (pcsHourlyFor(record, i)) done++;

  const strip = [];
  for (let i = range.first; i <= range.last; i++) {
    const has = pcsHourlyFor(record, i);
    const cls = i === slot ? "current" : has ? "done" : "empty";
    strip.push(
      `<button type="button" class="slot-chip ${cls}" data-goto="${i}" title="${escapeHtml(PCS_TIME_SLOTS[i])}">${escapeHtml(
        PCS_TIME_SLOTS[i]
      )}</button>`
    );
  }

  const groups = PCS_OPERATOR_GROUPS.map((g) => {
    const fields = g.keys
      .map((k) => PCS_HOURLY_FIELDS.find((f) => f.key === k))
      .filter(Boolean);
    if (!fields.length) return "";
    return `
      <section class="op-group">
        <h3>${escapeHtml(g.title)}</h3>
        <div class="op-grid">
          ${fields.map((f) => pcsOperatorField(f, entry[f.key], entry)).join("")}
        </div>
      </section>`;
  }).join("");

  const dieFields = machines
    .map((m) => {
      const running = pcsMachineRunningAt(m, slot);
      const v = (entry.dieTemps || {})[m.id] ?? "";
      if (!running) {
        return `
          <div class="field op-field op-na">
            <label>M/C ${escapeHtml(m.machineNo)}</label>
            <span class="op-spec">not running</span>
            <input class="op-input" value="NA" disabled>
          </div>`;
      }
      return `
        <div class="field op-field" data-field="die_${m.id}">
          <label>M/C ${escapeHtml(m.machineNo)}</label>
          <span class="op-spec">${escapeHtml(pcsSpecHint(PCS_MACHINE_HOURLY_FIELD))}</span>
          <input class="op-input" type="number" inputmode="decimal" step="any" data-die="${m.id}" value="${escapeHtml(v)}">
          <p class="field-error"></p>
        </div>`;
    })
    .join("");

  const prevSlot = pcsPreviousRecordedSlot(record, slot);
  const isLast = pcsIsLastSlotOfShift(slot);

  body.innerHTML = `
    <div class="op-wrap">
      <div class="op-header">
        <button type="button" class="op-nav" id="op-prev" ${slot <= 0 ? "disabled" : ""} aria-label="Previous slot">‹</button>
        <div class="op-slot">
          <span class="op-slot-time">${escapeHtml(PCS_TIME_SLOTS[slot])}</span>
          <span class="op-slot-meta">${escapeHtml(shiftName)} · ${done} of ${range.last - range.first + 1} recorded</span>
        </div>
        <button type="button" class="op-nav" id="op-next" ${
          slot >= PCS_TIME_SLOTS.length - 1 ? "disabled" : ""
        } aria-label="Next slot">›</button>
      </div>

      <div class="slot-strip">${strip.join("")}</div>

      ${
        locked
          ? `<div class="alert alert-ok op-locked">
               This slot is locked — a later reading has been recorded, or the shift is submitted.
               ${
                 pcsCan("action.pcs.unapprove")
                   ? `<button class="link-btn unlock-btn" data-unlock="${slot}">Unlock for rework</button>`
                   : ""
               }
             </div>`
          : ""
      }

      <fieldset class="op-body"${locked || !canRecord ? " disabled" : ""}>
        ${groups}
        <section class="op-group">
          <h3>Die temperature</h3>
          ${machines.length ? `<div class="op-grid">${dieFields}</div>` : `<p class="muted-xs">No machines added yet.</p>`}
        </section>
      </fieldset>

      <div id="op-alert"></div>

      ${
        canRecord && !locked
          ? `<div class="op-actions">
               ${
                 prevSlot
                   ? `<button type="button" class="btn btn-secondary op-copy" id="op-copy">Copy ${escapeHtml(
                       PCS_TIME_SLOTS[prevSlot.slotIndex]
                     )}</button>`
                   : ""
               }
               ${pcsAutoFillButton("op-body", "Auto-fill")}
               <button type="button" class="btn op-save" id="op-save">
                 ${isLast ? "Save &amp; finish shift" : "Save &amp; next"}
               </button>
             </div>`
          : ""
      }
      ${!canRecord ? `<p class="muted-xs">Read-only — recording hourly readings is not permitted for your role.</p>` : ""}
    </div>`;

  const form = body.querySelector(".op-body");

  body.querySelector("#op-prev")?.addEventListener("click", () => pcsOperatorGoto(record, slot - 1));
  body.querySelector("#op-next")?.addEventListener("click", () => pcsOperatorGoto(record, slot + 1));
  body.querySelectorAll("[data-goto]").forEach((b) =>
    b.addEventListener("click", () => pcsOperatorGoto(record, Number(b.dataset.goto)))
  );

  if (form && !locked && canRecord) {
    wireLiveValidation(form, PCS_HOURLY_FIELDS);
    wireOperatorDieValidation(form);
    wireOperatorEnterKey(form);
  }

  body.querySelector('[data-autofill="op-body"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, PCS_HOURLY_FIELDS);
    pcsAutoFillDieTemps(form);
  });

  body.querySelector("#op-copy")?.addEventListener("click", () => {
    pcsOperatorCopyFrom(form, prevSlot);
    showToast(`Copied ${PCS_TIME_SLOTS[prevSlot.slotIndex]} — check and adjust what changed.`);
  });

  // Saving this slot locks every earlier slot (see pcsHourlyLocked). Any
  // empty slots between the latest reading and this one would lock with
  // nothing in them — easy to do by accident from the slot strip — so the
  // save asks first, naming them.
  const skipped = pcsSlotsSkippedBySaving(record, slot);
  let skipConfirmed = false;

  body.querySelector("#op-save")?.addEventListener("click", () => {
    const data = readForm(form, PCS_HOURLY_FIELDS);
    const result = paintValidation(form, data, PCS_HOURLY_FIELDS);

    if (result.missing.length) {
      body.querySelector("#op-alert").innerHTML =
        `<div class="alert alert-danger"><strong>${result.missing.length} reading${
          result.missing.length === 1 ? " is" : "s are"
        } still blank.</strong> Fill them in, or leave the slot and come back to it.</div>`;
      form.querySelector(".field.has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Not saved — some readings are blank.", "error");
      return;
    }

    if (skipped.length && !skipConfirmed) {
      pcsShowSkipWarning(body.querySelector("#op-alert"), skipped, PCS_TIME_SLOTS[slot], {
        onGoto: (first) => pcsOperatorGoto(record, first),
        onConfirm: () => {
          skipConfirmed = true;
          body.querySelector("#op-save").click();
        },
      });
      return;
    }

    const dieTemps = { ...(entry.dieTemps || {}) };
    form.querySelectorAll("[data-die]").forEach((input) => {
      const v = input.value.trim();
      if (v === "") delete dieTemps[input.dataset.die];
      else dieTemps[input.dataset.die] = v;
    });

    pcsSaveHourly(record.id, slot, { ...data, dieTemps });

    const oos = result.outOfSpec.length;
    showToast(
      oos
        ? `${PCS_TIME_SLOTS[slot]} saved — ${oos} reading${oos === 1 ? "" : "s"} out of spec, flagged for the supervisor.`
        : `${PCS_TIME_SLOTS[slot]} saved.`,
      oos ? "warn" : "ok"
    );

    if (isLast) {
      pcsOpenHandoff(record.id, shiftName);
      return;
    }
    PCS_FORM_SLOT = Math.min(slot + 1, PCS_TIME_SLOTS.length - 1);
    reload(record.id);
  });

  wireApprovalButtons(body, record);
}

function pcsOperatorGoto(record, slot) {
  PCS_FORM_SLOT = Math.max(0, Math.min(PCS_TIME_SLOTS.length - 1, slot));
  reload(record.id);
}

// Pre-fills from an earlier slot. Most furnace readings hold steady hour to
// hour, so the operator confirms and corrects rather than retyping sixteen
// values that have not moved.
function pcsOperatorCopyFrom(form, prevEntry) {
  if (!prevEntry) return;

  PCS_HOURLY_FIELDS.forEach((f) => {
    const input = form.querySelector(`[data-key="${f.key}"]`);
    if (!input || input.disabled) return;
    const v = prevEntry[f.key];
    if (v === undefined || v === null || v === "") return;
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  form.querySelectorAll("[data-die]").forEach((input) => {
    if (input.disabled) return;
    const v = (prevEntry.dieTemps || {})[input.dataset.die];
    if (v === undefined || v === "") return;
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function wireOperatorDieValidation(form) {
  form.querySelectorAll("[data-die]").forEach((input) => {
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

// Enter moves to the next reading rather than submitting, so a whole slot
// can be entered from the tablet keypad without reaching for the screen.
function wireOperatorEnterKey(form) {
  const inputs = Array.from(form.querySelectorAll(".op-input:not([disabled])"));
  inputs.forEach((input, i) => {
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const next = inputs[i + 1];
      if (next) {
        next.focus();
        if (next.select) next.select();
      } else {
        document.getElementById("op-save")?.focus();
      }
    });
  });
}
