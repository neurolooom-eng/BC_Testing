// Login page behavior. Requires supabase-client.js to be loaded first.

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

async function redirectIfAlreadySignedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = "dashboard.html";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  showError("");

  const userId = document.getElementById("userid").value.trim();
  const password = document.getElementById("password").value;

  if (!userId || !password) {
    showError("Enter your User ID and password.");
    return;
  }

  // The "User ID" field is the person's email address (see data/users_master.xlsx —
  // User ID and Email are kept identical for every account).
  const email = userId;

  setLoading(true);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  setLoading(false);

  if (error) {
    showError("Invalid User ID or password.");
    return;
  }

  // Block sign-in for accounts the roster marks Inactive/Pending, in case
  // the Supabase Auth account still exists but shouldn't be usable yet.
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .single();

  if (profile && profile.status !== "Active") {
    await supabaseClient.auth.signOut();
    showError("This account is not active. Contact your administrator.");
    return;
  }

  window.location.href = "dashboard.html";
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const userId = document.getElementById("userid").value.trim();
  if (!userId) {
    showError("Enter your User ID above first, then click 'Forgot password?'.");
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(userId, {
    redirectTo: window.location.origin + "/reset-password.html",
  });
  if (error) {
    showError("Could not send reset email. Try again later.");
  } else {
    showError("");
    alert("If that account exists, a password reset link has been sent.");
  }
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
