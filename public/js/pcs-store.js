// Process Check Sheet — storage layer.
//
// TEMPORARY: records live in the browser's localStorage, so they stay on
// whichever machine entered them and are not shared between users. This
// mirrors the temporary auth setup (see BACKLOG.md) — once Supabase is
// wired up, swap these functions for table reads/writes and everything
// above this layer stays the same.

const PCS_STORAGE_KEY = "bestcast_pcs_records";

// Marker for a slot in which a machine was not running. A distinct value,
// not an empty cell — "not running" is a complete answer, whereas blank
// means nobody has recorded anything yet.
const PCS_NA = "NA";

function pcsLoadAll() {
  try {
    const raw = localStorage.getItem(PCS_STORAGE_KEY);
    const records = raw ? JSON.parse(raw) : [];
    return records.map(pcsMigrate);
  } catch (e) {
    console.error("Could not read PCS records:", e);
    return [];
  }
}

// Records created before machines became a child collection carried the
// machine's details on the day sheet itself, and Die Temp on the hourly
// row. Lift them into a single machine so older sheets still open.
function pcsMigrate(record) {
  if (record.machines) return record;

  const legacyKeys = [
    "machineNo", "bcNo", "dieCoatThickness", "diePreheatTemp",
    "coolingTime", "pouringTime", "tiltingTime",
  ];
  const hasLegacyMachine = legacyKeys.some((k) => record[k] !== undefined && record[k] !== "");

  const machine = {
    id: `${record.id}_m0`,
    startSlot: 0,
    stopSlot: null,
    approval: null,
  };
  legacyKeys.forEach((k) => {
    machine[k] = record[k] ?? "";
    delete record[k];
  });

  record.machines = hasLegacyMachine ? [machine] : [];
  (record.hourly || []).forEach((h) => {
    if (h.dieTemp !== undefined) {
      h.dieTemps = hasLegacyMachine ? { [machine.id]: h.dieTemp } : {};
      delete h.dieTemp;
    } else if (!h.dieTemps) {
      h.dieTemps = {};
    }
    if (h.slotIndex === undefined) h.slotIndex = PCS_TIME_SLOTS.indexOf(h.timeSlot);
  });
  return record;
}

function pcsSaveAll(records) {
  localStorage.setItem(PCS_STORAGE_KEY, JSON.stringify(records));
}

function pcsNewId() {
  return `pcs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pcsGet(id) {
  return pcsLoadAll().find((r) => r.id === id) || null;
}

// --- Day sheet (parent) -------------------------------------------------

function pcsCreateDaily(data, userid) {
  const records = pcsLoadAll();
  const record = {
    ...data,
    id: pcsNewId(),
    machines: [],
    hourly: [],
    shifts: [],
    createdBy: userid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  records.push(record);
  pcsSaveAll(records);
  return record;
}

function pcsUpdateDaily(id, data) {
  const records = pcsLoadAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() };
  pcsSaveAll(records);
  return records[idx];
}

function pcsDeleteDaily(id) {
  pcsSaveAll(pcsLoadAll().filter((r) => r.id !== id));
}

// --- Child collections --------------------------------------------------

function pcsMutate(dailyId, fn) {
  const records = pcsLoadAll();
  const record = records.find((r) => r.id === dailyId);
  if (!record) return null;
  const result = fn(record);
  record.updatedAt = new Date().toISOString();
  pcsSaveAll(records);
  return result;
}

function pcsAddChild(dailyId, kind, entry) {
  return pcsMutate(dailyId, (record) => {
    const child = { ...entry, id: pcsNewId() };
    record[kind].push(child);
    return child;
  });
}

function pcsUpdateChild(dailyId, kind, childId, entry) {
  return pcsMutate(dailyId, (record) => {
    const idx = record[kind].findIndex((c) => c.id === childId);
    if (idx === -1) return null;
    record[kind][idx] = { ...record[kind][idx], ...entry };
    return record[kind][idx];
  });
}

function pcsDeleteChild(dailyId, kind, childId) {
  pcsMutate(dailyId, (record) => {
    record[kind] = record[kind].filter((c) => c.id !== childId);
  });
}

// --- Machines -----------------------------------------------------------
// A machine runs from startSlot until stopSlot inclusive. stopSlot null
// means it is still running at the end of the day.

function pcsAddMachine(dailyId, data, startSlot) {
  return pcsAddChild(dailyId, "machines", {
    ...data,
    startSlot: Number(startSlot) || 0,
    stopSlot: null,
    approval: null,
  });
}

function pcsStopMachine(dailyId, machineId, stopSlot) {
  return pcsUpdateChild(dailyId, "machines", machineId, { stopSlot: Number(stopSlot) });
}

function pcsResumeMachine(dailyId, machineId) {
  return pcsUpdateChild(dailyId, "machines", machineId, { stopSlot: null });
}

function pcsMachineRunningAt(machine, slotIndex) {
  if (slotIndex < (machine.startSlot ?? 0)) return false;
  if (machine.stopSlot !== null && machine.stopSlot !== undefined && slotIndex > machine.stopSlot) {
    return false;
  }
  return true;
}

function pcsMachinesRunningAt(record, slotIndex) {
  return (record.machines || []).filter((m) => pcsMachineRunningAt(m, slotIndex));
}

// The Die Temp recorded for a machine in a slot. Slots outside the
// machine's running window are NA by definition, not by omission.
function pcsDieTempFor(hourly, machine, slotIndex) {
  if (!pcsMachineRunningAt(machine, slotIndex)) return PCS_NA;
  const value = (hourly?.dieTemps || {})[machine.id];
  return value === undefined || value === "" ? "" : value;
}

// --- Hourly -------------------------------------------------------------

function pcsHourlyFor(record, slotIndex) {
  return (record.hourly || []).find((h) => h.slotIndex === slotIndex) || null;
}

function pcsSaveHourly(dailyId, slotIndex, entry) {
  return pcsMutate(dailyId, (record) => {
    const idx = (record.hourly || []).findIndex((h) => h.slotIndex === slotIndex);
    const payload = {
      ...entry,
      slotIndex,
      timeSlot: PCS_TIME_SLOTS[slotIndex],
      updatedAt: new Date().toISOString(),
    };
    if (idx === -1) {
      record.hourly.push({ ...payload, id: pcsNewId(), approval: null });
      return record.hourly[record.hourly.length - 1];
    }
    record.hourly[idx] = { ...record.hourly[idx], ...payload };
    return record.hourly[idx];
  });
}

// The latest slot for which anything has been recorded. Everything before
// it is history.
function pcsLatestRecordedSlot(record) {
  return (record.hourly || []).reduce((max, h) => Math.max(max, h.slotIndex ?? -1), -1);
}

// Past data locks once a later slot has been recorded, so a correction is
// possible while an entry is still the most recent one but not after the
// operator has moved on. Approval locks a row outright.
function pcsHourlyLocked(record, slotIndex) {
  const entry = pcsHourlyFor(record, slotIndex);
  if (entry && entry.approval) return true;
  return slotIndex < pcsLatestRecordedSlot(record);
}

// --- Approvals ----------------------------------------------------------

function pcsApprove(dailyId, kind, childId, userid) {
  return pcsUpdateChild(dailyId, kind, childId, {
    approval: { by: userid, at: new Date().toISOString() },
  });
}

function pcsUnapprove(dailyId, kind, childId) {
  return pcsUpdateChild(dailyId, kind, childId, { approval: null });
}

function pcsApproveHourlySlot(dailyId, slotIndex, userid) {
  return pcsMutate(dailyId, (record) => {
    const entry = (record.hourly || []).find((h) => h.slotIndex === slotIndex);
    if (entry) entry.approval = { by: userid, at: new Date().toISOString() };
    return entry;
  });
}

// --- Reporting ----------------------------------------------------------

function pcsOutOfSpecCount(record) {
  let count = 0;

  (record.machines || []).forEach((m) => {
    count += pcsValidate(m, PCS_MACHINE_FIELDS).outOfSpec.length;
  });

  (record.hourly || []).forEach((h) => {
    count += pcsValidate(h, PCS_HOURLY_FIELDS).outOfSpec.length;
    (record.machines || []).forEach((m) => {
      const value = pcsDieTempFor(h, m, h.slotIndex);
      if (value === "" || value === PCS_NA) return;
      count += pcsValidate({ dieTemp: value }, [PCS_MACHINE_HOURLY_FIELD]).outOfSpec.length;
    });
  });

  (record.shifts || []).forEach((s) => {
    count += pcsValidate(s, PCS_SHIFT_FIELDS).outOfSpec.length;
  });

  count += pcsValidate(record, PCS_DAILY_FIELDS).outOfSpec.length;
  return count;
}

function pcsPendingApprovalCount(record) {
  const pending = (list) => (list || []).filter((c) => !c.approval).length;
  return pending(record.machines) + pending(record.hourly) + pending(record.shifts);
}
