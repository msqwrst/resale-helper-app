// src/lib/api.js

const DEV_FALLBACK = "http://127.0.0.1:3001";

// В Vite доступно import.meta.env.DEV
const API_URL_RAW = import.meta.env.VITE_API_URL;

function normalizeBaseUrl(raw) {
  if (!raw) return "";

  let s = String(raw).trim();

  // Частая ошибка: вставляют целиком "VITE_API_URL=https://..."
  s = s.replace(/^VITE_API_URL\s*=\s*/i, "").trim();

  // Иногда пишут с пробелами: "VITE API URL=https://..."
  s = s.replace(/^VITE\s+API\s+URL\s*=\s*/i, "").trim();

  // Убираем кавычки
  s = s.replace(/^["']|["']$/g, "").trim();

  // Если забыли протокол — добавим https://
  if (!/^https?:\/\//i.test(s)) {
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
  return localStorage.getItem("auth_token");
}
export function setToken(token) {
  localStorage.setItem("auth_token", token);
}
export function clearToken() {
  localStorage.removeItem("auth_token");
}

export async function api(path, options = {}) {
  const url = `${API_URL}${path}`;
  console.log("API CALL =>", url);

  const token = getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) throw new Error(data?.error || "API error");
  return data;
}
