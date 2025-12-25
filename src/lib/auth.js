// src/lib/auth.js
// Token-based auth via backend Telegram-code verification

const LS_TOKEN = "auth_token";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

export function getToken() {
  try { return localStorage.getItem(LS_TOKEN); } catch { return null; }
}
export function setToken(token) {
  try {
    if (!token) localStorage.removeItem(LS_TOKEN);
    else localStorage.setItem(LS_TOKEN, token);
  } catch {}
}
export function logout() {
  setToken(null);
}

// Load current user from backend using Bearer token.
export async function fetchMe() {
  const token = getToken();
  if (!token) throw new Error("NO_TOKEN");

  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    let j = null;
    try { j = await res.json(); } catch {}
    throw new Error(j?.error || `ME_${res.status}`);
  }
  return await res.json();
}

// Verify Telegram login code -> returns token + user
export async function loginByCode(code) {
  const res = await fetch(`${API_URL}/auth/tg/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  let j = null;
  try { j = await res.json(); } catch {}

  if (!res.ok) throw new Error(j?.error || `LOGIN_${res.status}`);

  if (j?.token) setToken(j.token);
  return j;
}