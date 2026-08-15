// Process Check Sheet — field definitions.
//
// Field grouping comes from "PCS Update" (Daily once / Hourly / Shift once).
// Types, ranges, and dropdown options come from "Tolerances updated".
// This file is the single source of truth for both form rendering and
// out-of-spec validation.
//
// Field shape:
//   key        storage key
//   label      form label (mirrors the paper check sheet wording)
//   type       "date" | "text" | "number" | "select"
//   unit       shown next to the input and in the spec hint
//   min/max    inclusive numeric spec range — outside this is out of spec
//   expected   exact required value (e.g. dross cleaning every 20 min)
//   options    for type "select"
//   step       numeric input step
//   required   blocks save when empty
//   note       extra guidance shown under the field

const OK_NOT_OK = ["OK", "NOT OK"];

// --- Daily once (parent record) -----------------------------------------
// One of these per date + line + machine. Owns the hourly and shift children.
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
  { key: "machineNo", label: "M/C No.", type: "number", step: 1, required: true },
  {
    key: "diePreheatTemp",
    label: "Die Pre Heat Temp.",
    type: "number",
    unit: "°C",
    min: 225,
    max: 350,
    required: true,
  },
  {
    key: "coolingTime",
    label: "Cooling Time",
    type: "select",
    options: ["120", "180"],
    unit: "sec",
    required: true,
  },
  {
    key: "pouringTime",
    label: "Pouring Time",
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
  {
    key: "inChargeSign",
    label: "In-Charge Signature",
    type: "select",
    options: ["VIKENSH"],
  },
];

// --- Hourly (child records, every 30 min across the day) ----------------
const PCS_HOURLY_FIELDS = [
  { key: "timeSlot", label: "Time", type: "select", options: [], required: true }, // filled at runtime
  {
    key: "holdingFurnaceCharges",
    label: "Holding Furnace / No. of Charges",
    type: "number",
    step: 1,
    required: true,
  },
  {
    key: "ingotKgs",
    label: "Ingot 50% (Kgs) + Foundry returns 50%",
    type: "number",
    unit: "kg",
    expected: 300,
    required: true,
    note: "300 kg per charge (150 ingot / 150 foundry returns).",
  },
  {
    key: "drossCleaning",
    label: "Dross Cleaning in Holding Furnace",
    type: "number",
    unit: "min",
    expected: 20,
    required: true,
    note: "Every 20 minutes once.",
  },
  {
    key: "meltingMetalTemp",
    label: "Melting Metal Temp.",
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
    type: "number",
    unit: "g",
    min: 200,
    max: 300,
    required: true,
  },
  {
    key: "degassingMin",
    label: "Degassing per charge",
    type: "number",
    unit: "min",
    expected: 15,
    required: true,
  },
  { key: "pressure", label: "Pressure", type: "number", unit: "bar", min: 2, max: 3, step: 0.1, required: true },
  { key: "flowRate", label: "Flow Rate", type: "number", unit: "Lpm", min: 6, max: 9, step: 0.1, required: true },
  {
    key: "rotorSize",
    label: "Rotor Size",
    type: "select",
    options: ["100mm", "190mm"],
    required: true,
    note: "Sets the valid RPM band: 100mm → 550–650, 190mm → 350–400.",
  },
  {
    key: "rotorRpm",
    label: "Rotor RPM",
    type: "number",
    unit: "RPM",
    step: 1,
    required: true,
    // Range depends on the selected rotor size.
    dynamicRange: (entry) =>
      entry.rotorSize === "190mm" ? { min: 350, max: 400 } : { min: 550, max: 650 },
  },
  {
    key: "gasCheckKMould",
    label: "Gas Checking — K-Mould",
    type: "number",
    min: 0.0,
    max: 0.1,
    step: 0.01,
    required: true,
  },
  {
    key: "gasCheckVacuum",
    label: "Gas Checking — Vacuum Sample",
    type: "number",
    min: 2.68,
    max: 2.75,
    step: 0.01,
    required: true,
  },
  { key: "roomTemp", label: "Room Temp", type: "number", unit: "°C", step: 0.1, required: true },
  { key: "humidity", label: "Humidity", type: "number", unit: "%", min: 0, max: 100, step: 0.1, required: true },
  {
    key: "holdingFurnaceTemp",
    label: "Holding Furnace Metal Temp.",
    type: "number",
    unit: "°C",
    min: 730,
    max: 750,
    required: true,
  },
  {
    key: "degassingKillingTime",
    label: "Degassing Killing Time",
    type: "number",
    unit: "min",
    min: 10,
    max: 15,
    required: true,
  },
  { key: "dieTemp", label: "Die Temp.", type: "number", unit: "°C", min: 250, max: 350, required: true },
];

// --- Shift once, 8 hrs (child records, 3 per day) -----------------------
const PCS_SHIFTS = ["1st Shift", "2nd Shift", "3rd Shift"];
const PCS_CORE_PIN_CAVITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const PCS_SHIFT_FIELDS = [
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
  { key: "degassingGas", label: "Degassing Gas", type: "select", options: ["N2"], required: true },
  { key: "bcNo", label: "BC No.", type: "number", step: 1, required: true },
  {
    key: "dieCoatThickness",
    label: "Die Coat Thickness",
    type: "number",
    unit: "microns",
    min: 100,
    max: 150,
    required: true,
  },
  { key: "operatorSign", label: "Operator Sign", type: "text", required: true },
  {
    key: "shiftSupervisorSign",
    label: "Shift Supervisor Sign",
    type: "select",
    options: ["VIMAL", "BHARATHI", "MOHAN", "NAVEEN", "ASHOK"],
    required: true,
  },
  { key: "corePinComment", label: "Core Pin replacement comment", type: "text" },
];

// --- Time slots ---------------------------------------------------------
// 30-minute slots from 6:30am through 6:00am the next day (48 slots),
// split into three 8-hour shifts of 16 slots each. The paper sheet skips
// 12:00am; that looks like a transcription slip, so it's included here.
function pcsTimeSlots() {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const minutesFromStart = 6 * 60 + 30 + i * 30;
    const h24 = Math.floor(minutesFromStart / 60) % 24;
    const mm = minutesFromStart % 60 === 0 ? "00" : "30";
    const suffix = h24 < 12 ? "am" : "pm";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}.${mm}${suffix}`);
  }
  return slots;
}

function pcsShiftForSlotIndex(index) {
  return PCS_SHIFTS[Math.floor(index / 16)];
}

PCS_HOURLY_FIELDS[0].options = pcsTimeSlots();

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
