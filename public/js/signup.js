// Signup page behavior. Requires supabase-client.js to be loaded first.

function showError(message) {
  const el = document.getElementById("form-error");
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

function showSuccess(message) {
  const el = document.getElementById("form-success");
  if (!el) return;
  el.textContent = message;
  el.style.display = message ? "block" : "none";
}

function setLoading(isLoading) {
  const btn = document.getElementById("submit-btn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Creating account..." : "Create Account";
}

async function handleSignup(event) {
  event.preventDefault();
  showError("");
  showSuccess("");

  const fullName = document.getElementById("fullname").value.trim();
  const email = document.getElementById("userid").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (!fullName || !email || !password) {
    showError("Fill in all fields.");
    return;
  }
  if (password.length < 8) {
    showError("Password must be at least 8 characters.");
    return;
  }
  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  setLoading(true);

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    setLoading(false);
    showError(error.message);
    return;
  }

  // If email confirmation is required, there is no session yet and this
  // insert will simply be retried by an admin via the import script instead.
  if (data.session) {
    const userId = email; // User ID == email by convention (see data/users_master.xlsx)
    await supabaseClient.from("profiles").insert({
      id: data.user.id,
      user_id: userId,
      full_name: fullName,
      email,
      status: "Pending",
    });
  }

  setLoading(false);
  showSuccess(
    "Account request submitted. Check your email to confirm, then wait for an administrator to activate your account before logging in."
  );
  document.querySelector("form").reset();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".card");
  if (form) form.addEventListener("submit", handleSignup);
});
