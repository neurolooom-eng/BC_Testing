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

function tempFindUser(userid, password) {
  return TEMP_USERS.find((u) => u.userid === userid && u.password === password) || null;
}

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
