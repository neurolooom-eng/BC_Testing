// Knowledge Base — guides and documentation for the team.

const KB_ARTICLES = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket",
    summary: "First-time setup and login instructions.",
    body: `
      <h3>Signing In</h3>
      <ol>
        <li>Open the application in your browser.</li>
        <li>Enter your <strong>User ID</strong> and <strong>Password</strong> on the login page.</li>
        <li>Click <strong>Sign In</strong>.</li>
      </ol>
      <p>If you do not have credentials, contact your Administrator to create an account.</p>

      <h3>Navigation</h3>
      <p>The top bar shows every page you have access to. Your role determines which pages and actions
         are visible. The <strong>Overview</strong> dashboard is the landing page after sign-in.</p>

      <h3>Theme</h3>
      <p>Click the moon/sun icon in the top bar to toggle between dark and light themes.
         Your preference is remembered for this browser.</p>
    `,
  },
  {
    id: "process-check-sheet",
    title: "Process Check Sheet (PCS)",
    icon: "clipboard",
    summary: "How to create, fill, and approve a day sheet.",
    body: `
      <h3>Creating a Day Sheet</h3>
      <ol>
        <li>Go to <strong>Production Records → Process Check Sheet</strong>.</li>
        <li>Click <strong>New Day Sheet</strong>.</li>
        <li>Fill in the date, line, furnace number, metal grade, and degassing gas.</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <h3>Adding Machines</h3>
      <p>Open the day sheet and use <strong>Add Machine</strong> to register each machine
         on the line. Enter the M/C number, BC number, die coat thickness, die preheat
         temperature, cooling time, pouring time, and tilting time.</p>

      <h3>Recording Hourly Readings</h3>
      <p>Click a time slot in the hourly matrix to record furnace-level readings. Fields with
         tolerance ranges show a spec hint below the input. Out-of-spec values are highlighted
         in red and flagged on save.</p>

      <h3>Die Temperature</h3>
      <p>Each machine has a Die Temp reading per time slot. Enter it in the machine row of
         the hourly matrix. If a machine is not running during a slot, mark it as
         <strong>NA</strong>.</p>

      <h3>Shift Sign-Off</h3>
      <p>At the end of each shift, fill in the shift details (DPT, sets rejected, alloy in use)
         and the sign-off section (operator sign, supervisor sign, remarks). Submitting the
         last hourly reading of a shift triggers the approval workflow.</p>

      <h3>Approval</h3>
      <p>Users with the <strong>Approve records</strong> permission can approve shift records.
         Approving a shift also approves all hourly readings in that shift's range. An approved
         record is locked; it can be unlocked for rework by a user with the
         <strong>Withdraw approval</strong> permission.</p>

      <h3>Printing</h3>
      <p>Click the <strong>Print</strong> button on a day sheet (list or detail view) to open
         the printable view. This renders the complete QC FMT 038 form in landscape A4 layout.
         Use <strong>Ctrl+P</strong> (or Cmd+P on Mac) to print or save as PDF.</p>
    `,
  },
  {
    id: "tolerances",
    title: "Tolerances & Out-of-Spec",
    icon: "gauge",
    summary: "Understanding field tolerances and OOS highlighting.",
    body: `
      <h3>What Are Tolerances?</h3>
      <p>Each numeric field in the Process Check Sheet has a specification range (min–max) or
         an expected value. These come from the paper form QC FMT 038 and the "Tolerances Updated"
         reference sheet.</p>

      <h3>Out-of-Spec (OOS) Highlighting</h3>
      <p>When a recorded value falls outside its tolerance range, it is highlighted in
         <span style="background:#fce4e4;color:#c62828;padding:1px 6px;border-radius:4px;">red</span>.
         OOS values appear in the hourly matrix, the day sheet detail view, and the print view.</p>

      <h3>Editing Tolerances</h3>
      <p>Administrators can override tolerance values in
         <strong>Configuration → Tolerances</strong>. Changes apply immediately to OOS
         highlighting. Leave a field blank to fall back to the hardcoded default. Use
         <strong>Reset to defaults</strong> to clear all overrides.</p>

      <h3>Dynamic Ranges</h3>
      <p>Some fields have dynamic tolerances that depend on other values. For example,
         <strong>Rotor RPM</strong> range depends on the selected rotor size (100mm → 550–650 RPM,
         190mm → 350–400 RPM). These cannot be overridden from the Tolerances tab.</p>
    `,
  },
  {
    id: "roles-permissions",
    title: "Roles & Permissions",
    icon: "shield",
    summary: "How access control works in this application.",
    body: `
      <h3>Role-Based Access</h3>
      <p>Every user is assigned one or more roles. A role grants access to pages and actions.
         The built-in roles are:</p>
      <ul>
        <li><strong>Administrator</strong> — full access to everything, including configuration.</li>
        <li><strong>Quality Manager</strong> — production records, approvals, templates, QMS documents.</li>
        <li><strong>Shift Supervisor</strong> — creates day sheets, records data, approves shifts.</li>
        <li><strong>Operator</strong> — records hourly readings and machine status.</li>
        <li><strong>Viewer</strong> — read-only access to production records.</li>
      </ul>

      <h3>Per-User Exceptions</h3>
      <p>Administrators can grant or deny specific permissions to individual users beyond
         what their roles provide. These exceptions are shown in Configuration → Users.</p>

      <h3>Viewing Your Access</h3>
      <p>In Configuration → Users, click <strong>Access</strong> next to any user to see
         their effective permissions — what they can see and do, and where each permission
         comes from.</p>
    `,
  },
  {
    id: "configuration",
    title: "Configuration Guide",
    icon: "settings",
    summary: "Managing users, roles, resources, and variables.",
    body: `
      <h3>Users Tab</h3>
      <p>Create, edit, and deactivate user accounts. Assign roles, grant per-user exceptions,
         and clone access between users.</p>

      <h3>Roles Tab</h3>
      <p>Create custom roles with specific permission sets. Each role's permission matrix shows
         which pages, actions, links, and variables it grants access to.</p>

      <h3>Access Matrix</h3>
      <p>A read-only cross-reference of all roles versus all resources, so you can quickly see
         who can do what.</p>

      <h3>Tolerances</h3>
      <p>Override PCS field tolerance ranges. Changes affect OOS highlighting immediately.</p>

      <h3>Resources</h3>
      <p>Pages, Actions, Exec Links, Sheet Links, and Variables are the building blocks of
         the access model. Administrators can add custom resources and assign them to roles.</p>
    `,
  },
  {
    id: "qms-overview",
    title: "QMS Documents",
    icon: "folder",
    summary: "How to use the Quality Management System document registry.",
    body: `
      <h3>What Is the QMS Registry?</h3>
      <p>The QMS Documents page is a central registry for quality management system documents —
         SOPs, work instructions, forms, and reference materials. It provides a single place
         for the team to find the current version of any quality document.</p>

      <h3>Uploading Documents</h3>
      <p>Users with the <strong>Upload QMS document</strong> permission can add new documents.
         Fill in the document number, title, revision, category, and upload the file.</p>

      <h3>Categories</h3>
      <p>Documents are organized by category: SOP (Standard Operating Procedure),
         WI (Work Instruction), FMT (Form/Format), REF (Reference), and MANUAL.</p>

      <h3>Searching</h3>
      <p>Use the search bar to filter by document number, title, or category.</p>
    `,
  },
];

const KB_ICONS = {
  rocket: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>',
  gauge: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><path d="M12 16v-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"/><circle cx="12" cy="12" r="1"/></svg>',
  shield: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
  folder: '<svg viewBox="0 0 24 24" style="width:28px;height:28px;stroke:currentColor;stroke-width:1.6;fill:none;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z"/></svg>',
};

function kbRender() {
  const root = document.getElementById("kb-root");
  const hash = (window.location.hash || "").replace("#/", "");
  const article = KB_ARTICLES.find((a) => a.id === hash);

  if (article) {
    root.innerHTML = `
      <div class="breadcrumb">
        <a href="knowledge.html">Knowledge Base</a> / ${kbEsc(article.title)}
      </div>
      <h1>${kbEsc(article.title)}</h1>
      <div class="kb-article">${article.body}</div>`;
    return;
  }

  root.innerHTML = `
    <h1>Knowledge Base</h1>
    <p class="subtitle">Guides and documentation for using this application.</p>
    <div class="kb-grid">
      ${KB_ARTICLES.map((a) => `
        <a class="card kb-card" href="#/${a.id}">
          <div class="kb-icon">${KB_ICONS[a.icon] || ""}</div>
          <h2>${kbEsc(a.title)}</h2>
          <p>${kbEsc(a.summary)}</p>
        </a>`).join("")}
    </div>`;
}

// esc() lives in util.js — loaded before this file.
const kbEsc = esc;

document.addEventListener("DOMContentLoaded", () => {
  const session = renderTopbar("knowledge");
  if (!session) return;
  if (!rbacRequirePage(session, "page.knowledge")) return;
  kbRender();
  window.addEventListener("hashchange", kbRender);
});
