const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

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
  console.log("API CALL =>", `${API_URL}${path}`);
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
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

  if (!res.ok) {
    throw new Error(data?.error || "API error");
  }

  return data;
}
