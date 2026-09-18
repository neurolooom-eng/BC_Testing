// Process Check Sheet — shift details and shift sign-off sections.
// Loaded after pcs.js (helpers, state) and before the router.

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
        ${archived ? "" : pcsDemoControls("shift details", "shift-details")}
        <span class="muted-xs">${recorded.length} of ${PCS_SHIFTS.length} shifts opened</span>
      </div>
      ${
        recorded.length
          ? `<div class="cards">${cards}</div>`
          : `<div class="card"><p>No shift opened yet. Open a shift before recording hourly readings against it.</p></div>`
      }
    </details>`;

  wireDemoControls(panel, record);

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

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${shiftId ? "Edit" : "Open"} shift details">
      <div class="modal">
        <h2>${shiftId ? "Edit" : "Open"} shift details</h2>
        <div class="field-grid" id="shift-detail-form">
          ${fields.map((f) => fieldInputHtml(f, entry[f.key], entry)).join("")}
          ${corePinHtml}
        </div>
        <div id="shift-detail-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="save-shift-detail">Save</button>
          ${pcsAutoFillButton("shift-detail", "Auto-fill")}
          <button class="btn btn-secondary" id="cancel-shift-detail">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(backdrop);
  trapFocus(backdrop);
  const form = backdrop.querySelector("#shift-detail-form");
  wireLiveValidation(form, fields);

  backdrop.querySelector('[data-autofill="shift-detail"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, fields, { skip: ["shift"] });
  });

  const close = () => { releaseFocus(backdrop); backdrop.remove(); };
  backdrop.querySelector("#cancel-shift-detail").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  backdrop.querySelector("#save-shift-detail").addEventListener("click", () => {
    const data = readForm(form, fields);
    data.corePins = {};
    form.querySelectorAll("[data-pin]").forEach((sel) => {
      if (sel.value) data.corePins[sel.dataset.pin] = sel.value;
    });

    const result = paintValidation(form, data, fields);
    backdrop.querySelector("#shift-detail-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    if (shiftId) pcsUpdateChild(record.id, "shifts", shiftId, data);
    else pcsAddChild(record.id, "shifts", { ...data, status: PCS_SHIFT_STATUS.DRAFT, approval: null });

    close();
    reload(record.id);
  });
}

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
      ${archived ? "" : `<div class="btn-row" style="margin:0 0 14px;">${pcsDemoControls("sign-off", "signoff")}</div>`}
      ${
        recorded.length
          ? `<div class="cards">${cards}</div>`
          : `<div class="card"><p>No shift opened yet. Shift sign-off appears once a shift has been opened above.</p></div>`
      }
    </details>`;

  wireDemoControls(panel, record);

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

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeHtml(entry.shift || "")} sign-off">
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
          ${pcsAutoFillButton("signoff", "Auto-fill")}
          <button class="btn btn-secondary" id="cancel-signoff">Cancel</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(backdrop);
  trapFocus(backdrop);
  const form = backdrop.querySelector("#signoff-form");
  wireLiveValidation(form, PCS_SHIFT_SIGNOFF_FIELDS);

  backdrop.querySelector('[data-autofill="signoff"]')?.addEventListener("click", () => {
    pcsAutoFillForm(form, PCS_SHIFT_SIGNOFF_FIELDS);
  });

  const close = () => { releaseFocus(backdrop); backdrop.remove(); };
  backdrop.querySelector("#cancel-signoff").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  backdrop.querySelector("#save-signoff").addEventListener("click", () => {
    const data = readForm(form, PCS_SHIFT_SIGNOFF_FIELDS);
    const result = paintValidation(form, data, PCS_SHIFT_SIGNOFF_FIELDS);
    backdrop.querySelector("#signoff-alert").innerHTML = outOfSpecBanner(result.outOfSpec);
    if (result.missing.length) return;

    pcsUpdateChild(record.id, "shifts", shiftId, {
      ...data,
      machineRemarks: autoRemarks,
      outOfSpecAtSignoff: oos.length,
    });
    close();
    reload(record.id);
  });
}
