// Process Check Sheet — day sheet, header section, machines section.
// Loaded after pcs.js (helpers, state) and before the router.

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

  renderHeaderSection(root.querySelector("#sec-header"), record);
  renderMachinesSection(root.querySelector("#sec-machines"), record);
  renderShiftDetailsSection(root.querySelector("#sec-shift-details"), record);
  renderHourlySection(root.querySelector("#sec-hourly"), record);
  renderShiftSignoffSection(root.querySelector("#sec-signoff"), record);
}

function renderHeaderSection(panel, record) {
  const archived = pcsIsArchived(record);
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
          ${pcsCan("action.pcs.sheet.print") ? `<a class="btn btn-secondary" href="#/print/${record.id}">Print</a>` : ""}
          ${canEdit ? pcsAutoFillButton("day", "Auto-fill") : ""}
          ${canEdit ? pcsDemoControls("day details", "day") : ""}
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

  panel.querySelector('[data-autofill="day"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, PCS_DAILY_FIELDS);
  });

  wireDemoControls(panel, record);

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

function renderMachinesSection(panel, record) {
  const archived = pcsIsArchived(record);
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
        ${archived ? "" : pcsDemoControls("machines", "machines")}
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

  wireDemoControls(panel, record);

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
      if (kind === "shifts") {
        const shift = (record.shifts || []).find((s) => s.id === id);
        if (shift) pcsApproveShiftHourly(record.id, shift.shift, PCS_SESSION.userid);
      }
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
  panel.querySelectorAll("[data-unlock]").forEach((b) =>
    b.addEventListener("click", () => {
      const slot = Number(b.dataset.unlock);
      pcsUnlockHourly(record.id, slot);
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

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${machineId ? "Edit" : "Add"} machine">
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
          ${pcsAutoFillButton("machine", "Auto-fill")}
          <button class="btn btn-secondary" id="cancel-machine">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(backdrop);
  trapFocus(backdrop);
  const form = backdrop.querySelector("#machine-form");

  backdrop.querySelector('[data-autofill="machine"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, PCS_MACHINE_FIELDS);
  });

  const close = () => { releaseFocus(backdrop); backdrop.remove(); };
  backdrop.querySelector("#cancel-machine").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  backdrop.querySelector("#save-machine").addEventListener("click", () => {
    const data = readForm(form, PCS_MACHINE_FIELDS);
    const result = paintValidation(form, data, PCS_MACHINE_FIELDS);
    backdrop.querySelector("#machine-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    const slot = Number(form.querySelector('[data-key="startSlot"]').value);
    if (machineId) pcsUpdateChild(record.id, "machines", machineId, { ...data, startSlot: slot });
    else pcsAddMachine(record.id, data, slot);

    close();
    reload(record.id);
  });
}

function openStopMachineModal(record, machineId, nearest) {
  const machine = (record.machines || []).find((m) => m.id === machineId);
  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Stop machine">
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

  document.body.appendChild(backdrop);
  trapFocus(backdrop);
  const close = () => { releaseFocus(backdrop); backdrop.remove(); };
  backdrop.querySelector("#cancel-stop").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  backdrop.querySelector("#confirm-stop").addEventListener("click", () => {
    pcsStopMachine(record.id, machineId, backdrop.querySelector("#stop-slot").value);
    close();
    reload(record.id);
  });
}
