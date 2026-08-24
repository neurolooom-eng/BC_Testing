// PCS print view — renders a filled day sheet as printable HTML matching
// QC FMT 038. Opened from the Print button on the day sheet header.

function pcsPrintView(record) {
  if (!record) return '<p>No record to print.</p>';

  const e = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const oos = (val, field, entry) => {
    if (val === "" || val === undefined || val === null || val === PCS_NA) return "";
    const n = Number(val);
    if (Number.isNaN(n)) return "";
    if (field.expected !== undefined && n !== field.expected) return " class=\"oos\"";
    const range = field.dynamicRange ? field.dynamicRange(entry || {}) : { min: field.min, max: field.max };
    if (range.min !== undefined && n < range.min) return " class=\"oos\"";
    if (range.max !== undefined && n > range.max) return " class=\"oos\"";
    return "";
  };

  const machines = record.machines || [];
  const shifts = record.shifts || [];
  const hourly = record.hourly || [];

  // Header
  let html = `<div class="print-preview" id="print-content">
    <div style="text-align:center;margin-bottom:12px;">
      <strong style="font-size:15px;">BEST CAST IT LTD, CHENNAI</strong><br>
      <span style="font-size:12px;">PROCESS CHECK SHEET — QC FMT 038</span>
    </div>

    <table>
      <tr>
        <th>Date</th><td>${e(record.date)}</td>
        <th>Line</th><td>${e(record.line)}</td>
        <th>Metal Grade</th><td>${e(record.metalGrade)}</td>
        <th>Furnace No.</th><td>${e(record.furnaceNo)}</td>
      </tr>
      <tr>
        <th>Degassing Gas</th><td>${e(record.degassingGas)}</td>
        <th>Die Pre Heating</th><td>${e(record.diePreheatingAsPerSOP)}</td>
        <th>Runner/Raiser</th><td>${e(record.dieRunnerRaiserCleaning)}</td>
        <th>Spray Coating</th><td>${e(record.dieSprayCoatingApply)}</td>
      </tr>
      <tr>
        <th>In-Charge</th><td colspan="7">${e(record.inChargeSign)}</td>
      </tr>
    </table>`;

  // Machines table
  if (machines.length) {
    html += `<h3>Machines</h3><table>
      <tr>
        ${PCS_MACHINE_FIELDS.map((f) => `<th>${e(f.short || f.label)}</th>`).join("")}
        <th>Start Slot</th><th>Stop Slot</th>
      </tr>
      ${machines.map((m) => `<tr>
        ${PCS_MACHINE_FIELDS.map((f) => `<td${oos(m[f.key], f)}>${e(m[f.key])}</td>`).join("")}
        <td>${e(PCS_TIME_SLOTS[m.startSlot] || m.startSlot)}</td>
        <td>${m.stopSlot !== null && m.stopSlot !== undefined ? e(PCS_TIME_SLOTS[m.stopSlot] || m.stopSlot) : "—"}</td>
      </tr>`).join("")}
    </table>`;
  }

  // Per-shift blocks
  PCS_SHIFTS.forEach((shiftName, si) => {
    const range = pcsShiftSlotRange(shiftName);
    if (!range) return;
    const shiftRecord = pcsShiftRecordFor(record, shiftName);
    const shiftHourly = hourly
      .filter((h) => h.slotIndex >= range.first && h.slotIndex <= range.last)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    html += `<h3>${e(shiftName)}</h3>`;

    // Shift details
    if (shiftRecord) {
      html += `<table>
        <tr>
          ${PCS_SHIFT_DETAIL_FIELDS.map((f) => `<th>${e(f.label)}</th>`).join("")}
        </tr>
        <tr>
          ${PCS_SHIFT_DETAIL_FIELDS.map((f) => `<td${oos(shiftRecord[f.key], f)}>${e(shiftRecord[f.key])}</td>`).join("")}
        </tr>
      </table>`;

      // Core pin verification
      if (shiftRecord.corePins && Object.keys(shiftRecord.corePins).length) {
        html += `<table style="margin-top:4px;">
          <tr><th>Cavity</th>${PCS_CORE_PIN_CAVITIES.map((c) => `<th>${c}</th>`).join("")}</tr>
          <tr><td>Status</td>${PCS_CORE_PIN_CAVITIES.map((c) => `<td>${e(shiftRecord.corePins[c] || "")}</td>`).join("")}</tr>
        </table>`;
      }
    }

    // Hourly readings matrix
    if (shiftHourly.length) {
      const cols = PCS_HOURLY_FIELDS.map((f) => f.short || f.label);
      const dieCols = machines.map((m) => `Die ${m.machineNo || "?"}`);

      html += `<table style="margin-top:6px;">
        <tr><th>Time</th>${cols.map((c) => `<th>${e(c)}</th>`).join("")}${dieCols.map((c) => `<th>${e(c)}</th>`).join("")}</tr>
        ${shiftHourly.map((h) => {
          const slot = PCS_TIME_SLOTS[h.slotIndex] || h.slotIndex;
          return `<tr>
            <td><strong>${e(slot)}</strong></td>
            ${PCS_HOURLY_FIELDS.map((f) => `<td${oos(h[f.key], f, h)}>${e(h[f.key])}</td>`).join("")}
            ${machines.map((m) => {
              const val = pcsDieTempFor(h, m, h.slotIndex);
              return `<td${val !== PCS_NA ? oos(val, PCS_MACHINE_HOURLY_FIELD) : ""}>${e(val)}</td>`;
            }).join("")}
          </tr>`;
        }).join("")}
      </table>`;
    }

    // Sign-off
    if (shiftRecord) {
      html += `<table style="margin-top:6px;">
        <tr>
          ${PCS_SHIFT_SIGNOFF_FIELDS.map((f) => `<th>${e(f.label)}</th>`).join("")}
          <th>Status</th>
        </tr>
        <tr>
          ${PCS_SHIFT_SIGNOFF_FIELDS.map((f) => `<td>${e(shiftRecord[f.key])}</td>`).join("")}
          <td>${e(PCS_SHIFT_STATUS_LABEL[pcsShiftStatus(shiftRecord)] || "—")}</td>
        </tr>
      </table>`;

      // Out-of-spec list
      const oosItems = pcsOutOfSpecForShift(record, shiftName);
      if (oosItems.length) {
        html += `<table style="margin-top:4px;">
          <tr><th>Time</th><th>Field</th><th>Value</th><th>Reason</th></tr>
          ${oosItems.map((i) => `<tr class="oos">
            <td>${e(i.timeSlot)}</td><td>${e(i.label)}</td><td>${e(i.value)}</td><td>${e(i.reason)}</td>
          </tr>`).join("")}
        </table>`;
      }
    }
  });

  // Footer
  html += `<div style="margin-top:18px;font-size:10px;color:#666;text-align:right;">
    Generated ${new Date().toLocaleString()} &middot; Sheet ${e(record.id)}
  </div></div>`;

  return html;
}

function pcsPrintOpen(record) {
  const root = document.getElementById("pcs-root");

  root.innerHTML = `
    <div class="btn-row no-print" style="margin-bottom:14px;">
      <a class="btn btn-secondary" href="#/sheet/${record.id}">&larr; Back to sheet</a>
      <button class="btn" id="print-btn">Print / Save PDF</button>
    </div>
    ${pcsPrintView(record)}`;

  document.getElementById("print-btn")?.addEventListener("click", () => window.print());
}
