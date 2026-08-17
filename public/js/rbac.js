// Role-based access control — model, storage and evaluation.
//
// Access is granted through ROLES by default. A user's effective access is:
//
//     union(permissions of each assigned role)
//       + that user's additional grants   (exception, off by default)
//       − that user's explicit denials    (exception, off by default)
//
// A user with no additional grants and no denials — the normal case — has
// exactly the access their roles confer. The per-user layers exist for the
// occasional exception and are reported separately in the UI so they never
// become the invisible default.
//
// SCOPE: this is UI-level access control. It decides what is offered and
// what is reachable in the browser, and it is not a security boundary —
// see BUG-006. It becomes enforceable once Supabase row level security is
// in place, at which point these same role and permission records are what
// the policies should be built from.

const RBAC_STORAGE_KEY = "bestcast_rbac_config";

// Resource types and the operations each supports.
const RBAC_TYPES = {
  page: { label: "Pages", singular: "Page", ops: ["view"] },
  action: { label: "Actions", singular: "Action", ops: ["execute"] },
  exec_link: { label: "Exec Links", singular: "Exec Link", ops: ["view", "run"] },
  sheet_link: { label: "Sheet Links", singular: "Sheet Link", ops: ["view", "open"] },
  variable: { label: "Variables", singular: "Variable", ops: ["view", "edit"] },
};

const RBAC_TYPE_KEYS = Object.keys(RBAC_TYPES);

// --- Seed -------------------------------------------------------------

function rbacSeed() {
  const pages = [
    { id: "page.overview", label: "Overview", path: "dashboard.html", group: "General", description: "Landing dashboard." },
    { id: "page.production_records", label: "Production Records", path: "production-records.html", group: "Production", description: "Shop-floor record modules." },
    { id: "page.process_check_sheet", label: "Process Check Sheet", path: "process-check-sheet.html", group: "Production", description: "QC FMT 038 day sheets." },
    { id: "page.reports", label: "Reports", path: "#", group: "Production", description: "Reporting (not yet built)." },
    { id: "page.team", label: "Team", path: "#", group: "People", description: "Team area." },
    { id: "page.roster", label: "Roster", path: "#", group: "People", description: "Personnel roster (not yet built)." },
    { id: "page.configuration", label: "Configuration", path: "configuration.html", group: "Administration", description: "Users, roles and access control." },
    { id: "page.dev", label: "Dev", path: "dev.html", group: "Administration", description: "Requirements, test cases, bugs, backlog." },
  ];

  const actions = [
    { id: "action.pcs.sheet.create", label: "Create day sheet", group: "Process Check Sheet", description: "Start a new day sheet." },
    { id: "action.pcs.sheet.edit", label: "Edit day details", group: "Process Check Sheet", description: "Amend the day sheet header." },
    { id: "action.pcs.sheet.archive", label: "Archive day sheet", group: "Process Check Sheet", description: "Withdraw a day sheet from the working list and make it read-only. Reversible; nothing is deleted." },
    { id: "action.pcs.machine.manage", label: "Add / edit machine", group: "Process Check Sheet", description: "Maintain the machines on the line." },
    { id: "action.pcs.machine.stop", label: "Start / stop machine", group: "Process Check Sheet", description: "Set a machine's running window mid-shift." },
    { id: "action.pcs.machine.delete", label: "Delete machine", group: "Process Check Sheet", description: "Remove a machine and its Die Temp readings." },
    { id: "action.pcs.hourly.record", label: "Record hourly reading", group: "Process Check Sheet", description: "Enter readings for a time slot." },
    { id: "action.pcs.shift.record", label: "Record shift sign-off", group: "Process Check Sheet", description: "Enter a shift's sign-off record." },
    { id: "action.pcs.shift.delete", label: "Delete shift record", group: "Process Check Sheet", description: "Remove a shift sign-off." },
    { id: "action.pcs.approve", label: "Approve records", group: "Approval", description: "Approve machine, hourly and shift records." },
    { id: "action.pcs.unapprove", label: "Withdraw approval", group: "Approval", description: "Reopen an approved record for editing." },
    { id: "action.config.users.manage", label: "Manage users", group: "Administration", description: "Create and amend users and their role assignments." },
    { id: "action.config.roles.manage", label: "Manage roles", group: "Administration", description: "Create roles and set their permissions." },
    { id: "action.config.access.override", label: "Grant per-user access", group: "Administration", description: "Add or deny access for one user outside their roles." },
    { id: "action.config.access.clone", label: "Clone user access", group: "Administration", description: "Copy one user's access to another." },
    { id: "action.config.resources.manage", label: "Manage resources", group: "Administration", description: "Maintain pages, actions, links and variables." },
    { id: "action.config.variables.edit", label: "Edit variable values", group: "Administration", description: "Change configuration variable values." },
  ];

  const execLinks = [
    { id: "exec.import_users", label: "Import users from roster", url: "scripts/import_users_from_excel.py", confirm: true, description: "Sync the Excel roster into Supabase Auth and profiles." },
    { id: "exec.rebuild_roster", label: "Rebuild roster workbook", url: "scripts/build_users_master.py", confirm: true, description: "Regenerate data/users_master.xlsx from scratch." },
    { id: "exec.oos_report", label: "Out-of-spec report", url: "#", confirm: false, description: "Report every out-of-specification reading (pending backend)." },
  ];

  const sheetLinks = [
    { id: "sheet.users_master", label: "User master roster", url: "data/users_master.xlsx", description: "Who should have an account, and their profile." },
    { id: "sheet.tolerances", label: "Tolerances", url: "#", description: "Acceptance limits for every check sheet data item." },
    { id: "sheet.pcs_master", label: "Process check sheet master", url: "#", description: "Blank QC FMT 038 template." },
  ];

  const variables = [
    { id: "var.site_title", label: "Site title", value: "Bestcast", type: "text", description: "Name shown in the top bar." },
    { id: "var.line_default", label: "Default line", value: "01", type: "text", description: "Line pre-selected on a new day sheet." },
    { id: "var.slot_minutes", label: "Time slot length", value: "30", type: "number", unit: "min", description: "Interval between hourly reading slots." },
    { id: "var.slots_per_shift", label: "Slots per shift", value: "16", type: "number", description: "Placeholder until the Shift Master (ENH-001) supplies real timings." },
    { id: "var.oos_alert_email", label: "Out-of-spec alert recipient", value: "", type: "text", description: "Address alerted when a reading is out of specification (pending backend)." },
    { id: "var.approval_required", label: "Approval required", value: "true", type: "boolean", description: "Whether records must be approved by a supervisor." },
    { id: "var.lock_past_hours", label: "Lock superseded readings", value: "true", type: "boolean", description: "Lock an hourly reading once a later slot is recorded." },
  ];

  const all = (type) => {
    const map = {};
    ({ page: pages, action: actions, exec_link: execLinks, sheet_link: sheetLinks, variable: variables })[type]
      .forEach((r) => (map[r.id] = [...RBAC_TYPES[type].ops]));
    return map;
  };

  const grant = (type, ids, ops) => {
    const map = {};
    ids.forEach((id) => (map[id] = ops ? [...ops] : [...RBAC_TYPES[type].ops]));
    return map;
  };

  const roles = [
    {
      id: "role.administrator",
      name: "Administrator",
      description: "Full access, including configuration and access control.",
      system: true,
      permissions: {
        page: all("page"), action: all("action"), exec_link: all("exec_link"),
        sheet_link: all("sheet_link"), variable: all("variable"),
      },
    },
    {
      id: "role.quality_manager",
      name: "Quality Manager",
      description: "Reviews and approves production records; reads configuration but does not change access.",
      system: false,
      permissions: {
        page: grant("page", ["page.overview", "page.production_records", "page.process_check_sheet", "page.reports", "page.team", "page.roster"]),
        action: grant("action", [
          "action.pcs.sheet.create", "action.pcs.sheet.edit", "action.pcs.machine.manage",
          "action.pcs.machine.stop", "action.pcs.hourly.record", "action.pcs.shift.record",
          "action.pcs.approve", "action.pcs.unapprove",
        ]),
        exec_link: grant("exec_link", ["exec.oos_report"]),
        sheet_link: grant("sheet_link", ["sheet.tolerances", "sheet.pcs_master"], ["view", "open"]),
        variable: grant("variable", ["var.site_title", "var.line_default", "var.approval_required"], ["view"]),
      },
    },
    {
      id: "role.shift_supervisor",
      name: "Shift Supervisor",
      description: "Records and approves their shift's data.",
      system: false,
      permissions: {
        page: grant("page", ["page.overview", "page.production_records", "page.process_check_sheet"]),
        // Opens the day and records against it, but cannot amend the day
        // header once saved — that is deliberately a narrower group.
        action: grant("action", [
          "action.pcs.sheet.create", "action.pcs.machine.manage",
          "action.pcs.machine.stop", "action.pcs.hourly.record", "action.pcs.shift.record",
          "action.pcs.shift.delete", "action.pcs.approve",
        ]),
        exec_link: {},
        sheet_link: grant("sheet_link", ["sheet.tolerances"], ["view", "open"]),
        variable: {},
      },
    },
    {
      id: "role.operator",
      name: "Operator",
      description: "Records hourly readings and machine status. Cannot approve.",
      system: false,
      permissions: {
        page: grant("page", ["page.overview", "page.production_records", "page.process_check_sheet"]),
        action: grant("action", ["action.pcs.hourly.record", "action.pcs.machine.stop"]),
        exec_link: {},
        sheet_link: grant("sheet_link", ["sheet.tolerances"], ["view"]),
        variable: {},
      },
    },
    {
      id: "role.viewer",
      name: "Viewer",
      description: "Read-only across production records.",
      system: false,
      permissions: {
        page: grant("page", ["page.overview", "page.production_records", "page.process_check_sheet", "page.reports"]),
        action: {},
        exec_link: {},
        sheet_link: {},
        variable: {},
      },
    },
  ];

  // Seed accounts from the temporary sign-in list, so the two accounts that
  // can currently sign in are administrators and the app stays usable.
  const seedUsers = (typeof TEMP_USERS !== "undefined" ? TEMP_USERS : [{ userid: "msv", fullName: "msv" }])
    .map((u) => ({
      userid: u.userid,
      fullName: u.fullName || u.userid,
      email: "",
      roleIds: ["role.administrator"],
      additional: {},
      denied: {},
      active: true,
    }));

  return {
    version: 1,
    roles,
    users: seedUsers,
    resources: { page: pages, action: actions, exec_link: execLinks, sheet_link: sheetLinks, variable: variables },
  };
}

// --- Storage ------------------------------------------------------------

function rbacLoad() {
  try {
    const raw = localStorage.getItem(RBAC_STORAGE_KEY);
    if (!raw) {
      const seeded = rbacSeed();
      rbacSave(seeded);
      return seeded;
    }
    const config = JSON.parse(raw);
    // Resource types added after a config was stored should not break it.
    config.resources = config.resources || {};
    RBAC_TYPE_KEYS.forEach((t) => (config.resources[t] = config.resources[t] || []));
    (config.users || []).forEach((u) => {
      u.additional = u.additional || {};
      u.denied = u.denied || {};
      u.roleIds = u.roleIds || [];
    });
    return config;
  } catch (e) {
    console.error("Could not read access configuration:", e);
    return rbacSeed();
  }
}

function rbacSave(config) {
  localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(config));
}

function rbacReset() {
  localStorage.removeItem(RBAC_STORAGE_KEY);
  return rbacLoad();
}

function rbacMutate(fn) {
  const config = rbacLoad();
  const result = fn(config);
  rbacSave(config);
  return result;
}

// --- Lookups ------------------------------------------------------------

function rbacGetUser(userid, config) {
  return (config || rbacLoad()).users.find((u) => u.userid === userid) || null;
}

function rbacGetRole(roleId, config) {
  return (config || rbacLoad()).roles.find((r) => r.id === roleId) || null;
}

function rbacResource(type, id, config) {
  return ((config || rbacLoad()).resources[type] || []).find((r) => r.id === id) || null;
}

// --- Evaluation ---------------------------------------------------------

function rbacOpsFromMap(map, type, id) {
  return ((map || {})[type] || {})[id] || [];
}

// Everything a user's roles alone confer.
function rbacRoleOps(user, type, id, config) {
  const cfg = config || rbacLoad();
  const ops = new Set();
  (user.roleIds || []).forEach((roleId) => {
    const role = rbacGetRole(roleId, cfg);
    if (!role) return;
    rbacOpsFromMap(role.permissions, type, id).forEach((op) => ops.add(op));
  });
  return [...ops];
}

// Roles, plus per-user grants, minus per-user denials.
function rbacEffectiveOps(user, type, id, config) {
  if (!user || user.active === false) return [];
  const cfg = config || rbacLoad();
  const ops = new Set(rbacRoleOps(user, type, id, cfg));
  rbacOpsFromMap(user.additional, type, id).forEach((op) => ops.add(op));
  rbacOpsFromMap(user.denied, type, id).forEach((op) => ops.delete(op));
  return [...ops];
}

// Where a user's access to one operation comes from, for the UI to explain.
function rbacSourceOf(user, type, id, op, config) {
  const cfg = config || rbacLoad();
  if (rbacOpsFromMap(user.denied, type, id).includes(op)) return "denied";
  const fromRole = rbacRoleOps(user, type, id, cfg).includes(op);
  const fromExtra = rbacOpsFromMap(user.additional, type, id).includes(op);
  if (fromRole && fromExtra) return "role";
  if (fromRole) return "role";
  if (fromExtra) return "additional";
  return "none";
}

function rbacCan(userid, type, id, op, config) {
  const cfg = config || rbacLoad();
  const user = rbacGetUser(userid, cfg);
  if (!user) return false;
  return rbacEffectiveOps(user, type, id, cfg).includes(op || RBAC_TYPES[type].ops[0]);
}

function rbacCanViewPage(userid, pageId, config) {
  return rbacCan(userid, "page", pageId, "view", config);
}

function rbacCanDo(userid, actionId, config) {
  return rbacCan(userid, "action", actionId, "execute", config);
}

// Redirects when the signed-in user may not view the page. Returns true
// when access is allowed, so callers can stop rendering otherwise.
function rbacRequirePage(session, pageId, fallback) {
  if (!session) return false;
  if (rbacCanViewPage(session.userid, pageId)) return true;
  window.location.href = fallback || "dashboard.html";
  return false;
}

// --- Cloning ------------------------------------------------------------

// Copies one user's access onto another. Roles and the per-user exception
// layers are copied independently, so "give Ravi the same access as Priya"
// can mean the roles only — which is usually what is wanted — rather than
// silently duplicating one-off exceptions too.
function rbacCloneAccess(fromUserId, toUserId, options) {
  const opts = { roles: true, additional: false, denied: false, mode: "replace", ...(options || {}) };
  return rbacMutate((config) => {
    const from = rbacGetUser(fromUserId, config);
    const to = rbacGetUser(toUserId, config);
    if (!from || !to || from.userid === to.userid) return null;

    if (opts.roles) {
      to.roleIds =
        opts.mode === "merge"
          ? [...new Set([...(to.roleIds || []), ...(from.roleIds || [])])]
          : [...(from.roleIds || [])];
    }
    if (opts.additional) to.additional = rbacMergeMaps(opts.mode === "merge" ? to.additional : {}, from.additional);
    if (opts.denied) to.denied = rbacMergeMaps(opts.mode === "merge" ? to.denied : {}, from.denied);

    return to;
  });
}

function rbacMergeMaps(base, incoming) {
  const out = JSON.parse(JSON.stringify(base || {}));
  Object.entries(incoming || {}).forEach(([type, byId]) => {
    out[type] = out[type] || {};
    Object.entries(byId || {}).forEach(([id, ops]) => {
      out[type][id] = [...new Set([...(out[type][id] || []), ...ops])];
    });
  });
  return out;
}

// --- Mutations used by the configuration UI -----------------------------

function rbacSetUserRoles(userid, roleIds) {
  return rbacMutate((config) => {
    const user = rbacGetUser(userid, config);
    if (user) user.roleIds = [...roleIds];
    return user;
  });
}

function rbacSetUserOverride(userid, layer, type, id, ops) {
  return rbacMutate((config) => {
    const user = rbacGetUser(userid, config);
    if (!user) return null;
    user[layer] = user[layer] || {};
    user[layer][type] = user[layer][type] || {};
    if (!ops || !ops.length) delete user[layer][type][id];
    else user[layer][type][id] = [...ops];
    return user;
  });
}

function rbacClearOverrides(userid) {
  return rbacMutate((config) => {
    const user = rbacGetUser(userid, config);
    if (!user) return null;
    user.additional = {};
    user.denied = {};
    return user;
  });
}

function rbacSetRolePermission(roleId, type, id, ops) {
  return rbacMutate((config) => {
    const role = rbacGetRole(roleId, config);
    if (!role) return null;
    role.permissions = role.permissions || {};
    role.permissions[type] = role.permissions[type] || {};
    if (!ops || !ops.length) delete role.permissions[type][id];
    else role.permissions[type][id] = [...ops];
    return role;
  });
}

function rbacUpsertUser(data, originalId) {
  return rbacMutate((config) => {
    const existing = originalId ? rbacGetUser(originalId, config) : null;
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    if (rbacGetUser(data.userid, config)) return null; // duplicate id
    config.users.push({
      roleIds: [], additional: {}, denied: {}, active: true, ...data,
    });
    return config.users[config.users.length - 1];
  });
}

function rbacDeleteUser(userid) {
  return rbacMutate((config) => {
    config.users = config.users.filter((u) => u.userid !== userid);
  });
}

function rbacUpsertRole(data, originalId) {
  return rbacMutate((config) => {
    const existing = originalId ? rbacGetRole(originalId, config) : null;
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    const id = data.id || `role.${(data.name || "role").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    if (rbacGetRole(id, config)) return null;
    config.roles.push({
      id, permissions: { page: {}, action: {}, exec_link: {}, sheet_link: {}, variable: {} },
      system: false, ...data,
    });
    return config.roles[config.roles.length - 1];
  });
}

function rbacDeleteRole(roleId) {
  return rbacMutate((config) => {
    const role = rbacGetRole(roleId, config);
    if (!role || role.system) return false; // system roles are not removable
    config.roles = config.roles.filter((r) => r.id !== roleId);
    config.users.forEach((u) => (u.roleIds = (u.roleIds || []).filter((r) => r !== roleId)));
    return true;
  });
}

function rbacUpsertResource(type, data, originalId) {
  return rbacMutate((config) => {
    const list = config.resources[type] || (config.resources[type] = []);
    const existing = originalId ? list.find((r) => r.id === originalId) : null;
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    if (list.some((r) => r.id === data.id)) return null;
    list.push(data);
    return data;
  });
}

function rbacDeleteResource(type, id) {
  return rbacMutate((config) => {
    config.resources[type] = (config.resources[type] || []).filter((r) => r.id !== id);
    // Remove the now-dangling grants so they cannot silently reappear if an
    // id is later reused.
    config.roles.forEach((r) => r.permissions?.[type] && delete r.permissions[type][id]);
    config.users.forEach((u) => {
      u.additional?.[type] && delete u.additional[type][id];
      u.denied?.[type] && delete u.denied[type][id];
    });
  });
}

// --- Reporting ----------------------------------------------------------

function rbacUserSummary(user, config) {
  const cfg = config || rbacLoad();
  let roleGranted = 0;
  let extra = 0;
  let denied = 0;
  RBAC_TYPE_KEYS.forEach((type) => {
    (cfg.resources[type] || []).forEach((res) => {
      roleGranted += rbacRoleOps(user, type, res.id, cfg).length;
      extra += rbacOpsFromMap(user.additional, type, res.id).length;
      denied += rbacOpsFromMap(user.denied, type, res.id).length;
    });
  });
  return { roleGranted, extra, denied };
}
