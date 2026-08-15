// Login page behavior.
//
// TEMPORARY: real auth (Supabase) is on the backlog (see BACKLOG.md). For
// now this checks against the hardcoded list in temp-local-auth.js instead
// of calling Supabase. Swap this back to Supabase per BACKLOG.md when ready.

function showError(message) {
  const el = document.getElementById("form-error");
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

function setLoading(isLoading) {
  const btn = document.getElementById("submit-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Signing in..." : "Log In";
}

function redirectIfAlreadySignedIn() {
  if (tempGetSession()) {
    window.location.href = "dashboard.html";
  }
}

function handleLogin(event) {
  event.preventDefault();
  showError("");

  const userId = document.getElementById("userid").value.trim();
  const password = document.getElementById("password").value;

  if (!userId || !password) {
    showError("Enter your User ID and password.");
    return;
  }

  setLoading(true);
  const user = tempFindUser(userId, password);
  setLoading(false);

  if (!user) {
    showError("Invalid User ID or password.");
    return;
  }

  tempSetSession(user);
  window.location.href = "dashboard.html";
}

function handleForgotPassword(event) {
  event.preventDefault();
  showError("Password reset isn't available yet in this temporary login mode.");
}

document.addEventListener("DOMContentLoaded", () => {
  redirectIfAlreadySignedIn();

  const form = document.querySelector(".card");
  if (form) form.addEventListener("submit", handleLogin);

  const forgotLink = document.querySelector(".forgot");
  if (forgotLink) forgotLink.addEventListener("click", handleForgotPassword);

  const signupLink = document.querySelector(".signup a");
  if (signupLink) signupLink.setAttribute("href", "signup.html");
});
