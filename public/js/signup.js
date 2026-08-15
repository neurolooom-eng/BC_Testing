// Signup page behavior.
//
// TEMPORARY: self-service signup is disabled while Supabase setup is on
// the backlog (see BACKLOG.md) — there's nowhere for a new account to go
// yet. During this period, use the hardcoded credentials in
// temp-local-auth.js, or ask an admin to add you there directly.

function showError(message) {
  const el = document.getElementById("form-error");
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

function handleSignup(event) {
  event.preventDefault();
  showError(
    "Self-service signup is temporarily unavailable. Contact your administrator for access."
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".card");
  if (form) form.addEventListener("submit", handleSignup);
});
