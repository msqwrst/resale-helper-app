// src/lib/api.js

const DEV_FALLBACK = "http://127.0.0.1:3001";

// В Vite доступно import.meta.env.DEV
const API_URL_RAW = import.meta.env.VITE_API_URL;

const API_URL = (() => {
  // 1) Если задано через Render (VITE_API_URL) — используем
  if (API_URL_RAW && String(API_URL_RAW).trim()) return String(API_URL_RAW).trim();

  // 2) Если это dev (npm run dev / локально) — можно fallback на локалхост
  if (import.meta.env.DEV) return DEV_FALLBACK;

  // 3) В проде без env — это ошибка конфигурации (иначе кенты будут уходить в localhost)
  throw new Error(
    "VITE_API_URL is not set. Set it in Render Static Site → Environment (e.g. https://resale-helper-app.onrender.com)"
  );
})();

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
