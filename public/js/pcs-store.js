// Process Check Sheet — storage layer.
//
// TEMPORARY: records live in the browser's localStorage, so they stay on
// whichever machine entered them and are not shared between users. This
// mirrors the temporary auth setup (see BACKLOG.md) — once Supabase is
// wired up, swap these functions for table reads/writes and everything
// above this layer stays the same.

const PCS_STORAGE_KEY = "bestcast_pcs_records";

function pcsLoadAll() {
  try {
    const raw = localStorage.getItem(PCS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Could not read PCS records:", e);
    return [];
  }
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

// Creates the parent daily record. Hourly and shift entries hang off it.
function pcsCreateDaily(data, userid) {
  const records = pcsLoadAll();
  const record = {
    ...data,
    id: pcsNewId(),
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

// --- Child entries (hourly / shifts) ------------------------------------

function pcsAddChild(dailyId, kind, entry) {
  const records = pcsLoadAll();
  const record = records.find((r) => r.id === dailyId);
  if (!record) return null;
  const child = { ...entry, id: pcsNewId() };
  record[kind].push(child);
  record.updatedAt = new Date().toISOString();
  pcsSaveAll(records);
  return child;
}

function pcsUpdateChild(dailyId, kind, childId, entry) {
  const records = pcsLoadAll();
  const record = records.find((r) => r.id === dailyId);
  if (!record) return null;
  const idx = record[kind].findIndex((c) => c.id === childId);
  if (idx === -1) return null;
  record[kind][idx] = { ...record[kind][idx], ...entry };
  record.updatedAt = new Date().toISOString();
  pcsSaveAll(records);
  return record[kind][idx];
}

function pcsDeleteChild(dailyId, kind, childId) {
  const records = pcsLoadAll();
  const record = records.find((r) => r.id === dailyId);
  if (!record) return;
  record[kind] = record[kind].filter((c) => c.id !== childId);
  record.updatedAt = new Date().toISOString();
  pcsSaveAll(records);
}

// Counts out-of-spec readings across a whole daily record, so the list
// view can flag sheets that need attention.
function pcsOutOfSpecCount(record) {
  let count = 0;
  (record.hourly || []).forEach((h) => {
    count += pcsValidate(h, PCS_HOURLY_FIELDS).outOfSpec.length;
  });
  (record.shifts || []).forEach((s) => {
    count += pcsValidate(s, PCS_SHIFT_FIELDS).outOfSpec.length;
  });
  count += pcsValidate(record, PCS_DAILY_FIELDS).outOfSpec.length;
  return count;
}
