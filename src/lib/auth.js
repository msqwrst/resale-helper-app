// src/lib/auth.js
// Token-based auth via backend Telegram-code verification
// Uses the same API base resolution as src/lib/api.js (Render/VITE_API_URL, dev, electron file://, same-origin)

const LS_TOKEN = "auth_token";
const DEV_FALLBACK = "http://127.0.0.1:3001";

// In Vite:
const API_URL_RAW = import.meta.env.VITE_API_URL;

function normalizeBaseUrl(raw) {
  if (!raw) return "";

  let s = String(raw).trim();

  // Частая ошибка: вставляют целиком "VITE_API_URL=https://..."
  s = s.replace(/^VITE_API_URL\s*=\s*/i, "").trim();

  // Иногда пишут с пробелами: "VITE API URL=https://..."
  s = s.replace(/^VITE\s+API\s+URL\s*=\s*/i, "").trim();

  // Убираем кавычки
  s = s.replace(/^[\"']|[\"']$/g, "").trim();

  // Если забыли протокол — добавим https://
  if (s && !/^https?:\/\//i.test(s)) {
    s = "https://" + s;
  }

  // Убираем хвостовые слэши
  s = s.replace(/\/+$/, "");

  return s;
}

function resolveApiBase() {
  const normalized = normalizeBaseUrl(API_URL_RAW);

  // 1) Если задано через env — используем
  if (normalized) return normalized;

  // 2) Если Electron/страница открыта как file:// — нельзя ходить по относительным путям (будет ERR_FILE_NOT_FOUND)
  if (typeof window !== "undefined" && window.location?.protocol === "file:") {
    return DEV_FALLBACK;
  }

  // 3) Если dev — fallback на локалхост
  if (import.meta.env.DEV) return DEV_FALLBACK;

  // 4) Прод без env: пробуем тот же домен (если у тебя прокси / api на том же хосте)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // 5) Последний шанс
  return DEV_FALLBACK;
}

const API_URL = resolveApiBase();

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

// Optional: for debugging
export function getApiBase() {
  return API_URL;
}
