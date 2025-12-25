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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
