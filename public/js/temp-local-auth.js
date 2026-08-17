// TEMPORARY stand-in for real authentication, while Supabase setup is on
// the backlog (see BACKLOG.md). Hardcoded credentials, checked entirely in
// the browser.
//
// THIS IS NOT SECURE. Anyone can read these credentials from page source
// or dev tools, and nothing stops them from skipping login.html entirely.
// Do not use this for anything beyond local/internal testing, and replace
// it with public/js/auth.js (Supabase) before any real users touch this
// site. See BACKLOG.md for the swap-back steps.

// Every account here signs in with the password "123". The roleId decides
// what the account can do once it is in — see rbac.js, which seeds these
// accounts against those roles.
//
// The five role accounts exist so the access model can be exercised from
// each side without reassigning roles in Configuration: sign in as
// "operator" to see exactly what an operator sees. They are test fixtures
// and must be removed before the site carries real data — the cleanup is
// tracked in BACKLOG.md.
const TEMP_USERS = [
  // Original working accounts.
  { userid: "msv", password: "123", fullName: "msv", roleId: "role.administrator" },
  { userid: "pnk", password: "123", fullName: "pnk", roleId: "role.administrator" },

  // One dummy account per role, named for the role it carries.
  { userid: "administrator", password: "123", fullName: "Administrator", roleId: "role.administrator" },
  { userid: "quality_manager", password: "123", fullName: "Quality Manager", roleId: "role.quality_manager" },
  { userid: "shift_supervisor", password: "123", fullName: "Shift Supervisor", roleId: "role.shift_supervisor" },
  { userid: "operator", password: "123", fullName: "Operator", roleId: "role.operator" },
  { userid: "viewer", password: "123", fullName: "Viewer", roleId: "role.viewer" },
];

const TEMP_SESSION_KEY = "bestcast_temp_session";

// Dev page access is no longer a list here — it is the "page.dev"
// permission, held by the Administrator role and maintained in
// Configuration. Kept only so any stored session or bookmark referring to
// the old constant does not fail; nothing reads it.
const DEV_PAGE_USERS = TEMP_USERS.filter((u) => u.roleId === "role.administrator").map((u) => u.userid);

function tempFindUser(userid, password) {
  return TEMP_USERS.find((u) => u.userid === userid && u.password === password) || null;
}

// "Remember me" was removed (see BACKLOG.md history) — sessions live in
// sessionStorage, so signing in only lasts for the current tab.
function tempGetSession() {
  const raw = sessionStorage.getItem(TEMP_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function tempSetSession(user) {
  sessionStorage.setItem(TEMP_SESSION_KEY, JSON.stringify({ userid: user.userid, fullName: user.fullName }));
}

function tempClearSession() {
  sessionStorage.removeItem(TEMP_SESSION_KEY);
}
