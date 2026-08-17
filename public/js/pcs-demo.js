// Process Check Sheet — test data generation.
//
// TEST FIXTURE. Fills a day sheet with plausible readings so the module can
// be exercised without typing 16 slots by hand. Removed with the rest of the
// test scaffolding before the site carries real data — see BACKLOG.md.
//
// Values are derived from the field definitions rather than hardcoded, so
// generated data stays inside the acceptance limits as those limits change.
// Two modes:
//
//   in-spec      every value inside its acceptance limits
//   occasional   most values in spec, with the occasional deliberate breach,
//                so the out-of-spec highlighting, the shift sign-off
//                exception list and the sheet counters have something to
//                show

const PCS_DEMO_BREACH_RATE = 0.18; // share of readings carrying one breach

function pcsDemoPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pcsDemoRound(value, step) {
  const decimals = step && String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return Number(value.toFixed(decimals));
}

// Sensible values for numeric items that have no acceptance limits of their
// own — a count or an ambient reading, which cannot be derived from a range.
const PCS_DEMO_UNBOUNDED = {
  machineNo: () => pcsDemoPick([4, 5, 6, 12]),
  holdingFurnaceCharges: () => pcsDemoPick([1, 2, 3]),
  roomTemp: () => pcsDemoRound(28 + Math.random() * 6, 0.1),
};

const PCS_DEMO_TEXT = {
  bcNo: () => `${700 + Math.floor(Math.random() * 99)}/${600 + Math.floor(Math.random() * 99)}`,
  operatorSign: () => pcsDemoPick(["A. KUMAR", "S. RAJU", "M. DAS", "P. IYER"]),
  corePinComment: () => pcsDemoPick(["Verified", "Verified — no blockage", "Checked at start of shift"]),
  signoffRemarks: () => pcsDemoPick(["Shift ran normally.", "No stoppages.", "Handover complete."]),
};

// One value for one field. `breach` asks for a value deliberately outside
// the acceptance limits, which is only possible where limits exist.
function pcsDemoValue(field, entry, breach) {
  if (field.type === "date") return new Date().toISOString().slice(0, 10);

  if (field.type === "select") {
    const options = field.options || [];
    return options.length ? pcsDemoPick(options) : "";
  }

  if (field.type === "text") {
    const gen = PCS_DEMO_TEXT[field.key];
    return gen ? gen() : "TEST";
  }

  // Numeric.
  if (field.expected !== undefined) {
    return breach ? field.expected + 5 : field.expected;
  }

  const range = field.dynamicRange ? field.dynamicRange(entry) : { min: field.min, max: field.max };

  if (range.min === undefined || range.max === undefined) {
    const gen = PCS_DEMO_UNBOUNDED[field.key];
    return gen ? gen() : 1;
  }

  const span = range.max - range.min;
  if (breach) {
    // Push clear of the limit rather than sitting on it, so the breach is
    // unambiguous when read back.
    const over = Math.max(span * 0.25, field.step ? Number(field.step) * 5 : 1);
    return pcsDemoRound(Math.random() < 0.5 ? range.min - over : range.max + over, field.step);
  }

  // Keep inside the limits with a margin, so rounding cannot land on the
  // boundary and read as a breach.
  const margin = span * 0.15;
  return pcsDemoRound(range.min + margin + Math.random() * (span - 2 * margin), field.step);
}

// Fills a set of fields, optionally breaching exactly one of those that have
// limits to breach.
function pcsDemoFill(fields, { breach = false, seed = {} } = {}) {
  const entry = { ...seed };

  // Selects first: a dependent range (rotor RPM on rotor size) needs the
  // field it depends on to be settled before it can be generated.
  fields
    .filter((f) => f.type === "select")
    .forEach((f) => {
      if (entry[f.key] === undefined) entry[f.key] = pcsDemoValue(f, entry, false);
    });

  const breachable = fields.filter(
    (f) => f.type === "number" && (f.expected !== undefined || f.dynamicRange || (f.min !== undefined && f.max !== undefined))
  );
  const breachKey = breach && breachable.length ? pcsDemoPick(breachable).key : null;

  fields.forEach((f) => {
    if (entry[f.key] !== undefined) return;
    entry[f.key] = pcsDemoValue(f, entry, f.key === breachKey);
  });

  return entry;
}

const pcsDemoBreachNow = (mode) => mode === "occasional" && Math.random() < PCS_DEMO_BREACH_RATE;

// --- Per-module generators ----------------------------------------------

function pcsDemoDayDetails(mode) {
  return pcsDemoFill(PCS_DAILY_FIELDS, { breach: pcsDemoBreachNow(mode) });
}

// Machines are given staggered running windows so the NA handling and the
// generated shift remarks have something real to describe.
function pcsDemoMachines(dailyId, mode, count = 2) {
  const added = [];
  for (let i = 0; i < count; i++) {
    const data = pcsDemoFill(PCS_MACHINE_FIELDS, { breach: pcsDemoBreachNow(mode) });
    // The first machine runs from the start of the day; later ones join
    // part-way through, which is what actually happens on the line.
    const startSlot = i === 0 ? 0 : pcsDemoPick([4, 8, 10, 18, 34]);
    added.push(pcsAddMachine(dailyId, data, startSlot));
  }
  return added;
}

function pcsDemoShiftDetails(dailyId, shiftName, mode) {
  const data = pcsDemoFill(PCS_SHIFT_DETAIL_FIELDS, {
    breach: pcsDemoBreachNow(mode),
    seed: { shift: shiftName },
  });

  data.corePins = {};
  PCS_CORE_PIN_CAVITIES.forEach((n) => {
    // A cavity failure is a real occurrence worth showing, but rare.
    data.corePins[n] = mode === "occasional" && Math.random() < 0.05 ? "NOT OK" : "OK";
  });

  const existing = pcsShiftRecordFor(pcsGet(dailyId), shiftName);
  if (existing) return pcsUpdateChild(dailyId, "shifts", existing.id, data);
  return pcsAddChild(dailyId, "shifts", { ...data, status: PCS_SHIFT_STATUS.DRAFT, approval: null });
}

// Every slot of one shift, including a Die Temp for each machine running in
// that slot. Slots where a machine is stopped are left alone, so they read
// as NA rather than as a value.
function pcsDemoHourlyForShift(dailyId, shiftName, mode) {
  const range = pcsShiftSlotRange(shiftName);
  if (!range) return 0;

  let filled = 0;
  for (let slot = range.first; slot <= range.last; slot++) {
    const record = pcsGet(dailyId);
    if (pcsHourlyLocked(record, slot)) continue;

    const entry = pcsDemoFill(PCS_HOURLY_FIELDS, { breach: pcsDemoBreachNow(mode) });

    const dieTemps = {};
    (record.machines || []).forEach((m) => {
      if (!pcsMachineRunningAt(m, slot)) return;
      dieTemps[m.id] = pcsDemoValue(PCS_MACHINE_HOURLY_FIELD, {}, pcsDemoBreachNow(mode));
    });

    pcsSaveHourly(dailyId, slot, { ...entry, dieTemps });
    filled++;
  }
  return filled;
}

function pcsDemoSignoff(dailyId, shiftName) {
  const shiftRecord = pcsShiftRecordFor(pcsGet(dailyId), shiftName);
  if (!shiftRecord) return null;
  // Sign-off carries no acceptance limits of its own, so it has nothing to
  // breach — the exceptions it reports come from the shift's readings.
  const data = pcsDemoFill(PCS_SHIFT_SIGNOFF_FIELDS, { breach: false });
  return pcsUpdateChild(dailyId, "shifts", shiftRecord.id, data);
}

// Everything for one shift, in the order the sheet is worked through.
function pcsDemoWholeShift(dailyId, shiftName, mode) {
  pcsDemoShiftDetails(dailyId, shiftName, mode);
  const filled = pcsDemoHourlyForShift(dailyId, shiftName, mode);
  pcsDemoSignoff(dailyId, shiftName);
  return filled;
}
