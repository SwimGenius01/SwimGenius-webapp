// ============================================
// AUTH.JS — handles login, register, demo
// Runs on index.html only
// ============================================

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

// If already logged in, skip straight to the app
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "app.html";
  }
});

// ── Tab switcher ──────────────────────────────
window.setTab = function(tab, el) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("tab-login").style.display    = tab === "login"    ? "" : "none";
  document.getElementById("tab-register").style.display = tab === "register" ? "" : "none";
};

// ── Login ─────────────────────────────────────
window.handleLogin = async function() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("login-error");
  errorEl.style.display = "none";

  if (!email || !password) {
    showError(errorEl, "Please enter your email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged above will redirect
  } catch (err) {
    showError(errorEl, friendlyError(err.code));
  }
};

// ── Register ──────────────────────────────────
window.handleRegister = async function() {
  const name     = document.getElementById("reg-name").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const errorEl  = document.getElementById("reg-error");
  errorEl.style.display = "none";

  if (!name || !email || !password) {
    showError(errorEl, "Please fill in all fields.");
    return;
  }
  if (password.length < 6) {
    showError(errorEl, "Password must be at least 6 characters.");
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // onAuthStateChanged above will redirect
  } catch (err) {
    showError(errorEl, friendlyError(err.code));
  }
};

// ── Demo (anonymous) ──────────────────────────
window.handleDemo = async function() {
  try {
    await signInAnonymously(auth);
    // onAuthStateChanged above will redirect
  } catch (err) {
    alert("Demo login failed. Check your Firebase config.");
  }
};

// ── Helpers ───────────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function friendlyError(code) {
  const map = {
    "auth/invalid-email":          "That doesn't look like a valid email.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/weak-password":          "Password should be at least 6 characters.",
    "auth/too-many-requests":      "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
