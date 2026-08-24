// Templates — storage layer.
//
// Metadata lives in localStorage (same pattern as pcs-store.js).
// Uploaded file blobs live in IndexedDB so they do not bloat the
// localStorage quota.

const TPL_STORAGE_KEY = "bestcast_templates";
const TPL_IDB_NAME = "bestcast_files";
const TPL_IDB_STORE = "templates";
const TPL_IDB_VERSION = 1;

// --- localStorage metadata ------------------------------------------------

function tplLoadAll() {
  try {
    return JSON.parse(localStorage.getItem(TPL_STORAGE_KEY) || "[]");
  } catch (e) {
    console.error("Could not read templates:", e);
    return [];
  }
}

function tplSaveAll(list) {
  localStorage.setItem(TPL_STORAGE_KEY, JSON.stringify(list));
}

function tplNewId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function tplGet(id) {
  return tplLoadAll().find((t) => t.id === id) || null;
}

function tplCreate(data) {
  const list = tplLoadAll();
  const record = {
    id: tplNewId(),
    name: data.name || "Untitled",
    description: data.description || "",
    fileType: data.fileType || "",
    fileName: data.fileName || "",
    fileSize: data.fileSize || 0,
    uploadedAt: new Date().toISOString(),
    uploadedBy: data.uploadedBy || "",
    placeholders: data.placeholders || [],
    mappings: data.mappings || {},
    module: data.module || "pcs",
  };
  list.push(record);
  tplSaveAll(list);
  return record;
}

function tplUpdate(id, data) {
  const list = tplLoadAll();
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  tplSaveAll(list);
  return list[idx];
}

function tplDelete(id) {
  const list = tplLoadAll().filter((t) => t.id !== id);
  tplSaveAll(list);
  tplBlobDelete(id);
}

// --- IndexedDB file blobs -------------------------------------------------

function tplOpenDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TPL_IDB_NAME, TPL_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TPL_IDB_STORE)) {
        db.createObjectStore(TPL_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tplBlobSave(id, arrayBuffer) {
  const db = await tplOpenDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TPL_IDB_STORE, "readwrite");
    tx.objectStore(TPL_IDB_STORE).put(arrayBuffer, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function tplBlobLoad(id) {
  const db = await tplOpenDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TPL_IDB_STORE, "readonly");
    const req = tx.objectStore(TPL_IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function tplBlobDelete(id) {
  try {
    const db = await tplOpenDb();
    const tx = db.transaction(TPL_IDB_STORE, "readwrite");
    tx.objectStore(TPL_IDB_STORE).delete(id);
  } catch (_) { /* best effort */ }
}
