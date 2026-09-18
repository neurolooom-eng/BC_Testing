// TEMPORARY stand-in for real authentication, while Supabase setup is on
// the backlog (see BACKLOG.md). Hardcoded credentials, checked entirely in
// the browser.
//
// THIS IS NOT SECURE. Anyone can read these credentials from page source
// or dev tools, and nothing stops them from skipping login.html entirely.
// Do not use this for anything beyond local/internal testing, and replace
// it with public/js/auth.js (Supabase) before any real users touch this
// site. See BACKLOG.md for the swap-back steps.

const TEMP_USERS = [
  { userid: "msv", password: "123", fullName: "msv", roleId: "role.administrator" },
  { userid: "pnk", password: "123", fullName: "pnk", roleId: "role.administrator" },
  { userid: "mohan_testing", password: "123", fullName: "Mohan Testing", roleId: "role.administrator" },
  { userid: "administrator", password: "123", fullName: "Administrator", roleId: "role.administrator" },
  { userid: "quality_manager", password: "123", fullName: "Quality Manager", roleId: "role.quality_manager" },
  { userid: "shift_supervisor", password: "123", fullName: "Shift Supervisor", roleId: "role.shift_supervisor" },
  { userid: "operator", password: "123", fullName: "Operator", roleId: "role.operator" },
  { userid: "viewer", password: "123", fullName: "Viewer", roleId: "role.viewer" },
];

const TEMP_SESSION_KEY = "bestcast_temp_session";
const TEMP_SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

const DEV_PAGE_USERS = TEMP_USERS.filter((u) => u.roleId === "role.administrator").map((u) => u.userid);

function tempFindUser(userid, password) {
  return TEMP_USERS.find((u) => u.userid === userid && u.password === password) || null;
}

function tempGetSession() {
  var raw = localStorage.getItem(TEMP_SESSION_KEY) || sessionStorage.getItem(TEMP_SESSION_KEY);
  if (!raw) return null;
  try {
    var session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      tempClearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function tempSetSession(user, remember) {
  var session = {
    userid: user.userid,
    fullName: user.fullName,
    expiresAt: Date.now() + TEMP_SESSION_TIMEOUT_MS,
  };
  var json = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(TEMP_SESSION_KEY, json);
    sessionStorage.removeItem(TEMP_SESSION_KEY);
  } else {
    sessionStorage.setItem(TEMP_SESSION_KEY, json);
    localStorage.removeItem(TEMP_SESSION_KEY);
  }
}

function tempClearSession() {
  sessionStorage.removeItem(TEMP_SESSION_KEY);
  localStorage.removeItem(TEMP_SESSION_KEY);
}
