import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Moon, Sun } from "lucide-react";

const LS_THEME = "ui_theme_v1";     // "dark" | "light"
const LS_GARLAND = "ui_garland_v1"; // "1" | "0"

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function readTheme() {
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "dark" || saved === "light") return saved;
  return "dark";
}

function readGarland() {
  const saved = localStorage.getItem(LS_GARLAND);
  if (saved === null) return true; // дефолт: включено
  return saved === "1";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  const [garland, setGarland] = useState(true);

  useEffect(() => {
    const t = readTheme();
    const g = readGarland();
    setTheme(t);
    setGarland(g);
    applyTheme(t);
    localStorage.setItem(LS_THEME, t);
    localStorage.setItem(LS_GARLAND, g ? "1" : "0");
  }, []);

  const isDark = theme === "dark";

  function toggleTheme(v) {
    const next = v ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(LS_THEME, next);
    applyTheme(next);
  }

  function toggleGarland(v) {
    setGarland(v);
    localStorage.setItem(LS_GARLAND, v ? "1" : "0");
  }
}