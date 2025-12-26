import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const LS_THEME = "app_theme"; // то же, что в Layout

(function applyThemeEarly() {
  try {
    const saved = localStorage.getItem(LS_THEME);
    const theme = saved === "light" ? "light" : "dark"; // default dark
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  } catch {
    // если localStorage недоступен — всё равно dark
    document.documentElement.classList.add("dark");
  }
})();

/**
 * GLOBAL FETCH PATCH (PROD HOSTING)
 * Fixes Electron file:// + relative fetch("/...") turning into file:///...
 * Any fetch("/path") will become: https://resale-helper-app.onrender.com/path
 */
(function patchFetchForProdHosting() {
  const API_BASE = "https://resale-helper-app.onrender.com".replace(/\/+$/, "");
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const isRequest = typeof input === "object" && input?.url;
    let url = isRequest ? input.url : input;

    // Rewrite relative API calls to absolute backend URL
    if (typeof url === "string" && url.startsWith("/")) {
      url = API_BASE + url;
    }

    // If Request object was passed, rebuild it with the rewritten URL
    if (isRequest && typeof url === "string") {
      input = new Request(url, input);
    } else {
      input = url;
    }

    return originalFetch(input, init);
  };

  console.log("[FETCH PATCH ACTIVE] API_BASE =", API_BASE);
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
