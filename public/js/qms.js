// QMS Documents — Quality Management System document registry.
// Stores metadata in localStorage; file blobs in IndexedDB (same pattern as templates-store.js).

const QMS_KEY = "bestcast_qms_docs";
const QMS_CATEGORIES = ["SOP", "WI", "FMT", "REF", "MANUAL"];
const QMS_CAT_LABELS = {
  SOP: "Standard Operating Procedure",
  WI: "Work Instruction",
  FMT: "Form / Format",
  REF: "Reference",
  MANUAL: "Manual",
};

let QMS_SESSION = null;

// esc() lives in util.js — loaded before this file.
const qmsEsc = esc;

function qmsCan(actionId) {
  return typeof rbacCanDo === "function" && rbacCanDo(QMS_SESSION.userid, actionId);
}

function qmsLoad() {
  try { return JSON.parse(localStorage.getItem(QMS_KEY) || "[]"); }
  catch { return []; }
}

function qmsSave(docs) {
  localStorage.setItem(QMS_KEY, JSON.stringify(docs));
}

function qmsNewId() {
  return "qms_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// IndexedDB for file blobs
function qmsDbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("bestcast_qms_files", 1);
    req.onupgradeneeded = () => { req.result.createObjectStore("documents"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function qmsBlobSave(id, arrayBuffer) {
  const db = await qmsDbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("documents", "readwrite");
    tx.objectStore("documents").put(arrayBuffer, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function qmsBlobDelete(id) {
  const db = await qmsDbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("documents", "readwrite");
    tx.objectStore("documents").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Render
function qmsRender() {
  const root = document.getElementById("qms-root");
  const docs = qmsLoad();
  const canUpload = qmsCan("action.qms.upload");
  const canEdit = qmsCan("action.qms.edit");
  const canDelete = qmsCan("action.qms.delete");

  const hash = (window.location.hash || "").replace("#/", "");

  if (hash === "upload" && canUpload) return qmsRenderUpload(root);

  const search = (document.getElementById("qms-search")?.value || "").toLowerCase();

  const filtered = search
    ? docs.filter((d) =>
        (d.docNumber || "").toLowerCase().includes(search) ||
        (d.title || "").toLowerCase().includes(search) ||
        (d.category || "").toLowerCase().includes(search))
    : docs;

  const catGroups = {};
  QMS_CATEGORIES.forEach((c) => { catGroups[c] = []; });
  filtered.forEach((d) => {
    const cat = QMS_CATEGORIES.includes(d.category) ? d.category : "REF";
    catGroups[cat].push(d);
  });

  root.innerHTML = `
    <h1>QMS Documents</h1>
    <p class="subtitle">Quality Management System document registry.</p>
    <div class="btn-row" style="margin-bottom:18px;">
      <input type="text" class="qms-search" id="qms-search" placeholder="Search documents…"
             value="${qmsEsc(search)}">
      ${canUpload ? '<a class="btn" href="#/upload">Upload Document</a>' : ""}
    </div>
    <div class="qms-stats">
      ${QMS_CATEGORIES.map((c) => `<div class="qms-stat">
        <span class="qms-stat-count">${catGroups[c].length}</span>
        <span class="qms-stat-label">${c}</span>
      </div>`).join("")}
    </div>
    ${QMS_CATEGORIES.map((c) => {
      if (!catGroups[c].length) return "";
      return `
        <div class="qms-category">
          <h2>${c} — ${qmsEsc(QMS_CAT_LABELS[c])}</h2>
          <div class="table-wrap">
            <table class="cfg-table">
              <thead>
                <tr><th>Doc #</th><th>Title</th><th>Rev</th><th>File</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                ${catGroups[c].map((d) => `
                  <tr>
                    <td class="mono">${qmsEsc(d.docNumber)}</td>
                    <td>${qmsEsc(d.title)}</td>
                    <td>${qmsEsc(d.revision)}</td>
                    <td>${qmsEsc(d.fileName || "—")}</td>
                    <td class="muted-xs">${d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : "—"}</td>
                    <td class="actions-cell">
                      ${canEdit ? `<button class="btn btn-sm btn-secondary qms-edit" data-id="${d.id}">Edit</button>` : ""}
                      ${canDelete ? `<button class="btn btn-sm btn-danger qms-del" data-id="${d.id}">Delete</button>` : ""}
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </div>`;
    }).join("")}
    ${filtered.length === 0 ? '<p class="empty-state">No documents found.</p>' : ""}`;

  root.querySelector("#qms-search")?.addEventListener("input", () => qmsRender());

  root.querySelectorAll(".qms-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!confirm("Delete this document?")) return;
      const list = qmsLoad().filter((d) => d.id !== id);
      qmsSave(list);
      qmsBlobDelete(id).catch(() => {});
      qmsRender();
    });
  });

  root.querySelectorAll(".qms-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const list = qmsLoad();
      const doc = list.find((d) => d.id === id);
      if (!doc) return;
      qmsEditModal(doc, list);
    });
  });
}

function qmsRenderUpload(root) {
  root.innerHTML = `
    <div class="breadcrumb"><a href="qms-documents.html">QMS Documents</a> / Upload</div>
    <h1>Upload Document</h1>
    <form id="qms-upload-form" class="qms-form">
      <label>Document Number <input type="text" id="qms-docnum" required placeholder="e.g. QC FMT 038"></label>
      <label>Title <input type="text" id="qms-title" required placeholder="Process Checksheet"></label>
      <label>Category
        <select id="qms-cat">
          ${QMS_CATEGORIES.map((c) => `<option value="${c}">${c} — ${QMS_CAT_LABELS[c]}</option>`).join("")}
        </select>
      </label>
      <label>Revision <input type="text" id="qms-rev" placeholder="Rev.10"></label>
      <label>Description <textarea id="qms-desc" rows="3" placeholder="Optional notes…"></textarea></label>
      <label>File <input type="file" id="qms-file" accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.txt,.csv"></label>
      <div class="btn-row" style="margin-top:14px;">
        <button type="submit" class="btn">Save</button>
        <a class="btn btn-secondary" href="qms-documents.html">Cancel</a>
      </div>
      <div id="qms-alert"></div>
    </form>`;

  root.querySelector("#qms-upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = root.querySelector("#qms-alert");
    const docNumber = root.querySelector("#qms-docnum").value.trim();
    const title = root.querySelector("#qms-title").value.trim();
    if (!docNumber || !title) { alert.innerHTML = '<div class="alert alert-danger">Document number and title are required.</div>'; return; }

    const fileInput = root.querySelector("#qms-file");
    const file = fileInput.files[0];

    const doc = {
      id: qmsNewId(),
      docNumber,
      title,
      category: root.querySelector("#qms-cat").value,
      revision: root.querySelector("#qms-rev").value.trim(),
      description: root.querySelector("#qms-desc").value.trim(),
      fileName: file ? file.name : "",
      fileSize: file ? file.size : 0,
      fileType: file ? file.name.split(".").pop().toLowerCase() : "",
      uploadedAt: new Date().toISOString(),
      uploadedBy: QMS_SESSION.userid,
    };

    if (file) {
      try {
        const buf = await file.arrayBuffer();
        await qmsBlobSave(doc.id, buf);
      } catch (err) {
        alert.innerHTML = '<div class="alert alert-danger">Failed to save file.</div>';
        return;
      }
    }

    const list = qmsLoad();
    list.push(doc);
    qmsSave(list);
    window.location.hash = "#/";
    qmsRender();
  });
}

function qmsEditModal(doc, list) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" style="max-width:520px;">
      <h2>Edit Document</h2>
      <form id="qms-edit-form" class="qms-form">
        <label>Document Number <input type="text" id="qms-e-docnum" value="${qmsEsc(doc.docNumber)}" required></label>
        <label>Title <input type="text" id="qms-e-title" value="${qmsEsc(doc.title)}" required></label>
        <label>Category
          <select id="qms-e-cat">
            ${QMS_CATEGORIES.map((c) => `<option value="${c}"${c === doc.category ? " selected" : ""}>${c}</option>`).join("")}
          </select>
        </label>
        <label>Revision <input type="text" id="qms-e-rev" value="${qmsEsc(doc.revision)}"></label>
        <label>Description <textarea id="qms-e-desc" rows="3">${qmsEsc(doc.description)}</textarea></label>
        <div class="btn-row" style="margin-top:14px;">
          <button type="submit" class="btn">Save</button>
          <button type="button" class="btn btn-secondary" id="qms-e-cancel">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector("#qms-e-cancel").addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector("#qms-edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    doc.docNumber = modal.querySelector("#qms-e-docnum").value.trim();
    doc.title = modal.querySelector("#qms-e-title").value.trim();
    doc.category = modal.querySelector("#qms-e-cat").value;
    doc.revision = modal.querySelector("#qms-e-rev").value.trim();
    doc.description = modal.querySelector("#qms-e-desc").value.trim();
    qmsSave(list);
    modal.remove();
    qmsRender();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  QMS_SESSION = renderTopbar("qms-documents");
  if (!QMS_SESSION) return;
  if (!rbacRequirePage(QMS_SESSION, "page.qms_documents")) return;
  qmsRender();
  window.addEventListener("hashchange", qmsRender);
});
