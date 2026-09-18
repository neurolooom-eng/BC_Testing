// Configuration — users, roles, access control and resource registries.
//
//   #/users        accounts, role assignment, per-user exceptions, cloning
//   #/roles        roles and their permission matrix
//   #/pages        …
//   #/actions      resource registries, one per type
//   #/exec-links
//   #/sheet-links
//   #/variables
//   #/matrix       roles × resources overview

// esc() and el() live in util.js — loaded before this file.

let CFG_SESSION = null;

const CFG_TABS = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Roles" },
  { key: "matrix", label: "Access Matrix" },
  { key: "tolerances", label: "Tolerances" },
  { key: "pages", label: "Pages", type: "page" },
  { key: "actions", label: "Actions", type: "action" },
  { key: "exec-links", label: "Exec Links", type: "exec_link" },
  { key: "sheet-links", label: "Sheet Links", type: "sheet_link" },
  { key: "variables", label: "Variables", type: "variable" },
  { key: "masters", label: "Masters" },
  { key: "data", label: "Data" },
];

// Fields shown when maintaining each kind of resource.
const CFG_RESOURCE_FIELDS = {
  page: [
    { key: "id", label: "ID", required: true, mono: true },
    { key: "label", label: "Label", required: true },
    { key: "path", label: "Path" },
    { key: "group", label: "Group" },
    { key: "description", label: "Description", wide: true },
  ],
  action: [
    { key: "id", label: "ID", required: true, mono: true },
    { key: "label", label: "Label", required: true },
    { key: "group", label: "Group" },
    { key: "description", label: "Description", wide: true },
  ],
  exec_link: [
    { key: "id", label: "ID", required: true, mono: true },
    { key: "label", label: "Label", required: true },
    { key: "url", label: "Target", required: true },
    { key: "confirm", label: "Confirm before running", type: "boolean" },
    { key: "description", label: "Description", wide: true },
  ],
  sheet_link: [
    { key: "id", label: "ID", required: true, mono: true },
    { key: "label", label: "Label", required: true },
    { key: "url", label: "Location", required: true },
    { key: "description", label: "Description", wide: true },
  ],
  variable: [
    { key: "id", label: "ID", required: true, mono: true },
    { key: "label", label: "Label", required: true },
    { key: "value", label: "Value" },
    { key: "type", label: "Type", type: "select", options: ["text", "number", "boolean"] },
    { key: "unit", label: "Unit" },
    { key: "description", label: "Description", wide: true },
  ],
};

// ---------- helpers -----------------------------------------------------

const cfgEl = el;

function cfgActiveTab() {
  const key = (window.location.hash || "").replace("#/", "");
  return CFG_TABS.some((t) => t.key === key) ? key : "users";
}

function cfgCan(actionId) {
  return rbacCanDo(CFG_SESSION.userid, actionId);
}

function cfgDenied(message) {
  return `<div class="alert alert-danger"><p>${esc(message)}</p></div>`;
}

function cfgReload() {
  cfgRender();
}

function cfgCloseModal(modal) {
  modal.remove();
}

function cfgModal(title, bodyHtml, onSave, width) {
  const modal = cfgEl(`
    <div class="modal-backdrop">
      <div class="modal"${width ? ` style="max-width:${width};"` : ""}>
        <h2>${esc(title)}</h2>
        <div id="cfg-modal-body">${bodyHtml}</div>
        <div id="cfg-modal-alert"></div>
        <div class="btn-row" style="margin-top:18px;">
          <button class="btn" id="cfg-save">Save</button>
          <button class="btn btn-secondary" id="cfg-cancel">Cancel</button>
        </div>
      </div>
    </div>`);
  document.body.appendChild(modal);
  modal.querySelector("#cfg-cancel").addEventListener("click", () => cfgCloseModal(modal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cfgCloseModal(modal);
  });
  modal.querySelector("#cfg-save").addEventListener("click", () => onSave(modal));
  return modal;
}

function cfgAlert(modal, message, kind) {
  modal.querySelector("#cfg-modal-alert").innerHTML =
    `<div class="alert alert-${kind || "danger"}">${esc(message)}</div>`;
}

// ---------- shell -------------------------------------------------------

function cfgRender() {
  const root = document.getElementById("config-root");
  const tab = cfgActiveTab();
  const config = rbacLoad();

  root.innerHTML = `
    <h1>Configuration</h1>
    <p class="subtitle">
      Users, roles and what each may reach. Access comes from roles by default;
      per-user exceptions are possible and are always shown as exceptions.
    </p>
    <div class="tabs">
      ${CFG_TABS.map(
        (t) => `<a class="tab${t.key === tab ? " active" : ""}" href="#/${t.key}">${esc(t.label)}</a>`
      ).join("")}
    </div>
    <div id="cfg-body"></div>`;

  const body = root.querySelector("#cfg-body");
  const meta = CFG_TABS.find((t) => t.key === tab);

  if (tab === "users") cfgRenderUsers(body, config);
  else if (tab === "roles") cfgRenderRoles(body, config);
  else if (tab === "matrix") cfgRenderMatrix(body, config);
  else if (tab === "tolerances") cfgRenderTolerances(body);
  else if (tab === "masters") cfgRenderMasters(body);
  else if (tab === "data") cfgRenderDataMgmt(body);
  else cfgRenderResources(body, config, meta.type, meta.label);
}

// ---------- users -------------------------------------------------------

function cfgRenderUsers(body, config) {
  const canManage = cfgCan("action.config.users.manage");
  const canClone = cfgCan("action.config.access.clone");

  const rows = config.users
    .map((u) => {
      const summary = rbacUserSummary(u, config);
      const roleNames = (u.roleIds || [])
        .map((id) => rbacGetRole(id, config)?.name)
        .filter(Boolean);
      return `
        <tr>
          <td><strong>${esc(u.userid)}</strong><br><span class="muted-xs">${esc(u.fullName || "")}</span></td>
          <td>${
            roleNames.length
              ? roleNames.map((n) => `<span class="role-chip">${esc(n)}</span>`).join(" ")
              : `<span class="muted-xs">No role assigned</span>`
          }</td>
          <td>${summary.roleGranted}</td>
          <td>${
            summary.extra
              ? `<span class="pending-badge">+${summary.extra}</span>`
              : `<span class="muted-xs">—</span>`
          }</td>
          <td>${
            summary.denied
              ? `<span class="flag-badge">−${summary.denied}</span>`
              : `<span class="muted-xs">—</span>`
          }</td>
          <td>${u.active === false ? `<span class="stopped-badge">Inactive</span>` : `<span class="ok-badge">Active</span>`}</td>
          <td class="row-actions">
            <button class="link-btn" data-access="${esc(u.userid)}">Access</button>
            ${canManage ? `<button class="link-btn" data-edit-user="${esc(u.userid)}">Edit</button>` : ""}
            ${canClone ? `<button class="link-btn" data-clone-from="${esc(u.userid)}">Clone…</button>` : ""}
            ${
              canManage && u.userid !== CFG_SESSION.userid
                ? `<button class="link-btn danger" data-del-user="${esc(u.userid)}">Delete</button>`
                : ""
            }
          </td>
        </tr>`;
    })
    .join("");

  body.innerHTML = `
    ${canManage ? "" : cfgDenied("You may view users but not change them. 'Manage users' is required.")}
    <div class="btn-row" style="margin-bottom:14px;">
      ${canManage ? `<button class="btn" id="add-user">+ Add user</button>` : ""}
      <span class="muted-xs">
        <strong>Role</strong> is the number of operations granted by roles ·
        <strong>Extra</strong> and <strong>Denied</strong> are per-user exceptions.
      </span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>User</th><th>Roles</th><th>Role grants</th><th>Extra</th><th>Denied</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const addBtn = body.querySelector("#add-user");
  if (addBtn) addBtn.addEventListener("click", () => cfgUserModal(null));

  body.querySelectorAll("[data-edit-user]").forEach((b) =>
    b.addEventListener("click", () => cfgUserModal(b.dataset.editUser))
  );
  body.querySelectorAll("[data-access]").forEach((b) =>
    b.addEventListener("click", () => cfgAccessModal(b.dataset.access))
  );
  body.querySelectorAll("[data-clone-from]").forEach((b) =>
    b.addEventListener("click", () => cfgCloneModal(b.dataset.cloneFrom))
  );
  body.querySelectorAll("[data-del-user]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm(`Delete user "${b.dataset.delUser}"? Their role assignments and exceptions are removed.`)) return;
      rbacDeleteUser(b.dataset.delUser);
      cfgReload();
    })
  );
}

function cfgUserModal(userid) {
  const config = rbacLoad();
  const user = userid ? rbacGetUser(userid, config) : null;
  const u = user || { userid: "", fullName: "", email: "", roleIds: [], active: true };

  const roleChecks = config.roles
    .map(
      (r) => `
      <label class="check-row">
        <input type="checkbox" data-role="${esc(r.id)}"${(u.roleIds || []).includes(r.id) ? " checked" : ""}>
        <span><strong>${esc(r.name)}</strong><br><span class="muted-xs">${esc(r.description || "")}</span></span>
      </label>`
    )
    .join("");

  const modal = cfgModal(
    userid ? `Edit user — ${userid}` : "Add user",
    `
    <div class="field-grid">
      <div class="field"><label>User ID</label><input data-key="userid" value="${esc(u.userid)}"${userid ? " disabled" : ""}></div>
      <div class="field"><label>Full name</label><input data-key="fullName" value="${esc(u.fullName)}"></div>
      <div class="field"><label>Email</label><input data-key="email" value="${esc(u.email || "")}"></div>
      <div class="field">
        <label>Status</label>
        <select data-key="active">
          <option value="true"${u.active !== false ? " selected" : ""}>Active</option>
          <option value="false"${u.active === false ? " selected" : ""}>Inactive</option>
        </select>
      </div>
    </div>
    <fieldset class="fieldset" style="margin-top:16px;">
      <legend>Roles — access comes from these</legend>
      <div class="check-list">${roleChecks}</div>
    </fieldset>`,
    (m) => {
      const get = (k) => m.querySelector(`[data-key="${k}"]`).value.trim();
      const id = userid || get("userid");
      if (!id) return cfgAlert(m, "User ID is required.");
      const roleIds = [...m.querySelectorAll("[data-role]:checked")].map((c) => c.dataset.role);
      const data = {
        userid: id,
        fullName: get("fullName"),
        email: get("email"),
        active: get("active") === "true",
        roleIds,
      };
      const saved = rbacUpsertUser(data, userid);
      if (!saved) return cfgAlert(m, `A user with ID "${id}" already exists.`);
      cfgCloseModal(m);
      cfgReload();
    },
    "620px"
  );
  return modal;
}

// Effective access for one user, showing where each grant comes from and
// letting an administrator add or deny individual operations.
function cfgAccessModal(userid) {
  const config = rbacLoad();
  const user = rbacGetUser(userid, config);
  const canOverride = cfgCan("action.config.access.override");

  const sections = RBAC_TYPE_KEYS.map((type) => {
    const rows = (config.resources[type] || [])
      .map((res) => {
        const cells = RBAC_TYPES[type].ops
          .map((op) => {
            const source = rbacSourceOf(user, type, res.id, op, config);
            const has = source === "role" || source === "additional";
            const cls = { role: "src-role", additional: "src-extra", denied: "src-denied", none: "src-none" }[source];
            const title = {
              role: "Granted by role",
              additional: "Granted to this user only",
              denied: "Denied for this user",
              none: "No access",
            }[source];
            return `
              <td class="${cls}" title="${title}">
                ${
                  canOverride
                    ? `<select class="op-select" data-type="${type}" data-id="${esc(res.id)}" data-op="${op}">
                        <option value="inherit"${source === "role" || source === "none" ? " selected" : ""}>${source === "role" ? "✔ role" : "— none"}</option>
                        <option value="grant"${source === "additional" ? " selected" : ""}>+ grant</option>
                        <option value="deny"${source === "denied" ? " selected" : ""}>− deny</option>
                      </select>`
                    : has
                    ? "✔"
                    : source === "denied"
                    ? "−"
                    : "—"
                }
              </td>`;
          })
          .join("");
        return `<tr><td><strong>${esc(res.label)}</strong><br><span class="muted-xs mono">${esc(res.id)}</span></td>${cells}</tr>`;
      })
      .join("");

    return `
      <details class="sheet-block" ${type === "page" ? "open" : ""} style="margin-bottom:12px;">
        <summary><h2>${esc(RBAC_TYPES[type].label)}</h2><span class="muted-xs">${(config.resources[type] || []).length} resources</span></summary>
        <div class="table-wrap">
          <table class="dense">
            <thead><tr><th>Resource</th>${RBAC_TYPES[type].ops.map((o) => `<th>${esc(o)}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  }).join("");

  const summary = rbacUserSummary(user, config);

  const modal = cfgModal(
    `Access — ${userid}`,
    `
    <p class="subtitle">
      Roles: ${
        (user.roleIds || []).map((id) => `<span class="role-chip">${esc(rbacGetRole(id, config)?.name || id)}</span>`).join(" ") ||
        "<em>none</em>"
      }
    </p>
    <div class="legend-row">
      <span class="legend src-role">✔ role</span>
      <span class="legend src-extra">+ granted to this user</span>
      <span class="legend src-denied">− denied for this user</span>
      <span class="legend src-none">— no access</span>
    </div>
    ${
      summary.extra || summary.denied
        ? `<div class="alert alert-danger" style="margin-bottom:14px;">
            <p>This user has <strong>${summary.extra} additional</strong> and
            <strong>${summary.denied} denied</strong> operations outside their roles.
            Exceptions are harder to audit than roles — prefer changing the role, or
            creating one, where the difference applies to more than one person.</p>
          </div>`
        : ""
    }
    ${canOverride ? "" : cfgDenied("You may view this access but not change it. 'Grant per-user access' is required.")}
    ${sections}`,
    (m) => {
      if (!canOverride) return cfgCloseModal(m);
      // Rebuild both exception layers from the current selections.
      const additional = {};
      const denied = {};
      m.querySelectorAll(".op-select").forEach((sel) => {
        const { type, id, op } = sel.dataset;
        if (sel.value === "grant") {
          additional[type] = additional[type] || {};
          additional[type][id] = [...(additional[type][id] || []), op];
        } else if (sel.value === "deny") {
          denied[type] = denied[type] || {};
          denied[type][id] = [...(denied[type][id] || []), op];
        }
      });
      rbacMutate((cfg) => {
        const target = rbacGetUser(userid, cfg);
        target.additional = additional;
        target.denied = denied;
      });
      cfgCloseModal(m);
      cfgReload();
    },
    "900px"
  );

  const clearBtn = cfgEl(`<button class="btn btn-secondary" id="clear-overrides">Clear all exceptions</button>`);
  if (canOverride) {
    modal.querySelector(".btn-row").appendChild(clearBtn);
    clearBtn.addEventListener("click", () => {
      if (!confirm(`Remove every per-user exception for ${userid}, leaving role-based access only?`)) return;
      rbacClearOverrides(userid);
      cfgCloseModal(modal);
      cfgReload();
    });
  }
}

function cfgCloneModal(fromUserId) {
  const config = rbacLoad();
  const targets = config.users.filter((u) => u.userid !== fromUserId);

  if (!targets.length) {
    alert("There is no other user to clone access to.");
    return;
  }

  cfgModal(
    `Clone access from ${fromUserId}`,
    `
    <p class="subtitle">Copies access onto another user. Roles alone is the usual choice — it keeps access explainable.</p>
    <div class="field">
      <label>Copy to</label>
      <select id="clone-to">
        ${targets.map((u) => `<option value="${esc(u.userid)}">${esc(u.userid)}${u.fullName ? ` — ${esc(u.fullName)}` : ""}</option>`).join("")}
      </select>
    </div>
    <fieldset class="fieldset" style="margin-top:16px;">
      <legend>What to copy</legend>
      <div class="check-list">
        <label class="check-row"><input type="checkbox" id="clone-roles" checked>
          <span><strong>Role assignments</strong><br><span class="muted-xs">The recommended option.</span></span></label>
        <label class="check-row"><input type="checkbox" id="clone-additional">
          <span><strong>Additional grants</strong><br><span class="muted-xs">Per-user exceptions added beyond their roles.</span></span></label>
        <label class="check-row"><input type="checkbox" id="clone-denied">
          <span><strong>Denials</strong><br><span class="muted-xs">Per-user operations explicitly withheld.</span></span></label>
      </div>
    </fieldset>
    <fieldset class="fieldset" style="margin-top:16px;">
      <legend>How to apply</legend>
      <div class="check-list">
        <label class="check-row"><input type="radio" name="clone-mode" value="replace" checked>
          <span><strong>Replace</strong><br><span class="muted-xs">Target ends up with exactly the copied access.</span></span></label>
        <label class="check-row"><input type="radio" name="clone-mode" value="merge">
          <span><strong>Merge</strong><br><span class="muted-xs">Add to what the target already has.</span></span></label>
      </div>
    </fieldset>`,
    (m) => {
      const to = m.querySelector("#clone-to").value;
      const opts = {
        roles: m.querySelector("#clone-roles").checked,
        additional: m.querySelector("#clone-additional").checked,
        denied: m.querySelector("#clone-denied").checked,
        mode: m.querySelector('input[name="clone-mode"]:checked').value,
      };
      if (!opts.roles && !opts.additional && !opts.denied) {
        return cfgAlert(m, "Choose at least one thing to copy.");
      }
      const result = rbacCloneAccess(fromUserId, to, opts);
      if (!result) return cfgAlert(m, "Could not clone access to that user.");
      cfgCloseModal(m);
      cfgReload();
    },
    "560px"
  );
}

// ---------- roles -------------------------------------------------------

function cfgRenderRoles(body, config) {
  const canManage = cfgCan("action.config.roles.manage");

  const cards = config.roles
    .map((role) => {
      const counts = RBAC_TYPE_KEYS.map((type) => {
        const n = Object.keys(role.permissions?.[type] || {}).length;
        return `<div class="kv"><span>${esc(RBAC_TYPES[type].label)}</span><strong>${n}</strong></div>`;
      }).join("");
      const holders = config.users.filter((u) => (u.roleIds || []).includes(role.id)).length;
      return `
        <div class="card">
          <h2>${esc(role.name)} ${role.system ? `<span class="ok-badge">System</span>` : ""}</h2>
          <p class="muted-xs" style="margin-bottom:10px;">${esc(role.description || "")}</p>
          <div class="kv-grid">${counts}</div>
          <p class="muted-xs">${holders} user${holders === 1 ? "" : "s"} assigned</p>
          <div class="btn-row" style="margin-top:12px;">
            <button class="link-btn" data-perms="${esc(role.id)}">${canManage ? "Edit permissions" : "View permissions"}</button>
            ${canManage ? `<button class="link-btn" data-edit-role="${esc(role.id)}">Rename</button>` : ""}
            ${canManage && !role.system ? `<button class="link-btn danger" data-del-role="${esc(role.id)}">Delete</button>` : ""}
          </div>
        </div>`;
    })
    .join("");

  body.innerHTML = `
    ${canManage ? "" : cfgDenied("You may view roles but not change them. 'Manage roles' is required.")}
    <div class="btn-row" style="margin-bottom:14px;">
      ${canManage ? `<button class="btn" id="add-role">+ Add role</button>` : ""}
      <span class="muted-xs">A role's permissions apply to everyone assigned to it.</span>
    </div>
    <div class="cards">${cards}</div>`;

  const addBtn = body.querySelector("#add-role");
  if (addBtn) addBtn.addEventListener("click", () => cfgRoleModal(null));
  body.querySelectorAll("[data-edit-role]").forEach((b) =>
    b.addEventListener("click", () => cfgRoleModal(b.dataset.editRole))
  );
  body.querySelectorAll("[data-perms]").forEach((b) =>
    b.addEventListener("click", () => cfgRolePermissionsModal(b.dataset.perms))
  );
  body.querySelectorAll("[data-del-role]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this role? It is removed from every user assigned to it.")) return;
      rbacDeleteRole(b.dataset.delRole);
      cfgReload();
    })
  );
}

function cfgRoleModal(roleId) {
  const role = roleId ? rbacGetRole(roleId) : { name: "", description: "" };
  cfgModal(
    roleId ? `Rename role — ${role.name}` : "Add role",
    `
    <div class="field"><label>Name</label><input data-key="name" value="${esc(role.name)}"></div>
    <div class="field" style="margin-top:12px;"><label>Description</label><input data-key="description" value="${esc(role.description || "")}"></div>`,
    (m) => {
      const name = m.querySelector('[data-key="name"]').value.trim();
      if (!name) return cfgAlert(m, "Name is required.");
      const data = { name, description: m.querySelector('[data-key="description"]').value.trim() };
      const saved = rbacUpsertRole(data, roleId);
      if (!saved) return cfgAlert(m, "A role with that name already exists.");
      cfgCloseModal(m);
      cfgReload();
    },
    "520px"
  );
}

function cfgRolePermissionsModal(roleId) {
  const config = rbacLoad();
  const role = rbacGetRole(roleId, config);
  const canManage = cfgCan("action.config.roles.manage");

  const sections = RBAC_TYPE_KEYS.map((type) => {
    const rows = (config.resources[type] || [])
      .map((res) => {
        const ops = role.permissions?.[type]?.[res.id] || [];
        const cells = RBAC_TYPES[type].ops
          .map(
            (op) => `
            <td class="${ops.includes(op) ? "src-role" : "src-none"}">
              <input type="checkbox" data-type="${type}" data-id="${esc(res.id)}" data-op="${op}"
                ${ops.includes(op) ? " checked" : ""}${canManage ? "" : " disabled"}>
            </td>`
          )
          .join("");
        return `
          <tr>
            <td><strong>${esc(res.label)}</strong><br><span class="muted-xs mono">${esc(res.id)}</span></td>
            ${cells}
          </tr>`;
      })
      .join("");

    return `
      <details class="sheet-block" ${type === "page" ? "open" : ""} style="margin-bottom:12px;">
        <summary>
          <h2>${esc(RBAC_TYPES[type].label)}</h2>
          <span class="muted-xs">${(config.resources[type] || []).length} resources</span>
          ${canManage ? `<button class="link-btn" data-all="${type}">Select all</button>
                         <button class="link-btn" data-none="${type}">Clear</button>` : ""}
        </summary>
        <div class="table-wrap">
          <table class="dense">
            <thead><tr><th>Resource</th>${RBAC_TYPES[type].ops.map((o) => `<th>${esc(o)}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  }).join("");

  const modal = cfgModal(
    `${canManage ? "Permissions" : "Permissions (read-only)"} — ${role.name}`,
    `${role.system ? `<div class="alert alert-danger" style="margin-bottom:14px;"><p>This is a system role. Narrowing it can lock everyone out of configuration — change with care.</p></div>` : ""}
     ${sections}`,
    (m) => {
      if (!canManage) return cfgCloseModal(m);
      const permissions = {};
      RBAC_TYPE_KEYS.forEach((t) => (permissions[t] = {}));
      m.querySelectorAll("input[data-type]:checked").forEach((cb) => {
        const { type, id, op } = cb.dataset;
        permissions[type][id] = [...(permissions[type][id] || []), op];
      });
      rbacMutate((cfg) => {
        rbacGetRole(roleId, cfg).permissions = permissions;
      });
      cfgCloseModal(m);
      cfgReload();
    },
    "900px"
  );

  modal.querySelectorAll("[data-all]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      modal.querySelectorAll(`input[data-type="${b.dataset.all}"]`).forEach((cb) => (cb.checked = true));
    })
  );
  modal.querySelectorAll("[data-none]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      modal.querySelectorAll(`input[data-type="${b.dataset.none}"]`).forEach((cb) => (cb.checked = false));
    })
  );
}

// ---------- access matrix ----------------------------------------------

function cfgRenderMatrix(body, config) {
  const sections = RBAC_TYPE_KEYS.map((type) => {
    const rows = (config.resources[type] || [])
      .map((res) => {
        const cells = config.roles
          .map((role) => {
            const ops = role.permissions?.[type]?.[res.id] || [];
            if (!ops.length) return `<td class="src-none">—</td>`;
            const full = ops.length === RBAC_TYPES[type].ops.length;
            return `<td class="src-role" title="${esc(ops.join(", "))}">${full ? "✔" : esc(ops.join(", "))}</td>`;
          })
          .join("");
        return `<tr><td><strong>${esc(res.label)}</strong><br><span class="muted-xs mono">${esc(res.id)}</span></td>${cells}</tr>`;
      })
      .join("");

    return `
      <details class="sheet-block" open style="margin-bottom:12px;">
        <summary><h2>${esc(RBAC_TYPES[type].label)}</h2></summary>
        <div class="table-wrap">
          <table class="dense">
            <thead><tr><th class="sticky-col">Resource</th>${config.roles.map((r) => `<th>${esc(r.name)}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  }).join("");

  body.innerHTML = `
    <p class="muted-xs" style="margin-bottom:14px;">
      What each role grants, before any per-user exception. Open a user's Access
      view to see what that individual actually has.
    </p>
    ${sections}`;
}

// ---------- resource registries ----------------------------------------

function cfgRenderResources(body, config, type, label) {
  const canManage = cfgCan("action.config.resources.manage");
  const canEditVars = cfgCan("action.config.variables.edit");
  const fields = CFG_RESOURCE_FIELDS[type];
  const list = config.resources[type] || [];

  const rows = list
    .map((res) => {
      const cells = fields
        .filter((f) => f.key !== "description")
        .map((f) => {
          let v = res[f.key];
          if (f.type === "boolean") v = v ? "Yes" : "No";
          return `<td class="${f.mono ? "mono" : ""}">${esc(v ?? "—")}</td>`;
        })
        .join("");
      const usedBy = config.roles.filter((r) => (r.permissions?.[type]?.[res.id] || []).length).length;
      return `
        <tr>
          ${cells}
          <td>${usedBy ? `${usedBy} role${usedBy === 1 ? "" : "s"}` : `<span class="muted-xs">unused</span>`}</td>
          <td class="row-actions">
            ${canManage || (type === "variable" && canEditVars)
              ? `<button class="link-btn" data-edit-res="${esc(res.id)}">Edit</button>`
              : ""}
            ${canManage ? `<button class="link-btn danger" data-del-res="${esc(res.id)}">Delete</button>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  const note = {
    page: "Every page the application can show. Removing a page here removes it from every role.",
    action: "Individual operations that can be permitted, such as approving a record or deleting a sheet.",
    exec_link: "Targets that can be run. Running from the browser needs a backend — these are registered and permissioned now.",
    sheet_link: "Spreadsheets and documents reachable from the application.",
    variable: "Configuration values. Editing a value needs 'Edit variable values'; adding or removing one needs 'Manage resources'.",
  }[type];

  body.innerHTML = `
    ${canManage ? "" : cfgDenied("You may view these but not add or remove them. 'Manage resources' is required.")}
    <p class="muted-xs" style="margin-bottom:14px;">${esc(note)}</p>
    <div class="btn-row" style="margin-bottom:14px;">
      ${canManage ? `<button class="btn" id="add-res">+ Add ${esc(RBAC_TYPES[type].singular.toLowerCase())}</button>` : ""}
    </div>
    <div class="table-wrap">
      <table class="dense">
        <thead><tr>
          ${fields.filter((f) => f.key !== "description").map((f) => `<th>${esc(f.label)}</th>`).join("")}
          <th>Granted to</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const addBtn = body.querySelector("#add-res");
  if (addBtn) addBtn.addEventListener("click", () => cfgResourceModal(type, null));
  body.querySelectorAll("[data-edit-res]").forEach((b) =>
    b.addEventListener("click", () => cfgResourceModal(type, b.dataset.editRes))
  );
  body.querySelectorAll("[data-del-res]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm("Delete this resource? It is removed from every role and user that referenced it.")) return;
      rbacDeleteResource(type, b.dataset.delRes);
      cfgReload();
    })
  );
}

function cfgResourceModal(type, resId) {
  const config = rbacLoad();
  const res = resId ? rbacResource(type, resId, config) : {};
  const fields = CFG_RESOURCE_FIELDS[type];

  const inputs = fields
    .map((f) => {
      const v = res[f.key] ?? "";
      let control;
      if (f.type === "boolean") {
        control = `<select data-key="${f.key}">
            <option value="false"${!v ? " selected" : ""}>No</option>
            <option value="true"${v ? " selected" : ""}>Yes</option>
          </select>`;
      } else if (f.type === "select") {
        control = `<select data-key="${f.key}">${f.options
          .map((o) => `<option value="${esc(o)}"${String(v) === o ? " selected" : ""}>${esc(o)}</option>`)
          .join("")}</select>`;
      } else {
        control = `<input data-key="${f.key}" value="${esc(v)}"${resId && f.key === "id" ? " disabled" : ""}>`;
      }
      return `<div class="field"${f.wide ? ' style="grid-column:1/-1;"' : ""}>
          <label>${esc(f.label)}${f.required ? " *" : ""}</label>${control}
        </div>`;
    })
    .join("");

  cfgModal(
    resId ? `Edit ${RBAC_TYPES[type].singular.toLowerCase()}` : `Add ${RBAC_TYPES[type].singular.toLowerCase()}`,
    `<div class="field-grid">${inputs}</div>`,
    (m) => {
      const data = {};
      fields.forEach((f) => {
        const input = m.querySelector(`[data-key="${f.key}"]`);
        if (!input) return;
        data[f.key] = f.type === "boolean" ? input.value === "true" : input.value.trim();
      });
      if (resId) data.id = resId;
      const missing = fields.filter((f) => f.required && !data[f.key]).map((f) => f.label);
      if (missing.length) return cfgAlert(m, `Required: ${missing.join(", ")}.`);

      const saved = rbacUpsertResource(type, data, resId);
      if (!saved) return cfgAlert(m, `A resource with ID "${data.id}" already exists.`);
      cfgCloseModal(m);
      cfgReload();
    },
    "660px"
  );
}

// ---------- tolerances ---------------------------------------------------

function cfgRenderTolerances(body) {
  const canEdit = cfgCan("action.config.tolerances.edit");
  const fields = pcsTolerableFields();
  const overrides = pcsLoadTolerances();

  let lastGroup = "";
  let rows = "";
  fields.forEach((f) => {
    const groupRow = f.group !== lastGroup
      ? `<tr class="tol-group"><td colspan="7">${esc(f.group)}</td></tr>`
      : "";
    lastGroup = f.group;

    const cur = overrides[f.key] || {};
    const hasMin = f.def.min !== undefined;
    const hasMax = f.def.max !== undefined;
    const hasExp = f.def.expected !== undefined;

    const minVal = cur.min !== undefined && cur.min !== "" ? cur.min : (hasMin ? f.def.min : "");
    const maxVal = cur.max !== undefined && cur.max !== "" ? cur.max : (hasMax ? f.def.max : "");
    const expVal = cur.expected !== undefined && cur.expected !== "" ? cur.expected : (hasExp ? f.def.expected : "");

    const isOverridden = cur.min !== undefined || cur.max !== undefined || cur.expected !== undefined;

    rows += groupRow + `
      <tr${isOverridden ? ' class="tol-override"' : ""}>
        <td class="tol-field">${esc(f.label)}</td>
        <td class="tol-unit">${esc(f.unit)}</td>
        <td class="tol-def">${hasMin ? f.def.min : "—"}</td>
        <td class="tol-def">${hasMax ? f.def.max : "—"}</td>
        <td class="tol-def">${hasExp ? f.def.expected : "—"}</td>
        <td>${hasMin || hasMax
          ? `<input type="number" class="tol-input" data-key="${f.key}" data-prop="min" value="${esc(minVal)}" step="any" placeholder="${hasMin ? f.def.min : ""}"${canEdit ? "" : " disabled"}>
             <span class="tol-sep">–</span>
             <input type="number" class="tol-input" data-key="${f.key}" data-prop="max" value="${esc(maxVal)}" step="any" placeholder="${hasMax ? f.def.max : ""}"${canEdit ? "" : " disabled"}>`
          : "—"}</td>
        <td>${hasExp
          ? `<input type="number" class="tol-input" data-key="${f.key}" data-prop="expected" value="${esc(expVal)}" step="any" placeholder="${f.def.expected}"${canEdit ? "" : " disabled"}>`
          : "—"}</td>
      </tr>`;
  });

  body.innerHTML = `
    <div class="tol-header">
      <p class="subtitle" style="margin-bottom:12px;">
        Override field tolerances (min / max / expected) that drive out-of-spec
        highlighting. Blank fields fall back to the hardcoded default.
      </p>
      ${canEdit ? `<div class="btn-row">
        <button class="btn" id="tol-save">Save tolerances</button>
        <button class="btn btn-secondary" id="tol-reset">Reset to defaults</button>
      </div>` : ""}
    </div>
    <div class="table-wrap" style="margin-top:14px;">
      <table class="cfg-table tol-table">
        <thead>
          <tr>
            <th>Field</th><th>Unit</th>
            <th colspan="3" class="tol-def-head">Defaults</th>
            <th>Min – Max override</th><th>Expected override</th>
          </tr>
          <tr class="tol-subhead">
            <th></th><th></th><th>Min</th><th>Max</th><th>Exp.</th><th></th><th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  if (!canEdit) return;

  body.querySelector("#tol-save")?.addEventListener("click", () => {
    const inputs = body.querySelectorAll(".tol-input");
    const next = {};
    inputs.forEach((inp) => {
      const key = inp.dataset.key;
      const prop = inp.dataset.prop;
      const val = inp.value.trim();
      if (val === "") return;
      if (!next[key]) next[key] = {};
      next[key][prop] = Number(val);
    });
    pcsSaveTolerances(next);
    cfgReload();
  });

  body.querySelector("#tol-reset")?.addEventListener("click", () => {
    if (!confirm("Reset all tolerances to hardcoded defaults?")) return;
    pcsSaveTolerances({});
    cfgReload();
  });
}

// ---------- masters (configurable dropdown options) ----------------------

const MASTERS_STORAGE_KEY = "bestcast_masters";

const MASTERS_DEFS = [
  { key: "lines", label: "Lines", desc: "Production line numbers shown in the day sheet header." },
  { key: "furnaces", label: "Furnace Numbers", desc: "Holding furnace IDs." },
  { key: "metalGrades", label: "Metal Grades", desc: "Alloy grades (e.g. AC2A)." },
  { key: "degassingGases", label: "Degassing Gases", desc: "Gas types used for degassing." },
  { key: "coolingTimes", label: "Cooling Times (sec)", desc: "Allowed cooling time values." },
  { key: "rotorSizes", label: "Rotor Sizes", desc: "Degassing rotor diameter options." },
  { key: "shifts", label: "Shifts", desc: "Shift names for the day." },
  { key: "supervisors", label: "Shift Supervisors", desc: "Names in the supervisor sign-off dropdown." },
  { key: "corePinCavities", label: "Core Pin Cavities", desc: "Cavity numbers for core pin checks." },
];

function mastersLoad() {
  try { return JSON.parse(localStorage.getItem(MASTERS_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function mastersSave(data) {
  localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(data));
}

function mastersDefaults() {
  return {
    lines: ["01", "02", "03", "06"],
    furnaces: ["HF1", "HF2", "HF3", "HF4", "HF5", "HF6", "HF11", "HF12"],
    metalGrades: ["AC2A"],
    degassingGases: ["N2"],
    coolingTimes: ["120", "180"],
    rotorSizes: ["100mm", "190mm"],
    shifts: ["1st Shift", "2nd Shift", "3rd Shift"],
    supervisors: ["VIMAL", "BHARATHI", "MOHAN", "NAVEEN", "ASHOK"],
    corePinCavities: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  };
}

function mastersGet(key) {
  const saved = mastersLoad();
  if (saved[key] && saved[key].length) return saved[key];
  return mastersDefaults()[key] || [];
}

function cfgRenderMasters(body) {
  const canEdit = cfgCan("action.config.masters.edit");
  const saved = mastersLoad();
  const defaults = mastersDefaults();

  const sections = MASTERS_DEFS.map((def) => {
    const items = saved[def.key] && saved[def.key].length ? saved[def.key] : defaults[def.key];
    const isOverridden = saved[def.key] && saved[def.key].length > 0;
    return `
      <div class="sheet-block" style="margin-bottom:14px;padding:14px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <strong>${esc(def.label)}</strong>
            ${isOverridden ? '<span class="pending-badge" style="margin-left:8px;">customised</span>' : ""}
            <br><span class="muted-xs">${esc(def.desc)}</span>
          </div>
          <div style="display:flex;gap:6px;">
            ${canEdit ? `<button class="link-btn" data-master-edit="${def.key}">Edit</button>` : ""}
            ${canEdit && isOverridden ? `<button class="link-btn danger" data-master-reset="${def.key}">Reset</button>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${items.map((v) => `<span class="role-chip">${esc(v)}</span>`).join("")}
        </div>
      </div>`;
  }).join("");

  body.innerHTML = `
    ${canEdit ? "" : cfgDenied("You may view masters but not change them. 'Edit masters' permission is required.")}
    <p class="subtitle" style="margin-bottom:14px;">
      Dropdown options used across Process Check Sheet forms. Editing these changes
      what operators can select. Blank values fall back to hardcoded defaults.
    </p>
    ${sections}`;

  body.querySelectorAll("[data-master-edit]").forEach((b) =>
    b.addEventListener("click", () => cfgMasterEditModal(b.dataset.masterEdit))
  );
  body.querySelectorAll("[data-master-reset]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!confirm(`Reset "${MASTERS_DEFS.find((d) => d.key === b.dataset.masterReset)?.label}" to defaults?`)) return;
      const data = mastersLoad();
      delete data[b.dataset.masterReset];
      mastersSave(data);
      cfgReload();
    })
  );
}

function cfgMasterEditModal(key) {
  const def = MASTERS_DEFS.find((d) => d.key === key);
  const items = mastersGet(key);

  const modal = cfgModal(
    `Edit — ${def.label}`,
    `<p class="muted-xs" style="margin-bottom:12px;">${esc(def.desc)} One value per line.</p>
     <div class="field" style="grid-column:1/-1;">
       <label>Values</label>
       <textarea id="master-values" rows="10" style="width:100%;font-family:inherit;font-size:13px;padding:8px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--content-fg);resize:vertical;">${esc(items.join("\n"))}</textarea>
     </div>`,
    (m) => {
      const raw = m.querySelector("#master-values").value;
      const values = raw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!values.length) return cfgAlert(m, "At least one value is required.");
      const data = mastersLoad();
      data[key] = values;
      mastersSave(data);
      if (typeof pcsApplyMasters === "function") pcsApplyMasters();
      cfgCloseModal(m);
      cfgReload();
    },
    "480px"
  );
}

// ---------- boot --------------------------------------------------------

// ---------- data export / import -----------------------------------------

const DATA_EXPORT_KEYS = [
  { key: "bestcast_rbac_config", label: "Access Control (roles, users, permissions)" },
  { key: "bestcast_pcs_records", label: "Process Check Sheet records" },
  { key: "bestcast_templates", label: "Template metadata" },
  { key: "bestcast_qms_docs", label: "QMS Document metadata" },
  { key: "bestcast_tolerances", label: "Tolerance overrides" },
  { key: "bestcast_masters", label: "Masters (dropdown options)" },
];

function cfgRenderDataMgmt(body) {
  body.innerHTML = `
    <div class="tol-header">
      <p class="subtitle" style="margin-bottom:12px;">
        Export all application data as a JSON file for backup, or import a previously
        exported file to restore. File blobs (uploaded templates and QMS documents)
        are included when available.
      </p>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      <button class="btn" id="data-export">Export all data</button>
      <label class="btn btn-secondary" style="cursor:pointer;">
        Import data&hellip;
        <input type="file" accept=".json" id="data-import" style="display:none;">
      </label>
    </div>
    <div id="data-status"></div>
    <h2 style="font-size:15px;margin:20px 0 10px;">What is included</h2>
    <div class="table-wrap">
      <table class="cfg-table">
        <thead><tr><th>Store</th><th>Key</th><th>Size</th></tr></thead>
        <tbody>
          ${DATA_EXPORT_KEYS.map((d) => {
            const raw = localStorage.getItem(d.key);
            const size = raw ? (raw.length / 1024).toFixed(1) + " KB" : "empty";
            return `<tr><td>${esc(d.label)}</td><td class="mono">${esc(d.key)}</td><td>${size}</td></tr>`;
          }).join("")}
          <tr><td>Template file blobs</td><td class="mono">IndexedDB: bestcast_files</td><td>—</td></tr>
          <tr><td>QMS document file blobs</td><td class="mono">IndexedDB: bestcast_qms_files</td><td>—</td></tr>
        </tbody>
      </table>
    </div>`;

  body.querySelector("#data-export").addEventListener("click", async () => {
    const status = body.querySelector("#data-status");
    status.innerHTML = '<p class="muted-xs">Exporting&hellip;</p>';
    try {
      const data = { _export: "bestcast", _version: window.BUILD_INFO?.version || "unknown", _date: new Date().toISOString() };
      DATA_EXPORT_KEYS.forEach((d) => {
        const raw = localStorage.getItem(d.key);
        if (raw) data[d.key] = JSON.parse(raw);
      });
      data._blobs = {};
      await cfgExportBlobs(data._blobs, "bestcast_files", "templates");
      await cfgExportBlobs(data._blobs, "bestcast_qms_files", "documents");
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bestcast-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      status.innerHTML = '<p class="alert alert-ok">Export complete.</p>';
    } catch (err) {
      status.innerHTML = `<p class="alert alert-danger">Export failed: ${esc(err.message)}</p>`;
    }
  });

  body.querySelector("#data-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = body.querySelector("#data-status");
    if (!confirm("This will overwrite all existing data with the imported file. Continue?")) {
      e.target.value = "";
      return;
    }
    status.innerHTML = '<p class="muted-xs">Importing&hellip;</p>';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._export !== "bestcast") throw new Error("Not a Bestcast export file.");
      let count = 0;
      DATA_EXPORT_KEYS.forEach((d) => {
        if (data[d.key] !== undefined) {
          localStorage.setItem(d.key, JSON.stringify(data[d.key]));
          count++;
        }
      });
      if (data._blobs) {
        await cfgImportBlobs(data._blobs, "bestcast_files", "templates");
        await cfgImportBlobs(data._blobs, "bestcast_qms_files", "documents");
      }
      status.innerHTML = `<p class="alert alert-ok">Imported ${count} data stores from ${esc(data._version || "unknown")} (${esc(data._date || "")}).</p>`;
      e.target.value = "";
    } catch (err) {
      status.innerHTML = `<p class="alert alert-danger">Import failed: ${esc(err.message)}</p>`;
      e.target.value = "";
    }
  });
}

function cfgIdbOpen(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cfgExportBlobs(target, dbName, storeName) {
  try {
    const db = await cfgIdbOpen(dbName, storeName);
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const keys = await new Promise((res, rej) => { const r = store.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    for (const key of keys) {
      const val = await new Promise((res, rej) => { const r = store.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      if (val instanceof ArrayBuffer) {
        const bytes = new Uint8Array(val);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        target[`${dbName}/${storeName}/${key}`] = btoa(binary);
      }
    }
    db.close();
  } catch { /* DB may not exist yet */ }
}

async function cfgImportBlobs(blobs, dbName, storeName) {
  const prefix = `${dbName}/${storeName}/`;
  const entries = Object.entries(blobs).filter(([k]) => k.startsWith(prefix));
  if (!entries.length) return;
  const db = await cfgIdbOpen(dbName, storeName);
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const [k, b64] of entries) {
    const id = k.slice(prefix.length);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    store.put(bytes.buffer, id);
  }
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
}

document.addEventListener("DOMContentLoaded", () => {
  CFG_SESSION = renderTopbar("configuration");
  if (!CFG_SESSION) return;
  if (!rbacRequirePage(CFG_SESSION, "page.configuration")) return;
  cfgRender();
  window.addEventListener("hashchange", cfgRender);
});
