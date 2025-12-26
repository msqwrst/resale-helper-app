import SeasonalEffects from "@/components/SeasonalEffects";
import { fetchMe, logout } from "@/lib/auth";
import HolidayLights from "@/components/HolidayLights";
import React, { useEffect, useMemo, useState, useLayoutEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Timer,
  Calculator,
  Info,
  ChevronRight,
  Star,
  Settings,
  Moon,
  Sun,
  Snowflake,
  Search,
  Power,
  Bot,
  Shield,
  Users,
  RefreshCw,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LS_THEME = "app_theme";
const LS_EFFECTS = "app_fx_enabled";

function applyThemeToDom(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function getInitialTheme() {
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "dark" || saved === "light") return saved;

  // ✅ дефолт всегда тёмная (чтобы не было белого после перезапуска/в packaged)
  return "dark";
}

function getInitialFxEnabled() {
  const saved = localStorage.getItem(LS_EFFECTS);
  if (saved === "0") return false;
  if (saved === "1") return true;
  return true;
}

function safeAutoStartAPI() {
  return typeof window !== "undefined" && window.appAPI?.autostart ? window.appAPI.autostart : null;
}

function ToggleRow({ icon: Icon, title, subtitle, value, onToggle, rightLabel, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition select-none ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
      type="button"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
      </div>

      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-slate-50">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-2">
        {rightLabel && <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{rightLabel}</div>}
        <div className={`w-11 h-6 rounded-full p-1 transition ${value ? "bg-emerald-500/90" : "bg-slate-300 dark:bg-slate-700"}`}>
          <div className={`w-4 h-4 rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0"}`} />
        </div>
      </div>
    </button>
  );
}

function HolidayDrawerHeader({ onClose }) {
  const snow = useMemo(() => Array.from({ length: 14 }), []);
  return (
    <div className="relative overflow-hidden text-white p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-fuchsia-700">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.16),transparent_50%)]" />

      <div className="pointer-events-none absolute inset-0">
        {snow.map((_, i) => (
          <span
            key={i}
            className="absolute -top-6 text-white/80"
            style={{
              left: `${(i * 100) / 14}%`,
              fontSize: `${10 + (i % 4) * 2}px`,
              animation: `drawerSnow ${5 + (i % 5)}s linear ${i * 0.25}s infinite`,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))"
            }}
          >
            ❄️
          </span>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="w-5 h-5" />
        </Button>
        <div className="text-xs text-white/80">Holiday UI</div>
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center relative"
        >
          <span className="text-3xl">🎄</span>
        </motion.div>

        <div>
          <h2 className="text-xl font-bold">Resale Helper</h2>
          <p className="text-indigo-100 text-sm">Track • Calculate • Succeed</p>
        </div>
      </div>

      <style>{`
        @keyframes drawerSnow {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(110px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function PillItem({ active, icon: Icon, label, to, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl transition select-none ${
        active
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/12 dark:text-indigo-200"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/60"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Icon className={`w-5 h-5 ${active ? "text-indigo-600 dark:text-indigo-200" : ""}`} />
      <span className="text-sm font-semibold truncate">{label}</span>
      {active ? (
        <motion.span
          layoutId="pillActive"
          className="absolute inset-0 rounded-2xl ring-1 ring-indigo-200/70 dark:ring-indigo-500/20"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
        />
      ) : null}
    </Link>
  );
}

function parseVipUntil(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [theme, setTheme] = useState(() => getInitialTheme());
  const [fxEnabled, setFxEnabled] = useState(() => getInitialFxEnabled());

  const autoAPI = useMemo(() => safeAutoStartAPI(), []);
  const [autoStart, setAutoStart] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(true);

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);

  const onLogout = () => {
    logout();
    window.location.hash = "#/login";
  };

  async function refreshMe() {
    setMeLoading(true);
    try {
      const data = await fetchMe();
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setMeLoading(false);
    }
  }

  // ✅ профиль + автообновление каждые 10 сек
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const data = await fetchMe();
        if (!alive) return;
        setMe(data);
      } catch {
        if (!alive) return;
        setMe(null);
      }
    }

    load();
    const t = setInterval(load, 10000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  
// ✅ права (учёт role + vip_until + vip_active)
const role = String(me?.role || "").toLowerCase();
const isGold = role === "gold";
const isAdmin = role === "admin";
const isStaff = false;
const vipUntil = parseVipUntil(me?.vip_until);
const vipByDate = vipUntil ? vipUntil.getTime() > Date.now() : false;

// VIP-права: vip / staff / admin / vip_active / vip_until
const isVip = isAdmin || role === "vip" || isGold || !!me?.vip_active || vipByDate;

  useEffect(() => {
  applyThemeToDom(theme);
  localStorage.setItem(LS_THEME, theme);
}, [theme]);

  useEffect(() => {
    localStorage.setItem(LS_EFFECTS, fxEnabled ? "1" : "0");
  }, [fxEnabled]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!autoAPI) return;
        const res = await autoAPI.get();
        if (!alive) return;
        setAutoStart(!!res?.openAtLogin);
      } catch {
        // ignore
      } finally {
        if (alive) setAutoStartLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [autoAPI]);

  async function toggleAutoStart() {
    const next = !autoStart;
    setAutoStart(next);
    try {
      if (!autoAPI) return;
      const res = await autoAPI.set(next);
      setAutoStart(!!res?.openAtLogin);
    } catch {
      setAutoStart((prev) => !prev);
    }
  }


const menuItems = [
  { name: "Home", icon: Home, page: "Home", to: "/home" },
  { name: "BP", icon: Star, page: "BP", to: "/bp" },
  { name: "Timer", icon: Timer, page: "Timer", to: "/timer" },
  { name: "Calculator", icon: Calculator, page: "Calculator", to: "/calculator" },
  { name: "VIP", icon: Crown, page: "VIP", to: "/vip" },
  { name: "About", icon: Info, page: "About", to: "/about" },

  // ✅ Админ-панель доступна STAFF и ADMIN
  ...(isAdmin
    ? [
        { name: "Admin Keys", icon: Shield, page: "Admin", to: "/admin" },
        { name: "Admin Panel", icon: Users, page: "AdminUsers", to: "/admin/users" }
      ]
    : [])
];


  // ✅ Если страницы передают currentPageName неправильно (например, "Admin" для всех админ-роутов),
  // то определяем активный пункт по URL, чтобы меню подсвечивалось корректно.
  const pathname = location?.pathname || "";
    const isRouteActive = (to) => {
    if (!to) return false;
    if (to === "/") return pathname === "/" || pathname === "";

    // ✅ Важно: /admin не должен подсвечиваться на /admin/users
    if (to === "/admin") return pathname === "/admin";

    // точное совпадение или вложенные маршруты
    return pathname === to || pathname.startsWith(to + "/");
  };

  const routeCurrentItem = menuItems.find((item) => isRouteActive(item.to));
  const headerTitle = routeCurrentItem?.name || currentPageName || "Resale Helper";


  const currentItem = routeCurrentItem || menuItems.find((item) => item.page === currentPageName);

  
  const CurrentIcon = currentItem?.icon || null;
const statusKind = isAdmin ? "admin" : isGold ? "gold" : isVip ? "vip" : "free";
const statusLabel = isAdmin ? "ADMIN" : isGold ? "GOLD" : isVip ? "VIP" : "FREE";
  
const STATUS_BADGE = {
  admin: "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]",
  gold: "bg-yellow-500 shadow-[0_0_18px_rgba(234,179,8,0.45)]",
  vip: "bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.40)]",
  free: "bg-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.35)]",
};

const statusBadgeClass = STATUS_BADGE[statusKind] || STATUS_BADGE.free;


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <SeasonalEffects enabled={fxEnabled} />
      <HolidayLights enabled={fxEnabled} />

      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between px-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(true)} className="hover:bg-slate-100 dark:hover:bg-slate-900">
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </Button>

          <h1 className="font-semibold flex items-center gap-2">
  {CurrentIcon ? <CurrentIcon className="w-5 h-5" /> : null}
  {headerTitle}
</h1>

<div className="flex items-center gap-2">
  <span
    className="hidden sm:inline-flex items-center gap-2 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 bg-white/70 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
    title="Активный статус"
  >
    <span className={`w-2 h-2 rounded-full ${statusBadgeClass}`} />
    {statusLabel}
  </span>

  <Button
    variant="ghost"
    size="icon"
    onClick={() => setSettingsOpen(true)}
    className="hover:bg-slate-100 dark:hover:bg-slate-900"
    title="Settings"
  >
    <Settings className="w-5 h-5 text-slate-700 dark:text-slate-200" />
  </Button>
</div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            key="settingsOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
            onMouseDown={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl p-5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-50">Настройки</div>
                <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)} className="hover:bg-slate-100 dark:hover:bg-slate-900">
                  <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                </Button>
              </div>

              <div className="space-y-3">
                <ToggleRow
                  icon={theme === "dark" ? Moon : Sun}
                  title="Тема"
                  subtitle="Переключить на тёмную или светлую"
                  value={theme === "dark"}
                  rightLabel={theme === "dark" ? "Dark" : "Light"}
                  onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                />

                <ToggleRow
                  icon={Snowflake}
                  title="Снег и гирлянды"
                  subtitle="Отключает эффекты на экране (ёлка в меню остаётся)"
                  value={fxEnabled}
                  rightLabel={fxEnabled ? "ON" : "OFF"}
                  onToggle={() => setFxEnabled((v) => !v)}
                />

                <ToggleRow
                  icon={Power}
                  title="Автозапуск приложения"
                  subtitle="Запускать вместе с Windows (в фоне, как Discord)"
                  value={autoStart}
                  rightLabel={autoStartLoading ? "..." : autoStart ? "ON" : "OFF"}
                  onToggle={toggleAutoStart}
                  disabled={autoStartLoading || !autoAPI}
                />

                <Button
                  variant="outline"
                  onClick={refreshMe}
                  disabled={meLoading}
                  className="w-full justify-center gap-2 rounded-2xl"
                >
                  <RefreshCw className={`w-4 h-4 ${meLoading ? "animate-spin" : ""}`} />
                  {meLoading ? "Обновляю..." : "Обновить статус"}
                </Button>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Текущий статус:{" "}
                  <span className="font-semibold">
                    {isAdmin ? "ADMIN" : isGold ? "GOLD" : isVip ? "VIP" : "FREE"}
                  </span>
                  {vipUntil ? (
                    <span className="ml-2 opacity-80">
                      (vip_until: {vipUntil.toLocaleString()})
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Эти настройки сохраняются на этом устройстве.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-950 z-50 shadow-2xl border-r border-slate-100 dark:border-slate-900"
          >
            <HolidayDrawerHeader onClose={() => setIsDrawerOpen(false)} />

            <nav className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Menu</p>

              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = isRouteActive(item.to) || currentPageName === item.page;
                  return (
                    <motion.div key={item.page} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                      <Link
                        to={item.to}
                        onClick={() => setIsDrawerOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"}`} />
                        <span className="font-medium flex-1">{item.name}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-900 space-y-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onLogout();
                }}
                className="w-full justify-start gap-3 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Power className="w-5 h-5" />
                Выйти
              </Button>

              <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                Version {__APP_VERSION__}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-16 pb-28">{children}</main>

      <div className="fixed left-0 right-0 bottom-0 z-40 pb-4 px-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-[26px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl shadow-2xl shadow-slate-200/35 dark:shadow-black/35 p-2">
            <div className="flex items-center gap-2">
              <PillItem active={isRouteActive("/home")} icon={Home} label="Home" to="/home" onClick={() => {}} />
              <PillItem active={isRouteActive("/bp")} icon={Star} label="BP" to="/bp" onClick={() => {}} />
              <PillItem active={isRouteActive("/timer")} icon={Timer} label="Timer" to="/timer" onClick={() => {}} />
              <PillItem active={isRouteActive("/calculator")} icon={Calculator} label="Calc" to="/calculator" onClick={() => {}} />
              <PillItem active={isRouteActive("/vip")} icon={Crown} label="VIP" to="/vip" onClick={() => {}} />

              <PillItem active={isRouteActive("/about")} icon={Info} label="About" to="/about" onClick={() => {}} />

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="ml-1 shrink-0 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/30 hover:bg-white dark:hover:bg-slate-900 transition select-none"
                title="Меню"
              >
                <Search className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
