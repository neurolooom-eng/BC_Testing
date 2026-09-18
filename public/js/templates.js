// Templates — UI.
//
// Hash router:
//   #/              template list
//   #/new           upload a new template
//   #/template/:id  detail view with metadata + field mapping

let TPL_SESSION = null;

function tplCan(actionId) {
  if (typeof rbacCanDo !== "function") return true;
  return rbacCanDo(TPL_SESSION.userid, actionId);
}

// esc() and el() live in util.js — loaded before this file.
const tplEscape = esc;
const tplEl = el;

function tplFormatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tplFileExt(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

// --- PCS field catalogue for the mapping dropdowns -----------------------

function tplPcsFieldOptions() {
  const groups = [
    { label: "Day Details", fields: PCS_DAILY_FIELDS },
    { label: "Machine", fields: PCS_MACHINE_FIELDS },
    { label: "Hourly Readings", fields: PCS_HOURLY_FIELDS },
    { label: "Die Temp (per machine)", fields: [PCS_MACHINE_HOURLY_FIELD] },
    { label: "Shift Details", fields: PCS_SHIFT_DETAIL_FIELDS },
    { label: "Shift Sign-off", fields: PCS_SHIFT_SIGNOFF_FIELDS },
  ];
  const computed = [
    { key: "_shift_name", label: "Shift name" },
    { key: "_time_slot", label: "Time slot label" },
    { key: "_machine_status", label: "Machine running status" },
    { key: "_approval_status", label: "Approval status" },
    { key: "_date_formatted", label: "Formatted date" },
    { key: "_sheet_id", label: "Sheet ID" },
  ];
  groups.push({ label: "Computed", fields: computed });
  return groups;
}

// --- routing -------------------------------------------------------------

function tplRoute() {
  const hash = location.hash || "#/";
  const root = document.getElementById("templates-root");

  if (hash === "#/new") {
    renderUpload(root);
  } else if (hash.startsWith("#/template/")) {
    const id = hash.split("/")[2];
    renderDetail(root, id);
  } else {
    renderList(root);
  }
}

// --- list ----------------------------------------------------------------

function renderList(root) {
  const templates = tplLoadAll();
  const canUpload = tplCan("action.templates.upload");

  root.innerHTML = `
    <h1 style="margin-bottom:4px;">Templates</h1>
    <p class="muted-xs" style="margin-bottom:18px;">Manage document templates and field mappings for printable records.</p>
    <div class="btn-row" style="margin-bottom:18px;">
      ${canUpload ? '<a class="btn" href="#/new">+ Upload Template</a>' : ""}
    </div>
    ${
      templates.length === 0
        ? '<p class="muted-xs">No templates yet. Upload a Word or Excel template to get started.</p>'
        : `<div class="tpl-list">
            ${templates
              .map(
                (t) => `
              <div class="tpl-card" data-tpl-id="${tplEscape(t.id)}">
                <h3>${tplEscape(t.name)}</h3>
                <p class="tpl-meta">
                  ${tplEscape(t.fileName)}<br>
                  ${tplFormatSize(t.fileSize)} &middot; Uploaded ${new Date(t.uploadedAt).toLocaleDateString()}
                  ${t.uploadedBy ? ` by ${tplEscape(t.uploadedBy)}` : ""}
                </p>
                <span class="tpl-badge ${tplEscape(t.fileType)}">${tplEscape(t.fileType || "file")}</span>
                ${
                  t.placeholders.length
                    ? `<p class="tpl-meta" style="margin-top:8px;">${t.placeholders.length} placeholder${t.placeholders.length !== 1 ? "s" : ""} &middot; ${Object.keys(t.mappings || {}).length} mapped</p>`
                    : ""
                }
              </div>`
              )
              .join("")}
          </div>`
    }`;

  root.querySelectorAll(".tpl-card").forEach((card) => {
    card.addEventListener("click", () => {
      location.hash = `#/template/${card.dataset.tplId}`;
    });
  });
}

// --- upload --------------------------------------------------------------

function renderUpload(root) {
  if (!tplCan("action.templates.upload")) {
    root.innerHTML = '<p class="muted-xs">You do not have permission to upload templates.</p>';
    return;
  }

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:14px;">
      <a class="btn btn-secondary" href="#/">&larr; Back</a>
    </div>
    <h1 style="margin-bottom:18px;">Upload Template</h1>

    <div class="tpl-upload-zone" id="upload-zone">
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <p><strong>Click or drag</strong> a Word (.docx, .doc) or Excel (.xlsx, .xls) file here</p>
      <input type="file" id="file-input" accept=".xlsx,.xls,.docx,.doc" style="display:none;">
    </div>

    <div id="upload-preview" style="display:none;">
      <div class="card" style="margin-bottom:18px; padding:20px;">
        <h3 id="preview-name"></h3>
        <p class="tpl-meta" id="preview-meta"></p>
      </div>
      <div class="field-grid">
        <div class="field">
          <label>Template Name</label>
          <input type="text" id="tpl-name">
        </div>
        <div class="field">
          <label>Description</label>
          <input type="text" id="tpl-desc" placeholder="Optional description">
        </div>
        <div class="field">
          <label>Module</label>
          <select id="tpl-module">
            <option value="pcs" selected>Process Check Sheet</option>
          </select>
        </div>
      </div>
      <div class="btn-row" style="margin-top:18px;">
        <button class="btn" id="save-template">Save Template</button>
        <button class="btn btn-secondary" id="cancel-upload">Cancel</button>
      </div>
      <div id="upload-alert"></div>
    </div>`;

  const zone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  let selectedFile = null;

  zone.addEventListener("click", () => fileInput.click());
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const ext = tplFileExt(file.name);
    if (!["xlsx", "xls", "docx", "doc"].includes(ext)) {
      document.getElementById("upload-alert").innerHTML =
        '<div class="alert alert-danger" style="margin-top:12px;">Only .xlsx, .xls, .docx and .doc files are supported.</div>';
      return;
    }
    selectedFile = file;
    document.getElementById("preview-name").textContent = file.name;
    document.getElementById("preview-meta").textContent =
      `${tplFormatSize(file.size)} · ${ext.toUpperCase()} · ${new Date().toLocaleDateString()}`;
    document.getElementById("tpl-name").value = file.name.replace(/\.[^.]+$/, "");
    document.getElementById("upload-preview").style.display = "block";
    zone.style.display = "none";
  }

  document.getElementById("cancel-upload")?.addEventListener("click", () => {
    location.hash = "#/";
  });

  document.getElementById("save-template")?.addEventListener("click", async () => {
    if (!selectedFile) return;
    const name = document.getElementById("tpl-name").value.trim();
    if (!name) {
      document.getElementById("upload-alert").innerHTML =
        '<div class="alert alert-danger" style="margin-top:12px;">Please enter a template name.</div>';
      return;
    }

    const ext = tplFileExt(selectedFile.name);
    const record = tplCreate({
      name,
      description: document.getElementById("tpl-desc").value.trim(),
      fileType: ext,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      uploadedBy: TPL_SESSION.fullName || TPL_SESSION.userid,
      module: document.getElementById("tpl-module").value,
    });

    try {
      const buf = await selectedFile.arrayBuffer();
      await tplBlobSave(record.id, buf);
    } catch (e) {
      console.error("Failed to save file blob:", e);
    }

    location.hash = `#/template/${record.id}`;
  });
}

// --- detail / mapping ----------------------------------------------------

function renderDetail(root, id) {
  const tpl = tplGet(id);
  if (!tpl) {
    root.innerHTML = '<p class="muted-xs">Template not found.</p><a class="btn btn-secondary" href="#/">&larr; Back</a>';
    return;
  }

  const canEdit = tplCan("action.templates.edit");
  const canDelete = tplCan("action.templates.delete");
  const extClass = tpl.fileType || "xlsx";

  root.innerHTML = `
    <div class="btn-row" style="margin-bottom:14px;">
      <a class="btn btn-secondary" href="#/">&larr; Back</a>
      ${canDelete ? `<button class="btn btn-secondary" id="delete-tpl" style="margin-left:auto;">Delete Template</button>` : ""}
    </div>

    <div class="tpl-detail-header">
      <div class="file-icon ${tplEscape(extClass)}">${tplEscape(extClass.toUpperCase().slice(0, 4))}</div>
      <div class="detail-meta">
        <h2>${tplEscape(tpl.name)}</h2>
        <p>${tplEscape(tpl.fileName)} &middot; ${tplFormatSize(tpl.fileSize)}<br>
        Uploaded ${new Date(tpl.uploadedAt).toLocaleDateString()}${tpl.uploadedBy ? ` by ${tplEscape(tpl.uploadedBy)}` : ""}</p>
        ${tpl.description ? `<p style="margin-top:4px;">${tplEscape(tpl.description)}</p>` : ""}
      </div>
    </div>

    <details class="sheet-block" open>
      <summary><h2>Placeholders</h2><span class="muted-xs">Tokens in the template to be filled with data</span></summary>
      <div class="card" style="padding:20px;">
        <p class="muted-xs" style="margin-bottom:10px;">
          Add the placeholder tokens from your template. These will be mapped to data fields below.
        </p>
        <div class="tag-input-wrap" id="tag-input-wrap"${canEdit ? "" : ' style="pointer-events:none;opacity:0.6;"'}>
          ${tpl.placeholders.map((p) => `<span class="tag" data-tag="${tplEscape(p)}">${tplEscape(p)} <button type="button">&times;</button></span>`).join("")}
          <input type="text" id="tag-input" placeholder="Type a placeholder and press Enter">
        </div>
      </div>
    </details>

    <details class="sheet-block" open>
      <summary><h2>Field Mapping</h2><span class="muted-xs">Connect placeholders to data fields</span></summary>
      <div class="card" style="padding:20px;">
        ${
          tpl.placeholders.length === 0
            ? '<p class="muted-xs">Add placeholders above to map them to fields.</p>'
            : renderMappingTable(tpl, canEdit)
        }
        ${canEdit && tpl.placeholders.length ? '<div class="btn-row" style="margin-top:14px;"><button class="btn" id="save-mappings">Save Mappings</button></div>' : ""}
      </div>
    </details>`;

  // --- tag input ---
  if (canEdit) {
    const wrap = document.getElementById("tag-input-wrap");
    const input = document.getElementById("tag-input");

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = input.value.trim().replace(/,/g, "");
        if (!val) return;
        if (tpl.placeholders.includes(val)) { input.value = ""; return; }
        tpl.placeholders.push(val);
        tplUpdate(id, { placeholders: tpl.placeholders });
        renderDetail(root, id);
      }
      if (e.key === "Backspace" && !input.value && tpl.placeholders.length) {
        tpl.placeholders.pop();
        tplUpdate(id, { placeholders: tpl.placeholders });
        renderDetail(root, id);
      }
    });

    wrap.addEventListener("click", (e) => {
      if (e.target.closest(".tag button")) {
        const tag = e.target.closest(".tag").dataset.tag;
        tpl.placeholders = tpl.placeholders.filter((p) => p !== tag);
        const mappings = { ...tpl.mappings };
        delete mappings[tag];
        tplUpdate(id, { placeholders: tpl.placeholders, mappings });
        renderDetail(root, id);
        return;
      }
      input.focus();
    });
  }

  // --- save mappings ---
  document.getElementById("save-mappings")?.addEventListener("click", () => {
    const mappings = {};
    root.querySelectorAll(".mapping-select").forEach((sel) => {
      if (sel.value) mappings[sel.dataset.placeholder] = sel.value;
    });
    tplUpdate(id, { mappings });
    const btn = document.getElementById("save-mappings");
    const orig = btn.textContent;
    btn.textContent = "Saved";
    setTimeout(() => { btn.textContent = orig; }, 1200);
  });

  // --- delete ---
  document.getElementById("delete-tpl")?.addEventListener("click", () => {
    if (!confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) return;
    tplDelete(id);
    location.hash = "#/";
  });
}

function renderMappingTable(tpl, canEdit) {
  const groups = tplPcsFieldOptions();
  const optionsHtml = groups
    .map(
      (g) =>
        `<optgroup label="${tplEscape(g.label)}">
          ${g.fields.map((f) => `<option value="${tplEscape(f.key)}">${tplEscape(f.label || f.key)}</option>`).join("")}
        </optgroup>`
    )
    .join("");

  return `
    <table class="mapping-table">
      <thead><tr><th>Placeholder</th><th>Maps to</th></tr></thead>
      <tbody>
        ${tpl.placeholders
          .map(
            (p) => `
          <tr>
            <td class="placeholder-name">${tplEscape(p)}</td>
            <td>
              <select class="mapping-select" data-placeholder="${tplEscape(p)}"${canEdit ? "" : " disabled"}>
                <option value="">— Select field —</option>
                ${optionsHtml.replace(
                  `value="${tplEscape(tpl.mappings[p])}"`,
                  `value="${tplEscape(tpl.mappings[p])}" selected`
                )}
              </select>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

// --- init ----------------------------------------------------------------

(function init() {
  TPL_SESSION = renderTopbar("templates");
  if (!TPL_SESSION) return;
  rbacLoad();

  if (typeof rbacCanViewPage === "function" && !rbacCanViewPage(TPL_SESSION.userid, "page.templates")) {
    document.getElementById("templates-root").innerHTML =
      '<p class="muted-xs" style="padding:40px;">You do not have permission to view this page.</p>';
    return;
  }

  window.addEventListener("hashchange", tplRoute);
  tplRoute();
})();
