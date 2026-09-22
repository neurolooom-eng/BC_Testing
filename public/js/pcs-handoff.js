// Process Check Sheet — shift handoff summary.
//
// Shown when the last reading of a shift is saved, and available on demand
// from the shift sign-off section. One screen the outgoing and incoming
// operators can read together: what got recorded, what did not, and what
// went out of spec — before the shift is signed for.

function pcsOpenHandoff(recordId, shiftName) {
  const record = pcsGet(recordId);
  if (!record) return;

  const range = pcsShiftSlotRange(shiftName);
  const total = range.last - range.first + 1;
  const missing = pcsMissingSlotsForShift(record, shiftName);
  const recorded = total - missing.length;
  const oos = pcsOutOfSpecForShift(record, shiftName);
  const remarks = pcsMachineRemarksForShift(record, shiftName);
  const shiftRecord = pcsShiftRecordFor(record, shiftName);
  const status = pcsShiftStatus(shiftRecord);
  const missingSignoff = shiftRecord
    ? PCS_SHIFT_SIGNOFF_FIELDS.filter((f) => f.required && !shiftRecord[f.key])
    : PCS_SHIFT_SIGNOFF_FIELDS.filter((f) => f.required);

  const canSubmit =
    shiftRecord && !missingSignoff.length && status === PCS_SHIFT_STATUS.DRAFT && pcsCan("action.pcs.hourly.record");

  const oosRows = oos
    .slice(0, 12)
    .map(
      (i) =>
        `<li><strong>${escapeHtml(i.timeSlot)}</strong> — ${escapeHtml(i.label)}: ${escapeHtml(
          String(i.value)
        )} <span class="muted-xs">(${escapeHtml(i.reason)})</span></li>`
    )
    .join("");

  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Shift handoff summary">
      <div class="modal handoff-modal">
        <h2>${escapeHtml(shiftName)} handoff — ${escapeHtml(record.date || "")}</h2>
        <p class="subtitle">Line ${escapeHtml(record.line || "—")} · Furnace ${escapeHtml(record.furnaceNo || "—")}</p>

        <div class="handoff-stats">
          <div class="handoff-stat ${recorded === total ? "good" : "warn"}">
            <span class="handoff-num">${recorded}/${total}</span>
            <span class="handoff-label">Slots recorded</span>
          </div>
          <div class="handoff-stat ${missing.length ? "warn" : "good"}">
            <span class="handoff-num">${missing.length}</span>
            <span class="handoff-label">Slots missed</span>
          </div>
          <div class="handoff-stat ${oos.length ? "bad" : "good"}">
            <span class="handoff-num">${oos.length}</span>
            <span class="handoff-label">Out of spec</span>
          </div>
        </div>

        ${
          missing.length
            ? `<section class="handoff-sec">
                 <h3>Slots with no reading</h3>
                 <p class="handoff-slots">${missing.map((i) => escapeHtml(PCS_TIME_SLOTS[i])).join(" · ")}</p>
               </section>`
            : ""
        }

        ${
          oos.length
            ? `<section class="handoff-sec">
                 <h3>Out-of-spec readings</h3>
                 <ul class="handoff-list">${oosRows}</ul>
                 ${oos.length > 12 ? `<p class="muted-xs">…and ${oos.length - 12} more.</p>` : ""}
               </section>`
            : ""
        }

        ${
          remarks.length
            ? `<section class="handoff-sec">
                 <h3>Machine changes</h3>
                 <ul class="handoff-list">${remarks.map((r) => `<li>${escapeHtml(r.text)}</li>`).join("")}</ul>
               </section>`
            : ""
        }

        <section class="handoff-sec">
          <h3>Sign-off</h3>
          ${
            !shiftRecord
              ? `<p class="muted-xs">${escapeHtml(shiftName)} has not been opened. Fill in shift details and the
                 sign-off before sending it for approval.</p>`
              : missingSignoff.length
              ? `<p class="muted-xs">Still missing: ${escapeHtml(missingSignoff.map((f) => f.label).join(", "))}.</p>`
              : `<p class="muted-xs">Operator ${escapeHtml(shiftRecord.operatorSign || "—")} ·
                 Supervisor ${escapeHtml(shiftRecord.shiftSupervisorSign || "—")}</p>`
          }
          ${
            status && status !== PCS_SHIFT_STATUS.DRAFT
              ? `<p class="muted-xs">Status: ${escapeHtml(PCS_SHIFT_STATUS_LABEL[status])}.</p>`
              : ""
          }
        </section>

        <div class="btn-row handoff-actions">
          ${canSubmit ? `<button class="btn" id="handoff-submit">Send ${escapeHtml(shiftName)} for approval</button>` : ""}
          <button class="btn btn-secondary" id="handoff-close">${canSubmit ? "Not yet" : "Close"}</button>
        </div>
      </div>
    </div>`);

  document.body.appendChild(backdrop);
  trapFocus(backdrop);

  const close = () => {
    releaseFocus(backdrop);
    backdrop.remove();
    reload(recordId);
  };

  backdrop.querySelector("#handoff-close").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  backdrop.querySelector("#handoff-submit")?.addEventListener("click", () => {
    pcsSubmitShift(recordId, shiftName, PCS_SESSION.userid);
    showToast(`${shiftName} sent for approval.`);
    close();
  });
}
