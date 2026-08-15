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
  { userid: "msv", password: "123", fullName: "msv" },
  { userid: "pnk", password: "123", fullName: "pnk" },
];

const TEMP_SESSION_KEY = "bestcast_temp_session";

// User IDs allowed to view dev.html (version history). Checked client-side
// only — like the rest of temp-local-auth.js, not a real access control
// boundary, just a UI gate until Supabase (see BACKLOG.md).
const DEV_PAGE_USERS = ["msv", "pnk"];

function tempFindUser(userid, password) {
  return TEMP_USERS.find((u) => u.userid === userid && u.password === password) || null;
}

// "Remember me" defaults to on and stays on (see login.html) — sessions are
// kept in localStorage so they survive closing the browser, not just the tab.
function tempGetSession() {
  const raw = localStorage.getItem(TEMP_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function tempSetSession(user) {
  localStorage.setItem(TEMP_SESSION_KEY, JSON.stringify({ userid: user.userid, fullName: user.fullName }));
}

function tempClearSession() {
  localStorage.removeItem(TEMP_SESSION_KEY);
}
