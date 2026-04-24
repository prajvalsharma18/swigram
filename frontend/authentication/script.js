const API_BASE_URL = "http://localhost:3000/api";
const TOKEN_KEY = "swigram_token";

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const statusEl = document.getElementById("status");
const searchParams = new URLSearchParams(window.location.search);

function authPath() {
  const p = window.location.pathname || "/";
  if (p === "/" || p === "") return "/";
  return p.replace(/\/$/, "") || "/";
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status";
  if (type) statusEl.classList.add(type);
}

function switchTab(mode) {
  const isLogin = mode === "login";
  tabLogin.classList.toggle("active", isLogin);
  tabSignup.classList.toggle("active", !isLogin);
  loginForm.classList.toggle("active", isLogin);
  signupForm.classList.toggle("active", !isLogin);
  setStatus("");
}

async function postJSON(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return response.json();
}

function saveSession(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Validate stored token with backend; drop it if invalid. */
async function tryResumeSession() {
  const token = getStoredToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.user) {
      setStatus(`Signed in as ${data.user.email}`, "success");
      return;
    }
    clearSession();
  } catch {
    /* network error — keep token for retry */
  }
}

tabLogin.addEventListener("click", () => switchTab("login"));
tabSignup.addEventListener("click", () => switchTab("signup"));

if (searchParams.get("mode") === "signup") {
  switchTab("signup");
} else {
  switchTab("login");
}

tryResumeSession();

const toastMessage = searchParams.get("toast");
if (toastMessage) {
  showToast(toastMessage, "success");
  window.history.replaceState({}, "", authPath());
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Logging in...");

  const payload = {
    email: loginForm.email.value.trim(),
    password: loginForm.password.value
  };

  try {
    const result = await postJSON("/auth/login", payload);
    if (result.success) {
      if (result.token) {
        saveSession(result.token);
      }
      setStatus(result.message || "Login successful", "success");
      showToast("Welcome back! Login successful.", "success");
      loginForm.reset();
      window.location.href = "/reels/";
      return;
    }
    setStatus(result.message || "Login failed", "error");
    showToast(result.message || "Login failed", "error");
  } catch (error) {
    setStatus("Server error while login. Check backend is running.", "error");
    showToast("Server error while login.", "error");
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Creating account...");

  const payload = {
    name: signupForm.name.value.trim(),
    email: signupForm.email.value.trim(),
    password: signupForm.password.value
  };

  try {
    const result = await postJSON("/auth/signup", payload);
    if (result.success) {
      if (result.token) {
        saveSession(result.token);
      }
      setStatus(result.message || "Signup successful.", "success");
      signupForm.reset();
      if (result.token) {
        window.location.href = "/reels/";
      } else {
        const path = authPath();
        const toastText = "Account created! Please login to continue.";
        const nextUrl = `${path}?mode=login&toast=${encodeURIComponent(toastText)}`;
        window.location.href = nextUrl;
      }
      return;
    }
    setStatus(result.message || "Signup failed", "error");
    showToast(result.message || "Signup failed", "error");
  } catch (error) {
    setStatus("Server error while signup. Check backend is running.", "error");
    showToast("Server error while signup.", "error");
  }
});
