// PCS print view — renders a filled day sheet as printable HTML matching
// the QC FMT 038 Excel layout. Landscape A4, single table, 55 columns
// (A–H label area + I–BC 47 time-slot data columns).

function pcsPrintView(record) {
  if (!record) return "<p>No record to print.</p>";

  // esc() lives in util.js — loaded before this file.

  const isOos = (val, field, entry) => {
    if (val === "" || val === undefined || val === null || val === PCS_NA) return false;
    const n = Number(val);
    if (Number.isNaN(n)) return false;
    if (field.expected !== undefined && n !== field.expected) return true;
    const rng = field.dynamicRange ? field.dynamicRange(entry || {}) : { min: field.min, max: field.max };
    if (rng.min !== undefined && n < rng.min) return true;
    if (rng.max !== undefined && n > rng.max) return true;
    return false;
  };

  // 47 print slots — skip index 35 (12:00 am) to match the paper form.
  const PS = [];
  for (let i = 0; i < 48; i++) { if (i !== 35) PS.push(i); }

  const hourly = {};
  (record.hourly || []).forEach((h) => { hourly[h.slotIndex] = h; });

  const mc = record.machines || [];
  const sr = (n) => (record.shifts || []).find((s) => s.shift === n) || {};
  const s1 = sr("1st Shift"), s2 = sr("2nd Shift"), s3 = sr("3rd Shift");

  const hf = {};
  PCS_HOURLY_FIELDS.forEach((f) => { hf[f.key] = f; });
  const mf = {};
  PCS_MACHINE_FIELDS.forEach((f) => { mf[f.key] = f; });

  const killVal = ((record.hourly || []).find(
    (h) => h.degassingKillingTime != null && h.degassingKillingTime !== ""
  ) || {}).degassingKillingTime || "";

  const cell = (v, field, entry) => {
    const o = field && v !== "" && v != null && isOos(v, field, entry) ? " oos" : "";
    return `<td class="dc${o}">${esc(v)}</td>`;
  };

  const mcCount = Math.max(mc.length, 1);

  let o = '<div class="print-preview" id="print-content"><table class="fmt038">';

  // Column sizing
  o += "<colgroup>";
  o += '<col span="7" style="width:2.8%">';
  o += '<col style="width:3.6%">';
  for (let i = 0; i < 47; i++) o += '<col style="width:1.55%">';
  o += "</colgroup>";

  // ── Row 1 ──────────────────────────────────────────────────────────────
  o += "<tr>";
  o += '<td colspan="11" class="bl f14 al">BEST CAST IT LTD.,</td>';
  o += '<td colspan="3"></td>';
  o += '<td colspan="29" rowspan="2" class="bl f18 ac">PROCESS CHECKSHEET</td>';
  o += '<td colspan="7"></td>';
  o += '<td colspan="5" class="bl ac">QC FMT 038</td>';
  o += "</tr>";

  // ── Row 2 ──────────────────────────────────────────────────────────────
  o += "<tr>";
  o += "<td></td>";
  o += '<td colspan="7" class="ac">  Chennai - 600 007</td>';
  o += '<td colspan="6"></td>';
  o += '<td colspan="7"></td>';
  o += '<td colspan="5" class="bl ac">Rev.10 - 01-09-2025</td>';
  o += "</tr>";

  // ── Row 3 ──────────────────────────────────────────────────────────────
  o += "<tr>";
  o += `<td colspan="18" class="bl al">LINE - MANDO MODEL LINE -${esc(record.line || "")}</td>`;
  o += '<td colspan="7"></td>';
  o += `<td colspan="4" class="bl">FURNACE No. :- ${esc(record.furnaceNo || "")}</td>`;
  o += '<td colspan="17"></td>';
  o += '<td colspan="5" class="bl">Date :</td>';
  o += `<td colspan="4">${esc(record.date || "")}</td>`;
  o += "</tr>";

  // ── Row 4 ──────────────────────────────────────────────────────────────
  o += "<tr>";
  o += `<td colspan="8" class="bl al">Metal  Grade - ${esc(record.metalGrade || "AC2A")}</td>`;
  o += '<td colspan="16" rowspan="2" class="bl ac shdr">1ST SHIFT</td>';
  o += '<td colspan="15" rowspan="2" class="bl ac shdr">2ND SHIFT</td>';
  o += '<td colspan="7" rowspan="2" class="bl ac shdr">3RD SHIFT →</td>';
  o += '<td colspan="5" class="bl ac">Best Cast Alloy</td>';
  o += `<td colspan="4" class="ac">${esc(s1.bestCastAlloy || "")}</td>`;
  o += "</tr>";

  // ── Row 5 ──────────────────────────────────────────────────────────────
  o += "<tr>";
  o += `<td colspan="8" class="bl al">Degassing Gas - ${esc(record.degassingGas || "N2")}</td>`;
  o += '<td colspan="5" class="bl ac">Other Alloy</td>';
  o += `<td colspan="4" class="ac">${esc(s1.otherAlloy || "")}</td>`;
  o += "</tr>";

  // ── Row 6: Holding Furnace / Charges ───────────────────────────────────
  o += '<tr><td colspan="8" class="bl desc">Holding furnace / No. of Charges</td>';
  PS.forEach((si) => {
    const h = hourly[si];
    o += cell(h ? (h.holdingFurnaceCharges ?? "") : "", hf.holdingFurnaceCharges, h);
  });
  o += "</tr>";

  // ── Row 7: DESCRIPTION + Time Headers ──────────────────────────────────
  o += '<tr class="th-row"><td colspan="8" class="bl ac f12">DESCRIPTION</td>';
  PS.forEach((si) => {
    o += `<td class="bl ac slot">${esc(PCS_TIME_SLOTS[si])}</td>`;
  });
  o += "</tr>";

  // ── Rows 8–19: Hourly Fields ───────────────────────────────────────────
  const HR = [
    { k: "ingotKgs",          lb: "Ingot 50%(Kgs) Foundry returns 50% Total = 300 Kgs per Charge" },
    { k: "drossCleaning",     lb: "Dross Cleaning in Holding furnace (20 mins once)" },
    { k: "meltingMetalTemp",  lb: "Melting  Metal Temp.  720°C ~ 740°C" },
    { k: "coverall",          lb: "Coverall  200 ~ 300 grams per charge" },
    { k: "degassingMin",      lb: "Degasing  15 mins/ charge" },
    { k: "pressure",          lb: "Pressure 2 - 3 bar" },
    { k: "flowRate",          lb: "Flow rate 6 ~ 9 Lpm" },
    { k: "rotorRpm",          lb: "Rotor RPM -  (550 RPM  ~ 650 Rpm - 100mm rotor)  (350 - 400Rpm - 190mm rotor)" },
    { k: "_gas",              lb: "Gas Checking -  K-Mould / vaccum sample" },
    { k: "roomTemp",          lb: "Room Temp°C" },
    { k: "humidity",          lb: "Humidity  %" },
    { k: "holdingFurnaceTemp", lb: "Holding Furnace Metal Temperature 730°C ~ 750°C" },
  ];

  HR.forEach((row) => {
    o += `<tr><td colspan="8" class="bl desc">${esc(row.lb)}</td>`;
    PS.forEach((si) => {
      const h = hourly[si];
      if (row.k === "_gas") {
        const km = h ? (h.gasCheckKMould ?? "") : "";
        const vc = h ? (h.gasCheckVacuum ?? "") : "";
        const val = km !== "" && vc !== "" ? `${km}/${vc}` : (km || vc || "");
        const flag = h && (isOos(km, hf.gasCheckKMould, h) || isOos(vc, hf.gasCheckVacuum, h));
        o += `<td class="dc${flag ? " oos" : ""}">${esc(val)}</td>`;
      } else {
        const v = h ? (h[row.k] ?? "") : "";
        o += cell(v, hf[row.k], h);
      }
    });
    o += "</tr>";
  });

  // ── Row 20: Machine Headers + Degas Killing Time ───────────────────────
  o += '<tr class="th-row">';
  o += '<td class="bl ac mh">M/C. No.</td>';
  o += '<td class="bl ac mh">BC No.</td>';
  o += '<td class="bl ac mh">Die coat thickness</td>';
  o += '<td class="bl ac mh">Die Preheat Temp.</td>';
  o += '<td class="bl ac mh">Cooling Time</td>';
  o += '<td class="bl ac mh">Pouring Time</td>';
  o += '<td class="bl ac mh">Tilting Time</td>';
  o += '<td class="bl ac mh">Degas. Killing time 10 ~ 15 Mins</td>';
  o += `<td class="dc">${esc(killVal)}</td>`;
  o += '<td colspan="46"></td>';
  o += "</tr>";

  // ── Row 21: Die Temp label (rowspan) ───────────────────────────────────
  o += "<tr><td colspan=\"7\"></td>";
  o += `<td rowspan="${mcCount + 1}" class="bl ac die-lbl">Die Temp. 250°C ~ 350°C</td>`;
  PS.forEach(() => { o += '<td class="dc"></td>'; });
  o += "</tr>";

  // ── Machine data rows ──────────────────────────────────────────────────
  if (mc.length === 0) {
    o += "<tr><td colspan=\"7\"></td>";
    PS.forEach(() => { o += '<td class="dc"></td>'; });
    o += "</tr>";
  } else {
    mc.forEach((m) => {
      o += "<tr>";
      o += `<td class="ac">${esc(m.machineNo)}</td>`;
      o += `<td class="ac">${esc(m.bcNo)}</td>`;
      o += cell(m.dieCoatThickness, mf.dieCoatThickness, m);
      o += cell(m.diePreheatTemp, mf.diePreheatTemp, m);
      o += `<td class="ac">${esc(m.coolingTime)}</td>`;
      o += cell(m.pouringTime, mf.pouringTime, m);
      o += cell(m.tiltingTime, mf.tiltingTime, m);
      PS.forEach((si) => {
        const h = hourly[si];
        const dv = pcsDieTempFor(h || null, m, si);
        o += dv === PCS_NA
          ? '<td class="dc"></td>'
          : cell(dv, dv !== "" ? PCS_MACHINE_HOURLY_FIELD : null, null);
      });
      o += "</tr>";
    });
  }

  // ── Row 29: Core Pin — cavity headers ──────────────────────────────────
  o += "<tr>";
  o += '<td colspan="6" rowspan="2" class="bl desc">Core Pin Verification to ensure no blockage</td>';
  o += '<td colspan="2" class="bl ac">Cavity no</td>';
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="bl ac">${c}</td>`; });
  o += '<td colspan="6" class="bl desc cp-cmt">Core Pin replacement on Daily basis. Comment here</td>';
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="bl ac">${c}</td>`; });
  o += '<td colspan="5" class="bl desc cp-cmt">Core Pin replacement on Daily basis. Comment here</td>';
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="bl ac">${c}</td>`; });
  o += '<td colspan="6" class="bl desc cp-cmt">Core Pin replacement on Daily basis. Comment here</td>';
  o += "</tr>";

  // ── Row 30: Core Pin — OK / NOT OK values ──────────────────────────────
  o += "<tr>";
  o += '<td colspan="2" class="bl ac">OK / NOT OK</td>';
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="ac">${esc((s1.corePins || {})[c] || "")}</td>`; });
  o += `<td colspan="6" class="ac">${esc(s1.corePinComment || "")}</td>`;
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="ac">${esc((s2.corePins || {})[c] || "")}</td>`; });
  o += `<td colspan="5" class="ac">${esc(s2.corePinComment || "")}</td>`;
  PCS_CORE_PIN_CAVITIES.forEach((c) => { o += `<td class="ac">${esc((s3.corePins || {})[c] || "")}</td>`; });
  o += `<td colspan="6" class="ac">${esc(s3.corePinComment || "")}</td>`;
  o += "</tr>";

  // ── Row 31: Error Proofs ───────────────────────────────────────────────
  o += '<tr><td colspan="55" class="bl desc err">'
    + "Error Proofs : - 2 Bar pressure &amp; (6~9) LPM alarm, Die Temp. interlink with GDC , "
    + "Melting Temp. Cut off , Auto Top door closing, Degassing Timer &amp; Alarm - "
    + "(Working Condition) - Robot Furnace change alarm condition.  "
    + "Pouring spoon Damper  &amp; 3 stage of air cleaning."
    + "<br>Comment Here →"
    + "</td></tr>";

  // ── Row 32: Die Preparation (top) ──────────────────────────────────────
  const firstTemp = mc.length ? (mc[0].diePreheatTemp || "") : "";
  o += "<tr>";
  o += '<td colspan="8" rowspan="2" class="bl ac desc">Die Preparation Startup checking</td>';
  o += '<td colspan="8" class="bl desc">Die Pre Heating as per SOP</td>';
  o += `<td colspan="8" class="ac">${esc(firstTemp || record.diePreheatingAsPerSOP || "")}</td>`;
  o += '<td colspan="9" class="bl desc">Die Spray Coating Apply. (Visual) - FORACE / Asbestos (Raiser) / DYCOTE 11 / DYCOAT 140 (Die insert)</td>';
  o += `<td colspan="6" class="ac">${esc(record.dieSprayCoatingApply || "")}</td>`;
  o += '<td colspan="7" class="bl desc">3 ~ 5 Sets Rejected While Starting the Die -</td>';
  o += `<td colspan="3" class="ac">${esc(s1.setsRejected ?? "")}</td>`;
  o += `<td colspan="3" class="ac">${esc(s2.setsRejected ?? "")}</td>`;
  o += `<td colspan="3" class="ac">${esc(s3.setsRejected ?? "")}</td>`;
  o += "</tr>";

  // ── Row 33: Die Preparation (bottom) ───────────────────────────────────
  o += "<tr>";
  o += '<td colspan="8" class="bl desc">Die Runner Raiser Cleaning / Coating</td>';
  o += `<td colspan="8" class="ac">${esc(record.dieRunnerRaiserCleaning || "")}</td>`;
  o += '<td colspan="9" class="bl ac">DPT</td>';
  o += `<td colspan="6" class="ac">${esc(s1.dpt || "")}</td>`;
  o += `<td colspan="16" class="ac">${esc(s1.setsRejected || "")} Set Rejected</td>`;
  o += "</tr>";

  // ── Row 34: Instruction to Operator ────────────────────────────────────
  o += '<tr><td colspan="55" class="bl desc inst">'
    + " Instruction to Operator : ** No Slag/Dross at holding furnance at  any time"
    + "      ** Work place should be clean always"
    + "          ** Dross removing Spoon to be cleaned &amp; Re-Coated for every Shift"
    + "    **Raiser profile for M/Cyl. to be maintained at 60 X 54 mm"
    + "  **Operator need to tick the coating applied"
    + "</td></tr>";

  // ── Row 35: Instruction cont'd ─────────────────────────────────────────
  o += '<tr><td colspan="55" class="bl desc inst">'
    + "**Remove dross every pouring by moving the spoon before taking the metal ."
    + "   ** Record the Dross Cleaning Every 20 mins once"
    + "   ** First and second shot to be rejected for every Touch up coat &amp; after 5 mins of machine idleness"
    + "  *** Voice alarm provided for coating verification."
    + "</td></tr>";

  // ── Row 36: Shift labels ───────────────────────────────────────────────
  o += "<tr>";
  o += `<td colspan="7" rowspan="2" class="ac sign">${esc(record.inChargeSign || "")}</td>`;
  o += '<td colspan="17" class="bl ac">First Shift</td>';
  o += '<td colspan="16" class="bl ac">Second Shift</td>';
  o += '<td colspan="15" class="bl ac">Third Shift</td>';
  o += "</tr>";

  // ── Row 37: Signature values ───────────────────────────────────────────
  o += "<tr>";
  o += `<td colspan="8" class="ac sign">${esc(s1.operatorSign || "")}</td>`;
  o += `<td colspan="9" class="ac sign">${esc(s1.shiftSupervisorSign || "")}</td>`;
  o += `<td colspan="8" class="ac sign">${esc(s2.operatorSign || "")}</td>`;
  o += `<td colspan="8" class="ac sign">${esc(s2.shiftSupervisorSign || "")}</td>`;
  o += `<td colspan="7" class="ac sign">${esc(s3.operatorSign || "")}</td>`;
  o += `<td colspan="8" class="ac sign">${esc(s3.shiftSupervisorSign || "")}</td>`;
  o += "</tr>";

  // ── Row 38: Role labels ────────────────────────────────────────────────
  o += "<tr>";
  o += '<td colspan="7" class="bl ac">In - Charge Signature</td>';
  o += '<td colspan="8" class="bl ac">Operator sign</td>';
  o += '<td colspan="9" class="bl ac">Shift Supervisor Sign</td>';
  o += '<td colspan="8" class="bl ac">Operator sign</td>';
  o += '<td colspan="8" class="bl ac">Shift Supervisor Sign</td>';
  o += '<td colspan="7" class="bl ac">Operator sign</td>';
  o += '<td colspan="8" class="bl ac">Shift Supervisor Sign</td>';
  o += "</tr>";

  o += "</table></div>";
  return o;
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
