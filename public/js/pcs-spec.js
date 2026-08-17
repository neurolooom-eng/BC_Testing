// Process Check Sheet — field definitions.
//
// Structure mirrors form QC FMT 038:
//
//   Day Sheet (parent)
//     ├── Machines      one row per M/C on the line that day; a machine may
//     │                 start or stop part-way through the day
//     ├── Hourly        furnace-level readings per 30-minute slot, plus a
//     │                 Die Temp reading per running machine
//     └── Shifts        one sign-off record per shift
//
// Types, ranges and dropdown options all come from "Tolerances updated".
// This file is the single source of truth for form rendering and for
// out-of-specification validation.
//
// Field shape:
//   key        storage key
//   label      form label (mirrors the paper check sheet wording)
//   short      compact heading for the matrix view
//   type       "date" | "text" | "number" | "select"
//   unit       shown next to the input and in the spec hint
//   min/max    inclusive numeric spec range — outside this is out of spec
//   expected   exact required value (e.g. dross cleaning every 20 min)
//   options    for type "select"
//   step       numeric input step
//   required   blocks save when empty
//   note       extra guidance shown under the field

const OK_NOT_OK = ["OK", "NOT OK"];

// --- Day sheet header (parent) ------------------------------------------
const PCS_DAILY_FIELDS = [
  { key: "date", label: "Date", type: "date", required: true },
  {
    key: "line",
    label: "Line — Mando Model Line",
    type: "select",
    options: ["01", "02", "03", "06"],
    required: true,
  },
  { key: "metalGrade", label: "Metal Grade", type: "select", options: ["AC2A"], required: true },
  {
    key: "furnaceNo",
    label: "Furnace No.",
    type: "select",
    options: ["HF1", "HF2", "HF3", "HF4", "HF5", "HF6", "HF11", "HF12"],
    required: true,
  },
  { key: "degassingGas", label: "Degassing Gas", type: "select", options: ["N2"], required: true },
  {
    key: "diePreheatingAsPerSOP",
    label: "Die Pre Heating as per SOP",
    type: "select",
    options: OK_NOT_OK,
    required: true,
  },
  {
    key: "dieRunnerRaiserCleaning",
    label: "Die Runner Raiser Cleaning / Coating",
    type: "select",
    options: ["VISUALLY OK", "NOT OK"],
    required: true,
  },
  {
    key: "dieSprayCoatingApply",
    label: "Die Spray Coating Apply (Visual)",
    type: "select",
    options: OK_NOT_OK,
    required: true,
  },
  { key: "inChargeSign", label: "In-Charge Signature", type: "select", options: ["VIKENSH"] },
];

// --- Machines (child of the day sheet) ----------------------------------
// The paper sheet carries a block of these per day, one row per machine.
const PCS_MACHINE_FIELDS = [
  { key: "machineNo", label: "M/C No.", short: "M/C", type: "number", step: 1, required: true },
  { key: "bcNo", label: "BC No.", short: "BC No.", type: "text", required: true },
  {
    key: "dieCoatThickness",
    label: "Die Coat Thickness",
    short: "Die coat",
    type: "number",
    unit: "microns",
    min: 100,
    max: 150,
    required: true,
  },
  {
    key: "diePreheatTemp",
    label: "Die Preheat Temp.",
    short: "Die preheat",
    type: "number",
    unit: "°C",
    min: 225,
    max: 350,
    required: true,
  },
  {
    key: "coolingTime",
    label: "Cooling Time",
    short: "Cooling",
    type: "select",
    options: ["120", "180"],
    unit: "sec",
    required: true,
  },
  {
    key: "pouringTime",
    label: "Pouring Time",
    short: "Pouring",
    type: "number",
    unit: "sec",
    min: 6,
    max: 9,
    step: 0.1,
    required: true,
  },
  {
    key: "tiltingTime",
    label: "Tilting Time",
    short: "Tilting",
    type: "number",
    unit: "sec",
    min: 12,
    max: 14,
    step: 0.1,
    required: true,
    // The tolerances sheet stores this as the date 2026-12-14 — Excel
    // autocorrected "12-14" into a date. Read here as 12–14 seconds.
    note: "Spec cell in the tolerances sheet was auto-converted to a date; read as 12–14 sec.",
  },
];

// Recorded per machine, per time slot (paper sheet row 21, "Die Temp.").
const PCS_MACHINE_HOURLY_FIELD = {
  key: "dieTemp",
  label: "Die Temp.",
  short: "Die Temp",
  type: "number",
  unit: "°C",
  min: 250,
  max: 350,
  required: true,
};

// --- Hourly furnace readings (child of the day sheet) -------------------
const PCS_HOURLY_FIELDS = [
  {
    key: "holdingFurnaceCharges",
    label: "Holding Furnace / No. of Charges",
    short: "Charges",
    type: "number",
    step: 1,
    required: true,
  },
  {
    key: "ingotKgs",
    label: "Ingot 50% (Kgs) + Foundry returns 50%",
    short: "Ingot kg",
    type: "number",
    unit: "kg",
    expected: 300,
    required: true,
    note: "300 kg per charge (150 ingot / 150 foundry returns).",
  },
  {
    key: "drossCleaning",
    label: "Dross Cleaning in Holding Furnace",
    short: "Dross",
    type: "number",
    unit: "min",
    expected: 20,
    required: true,
    note: "Every 20 minutes once.",
  },
  {
    key: "meltingMetalTemp",
    label: "Melting Metal Temp.",
    short: "Melt °C",
    type: "number",
    unit: "°C",
    min: 700,
    max: 800,
    required: true,
    note: "Check sheet target band is 720–740 °C; 700–800 is the hard spec limit.",
  },
  {
    key: "coverall",
    label: "Coverall per charge",
    short: "Coverall",
    type: "number",
    unit: "g",
    min: 200,
    max: 300,
    required: true,
  },
  {
    key: "degassingMin",
    label: "Degassing per charge",
    short: "Degas min",
    type: "number",
    unit: "min",
    expected: 15,
    required: true,
  },
  { key: "pressure", label: "Pressure", short: "Bar", type: "number", unit: "bar", min: 2, max: 3, step: 0.1, required: true },
  { key: "flowRate", label: "Flow Rate", short: "Lpm", type: "number", unit: "Lpm", min: 6, max: 9, step: 0.1, required: true },
  {
    key: "rotorSize",
    label: "Rotor Size",
    short: "Rotor",
    type: "select",
    options: ["100mm", "190mm"],
    required: true,
    note: "Sets the valid RPM band: 100mm → 550–650, 190mm → 350–400.",
  },
  {
    key: "rotorRpm",
    label: "Rotor RPM",
    short: "RPM",
    type: "number",
    unit: "RPM",
    step: 1,
    required: true,
    dynamicRange: (entry) =>
      entry.rotorSize === "190mm" ? { min: 350, max: 400 } : { min: 550, max: 650 },
  },
  {
    key: "gasCheckKMould",
    label: "Gas Checking — K-Mould",
    short: "K-Mould",
    type: "number",
    min: 0.0,
    max: 0.1,
    step: 0.01,
    required: true,
  },
  {
    key: "gasCheckVacuum",
    label: "Gas Checking — Vacuum Sample",
    short: "Vacuum",
    type: "number",
    min: 2.68,
    max: 2.75,
    step: 0.01,
    required: true,
  },
  { key: "roomTemp", label: "Room Temp", short: "Room °C", type: "number", unit: "°C", step: 0.1, required: true },
  { key: "humidity", label: "Humidity", short: "Hum %", type: "number", unit: "%", min: 0, max: 100, step: 0.1, required: true },
  {
    key: "holdingFurnaceTemp",
    label: "Holding Furnace Metal Temp.",
    short: "Hold °C",
    type: "number",
    unit: "°C",
    min: 730,
    max: 750,
    required: true,
  },
  {
    key: "degassingKillingTime",
    label: "Degassing Killing Time",
    short: "Kill min",
    type: "number",
    unit: "min",
    min: 10,
    max: 15,
    required: true,
  },
];

// --- Shift sign-off (child of the day sheet) ----------------------------
const PCS_SHIFTS = ["1st Shift", "2nd Shift", "3rd Shift"];
const PCS_CORE_PIN_CAVITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// A shift is one record, recorded in two parts at two points in the day:
//
//   Shift Details   set up when the shift starts, before hourly readings —
//                   which shift, the alloy in use, and the die-preparation
//                   startup checks the paper sheet groups at the top
//   Shift Sign-off  completed when the shift ends, after hourly readings —
//                   signatures, remarks, and the exceptions being signed for
//
// Split so the day sheet can present each part where it belongs in the
// working order, while both remain one shift record.
const PCS_SHIFT_DETAIL_FIELDS = [
  { key: "shift", label: "Shift", type: "select", options: PCS_SHIFTS, required: true },
  { key: "dpt", label: "DPT", type: "select", options: OK_NOT_OK, required: true },
  {
    key: "setsRejected",
    label: "Sets Rejected While Starting the Die",
    type: "number",
    unit: "sets",
    min: 3,
    max: 5,
    step: 1,
    required: true,
    note: "3 ~ 5 sets rejected while starting the die.",
  },
  { key: "bestCastAlloy", label: "Best Cast Alloy", type: "select", options: ["YES", "NO"], required: true },
  { key: "otherAlloy", label: "Other Alloy", type: "select", options: ["YES", "NO"], required: true },
  { key: "corePinComment", label: "Core Pin replacement comment", type: "text" },
];

const PCS_SHIFT_SIGNOFF_FIELDS = [
  { key: "operatorSign", label: "Operator Sign", type: "text", required: true },
  {
    key: "shiftSupervisorSign",
    label: "Shift Supervisor Sign",
    type: "select",
    options: ["VIMAL", "BHARATHI", "MOHAN", "NAVEEN", "ASHOK"],
    required: true,
  },
  { key: "signoffRemarks", label: "Remarks", type: "text" },
];

// Everything on the shift record, for validation and reporting across both
// parts.
const PCS_SHIFT_FIELDS = [...PCS_SHIFT_DETAIL_FIELDS, ...PCS_SHIFT_SIGNOFF_FIELDS];

// --- Shift status lifecycle ---------------------------------------------
//   draft     being recorded; editable
//   pending   submitted from the last hourly reading of the shift, awaiting
//             approval; locked
//   approved  signed off; locked until reopened
const PCS_SHIFT_STATUS = { DRAFT: "draft", PENDING: "pending", APPROVED: "approved" };

const PCS_SHIFT_STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
};

// --- Time slots ---------------------------------------------------------
// 30-minute slots from 6:30am through 6:00am the next day (48 slots), split
// into three 8-hour shifts of 16 slots each. The paper sheet skips 12:00am;
// that looks like a transcription slip, so it is included here.
//
// The fixed three-shift, 16-slot pattern is a placeholder for the Shift
// Master (ENH-001 in the Backlog), which will carry real shift timings.
const PCS_SLOT_MINUTES = 30;
const PCS_DAY_START_MIN = 6 * 60 + 30;

function pcsTimeSlots() {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const minutesFromStart = PCS_DAY_START_MIN + i * PCS_SLOT_MINUTES;
    const h24 = Math.floor(minutesFromStart / 60) % 24;
    const mm = minutesFromStart % 60 === 0 ? "00" : "30";
    const suffix = h24 < 12 ? "am" : "pm";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}.${mm}${suffix}`);
  }
  return slots;
}

const PCS_TIME_SLOTS = pcsTimeSlots();

const PCS_SLOTS_PER_SHIFT = 16;

function pcsShiftForSlotIndex(index) {
  return PCS_SHIFTS[Math.floor(index / PCS_SLOTS_PER_SHIFT)];
}

// Inclusive slot range covered by a shift, e.g. 1st Shift → {first:0, last:15}.
function pcsShiftSlotRange(shiftName) {
  const i = PCS_SHIFTS.indexOf(shiftName);
  if (i === -1) return null;
  return { first: i * PCS_SLOTS_PER_SHIFT, last: (i + 1) * PCS_SLOTS_PER_SHIFT - 1 };
}

// True when this slot is the final one of its shift — the point at which the
// shift can be sent for approval.
function pcsIsLastSlotOfShift(index) {
  return index % PCS_SLOTS_PER_SHIFT === PCS_SLOTS_PER_SHIFT - 1;
}

// The slot whose 30-minute window has most recently closed, relative to now.
// Used as the default selection for hourly entry, so an operator recording
// at 14:45 is offered 2.30pm rather than having to find it.
function pcsNearestCompletedSlot(dateStr) {
  if (!dateStr) return 0;
  const start = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  start.setMinutes(start.getMinutes() + PCS_DAY_START_MIN);

  const elapsedMin = (Date.now() - start.getTime()) / 60000;
  if (elapsedMin < PCS_SLOT_MINUTES) return 0; // day not started, or first slot still open
  const index = Math.floor(elapsedMin / PCS_SLOT_MINUTES) - 1;
  return Math.max(0, Math.min(47, index));
}

// --- Validation ---------------------------------------------------------
// Returns { ok, outOfSpec: [{key, label, value, reason}], missing: [labels] }
function pcsValidate(entry, fields) {
  const outOfSpec = [];
  const missing = [];

  fields.forEach((f) => {
    const raw = entry[f.key];
    const isEmpty = raw === undefined || raw === null || raw === "";

    if (isEmpty) {
      if (f.required) missing.push(f.label);
      return;
    }

    // A machine that was not running in this slot is recorded as NA, which
    // is a complete answer rather than a value to be range-checked.
    if (raw === PCS_NA) return;

    if (f.type !== "number") return;

    const value = Number(raw);
    if (Number.isNaN(value)) {
      outOfSpec.push({ key: f.key, label: f.label, value: raw, reason: "not a number" });
      return;
    }

    if (f.expected !== undefined && value !== f.expected) {
      outOfSpec.push({
        key: f.key,
        label: f.label,
        value,
        reason: `must be ${f.expected}${f.unit ? " " + f.unit : ""}`,
      });
      return;
    }

    const range = f.dynamicRange ? f.dynamicRange(entry) : { min: f.min, max: f.max };
    if (range.min !== undefined && value < range.min) {
      outOfSpec.push({
        key: f.key,
        label: f.label,
        value,
        reason: `below spec (${range.min}–${range.max}${f.unit ? " " + f.unit : ""})`,
      });
    } else if (range.max !== undefined && value > range.max) {
      outOfSpec.push({
        key: f.key,
        label: f.label,
        value,
        reason: `above spec (${range.min}–${range.max}${f.unit ? " " + f.unit : ""})`,
      });
    }
  });

  return { ok: outOfSpec.length === 0 && missing.length === 0, outOfSpec, missing };
}

// Human-readable spec hint for a field, e.g. "700–800 °C".
function pcsSpecHint(field, entry) {
  if (field.expected !== undefined) return `${field.expected}${field.unit ? " " + field.unit : ""}`;
  const range = field.dynamicRange && entry ? field.dynamicRange(entry) : { min: field.min, max: field.max };
  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}–${range.max}${field.unit ? " " + field.unit : ""}`;
  }
  return field.unit || "";
}
