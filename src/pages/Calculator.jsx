import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calculator as CalcIcon,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ListFilter,
  RotateCcw,
  Search,
  Pencil,
  Check,
  X,
  Car,
  Bell,
  BellOff,
  Clock3,
  RefreshCw,
  ChartNoAxesCombined,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  Send,
  Boxes,
  Layers3
} from "lucide-react";
import { format } from "date-fns";

// ✅ ВАЖНО: положи файл сюда: src/assets/facebook-messenger-ringtone.mp3
import ringtoneMp3 from "@/assets/facebook-messenger-ringtone.mp3";

// ⚠️ В браузерной версии (Vite) нельзя использовать require().
// Если у тебя есть fetchMe в проекте — импортируй его обычным import в этом файле.
// Тут оставляем null, чтобы страница НЕ падала.
const fetchMeSafe = null;

// ====== LS keys ======
const LS_KEY_ENTRIES = "resale_calc_entries_v3";
const LS_KEY_CHART = "resale_calc_chart_v2";
const LS_KEY_RENTALS = "resale_rentals_v4";
const LS_KEY_ENTRY_IMAGES = "resale_calc_entry_images_v1";
const LS_KEY_TG_ENABLED = "resale_tg_enabled_v1"; // ✅ NEW
const LS_KEY_CHART_TAB = "resale_chart_tab_v1"; // ✅ NEW
const LS_KEY_CHART_COLLAPSED = "resale_chart_collapsed_v1"; // ✅ NEW (скрывать графики)
const LS_KEY_VEHICLE_DIR = "resale_vehicle_dir_v1"; // ✅ NEW (список названий Т/С для статистики)
const LS_KEY_AUTO_STATS_HIDDEN = "resale_auto_stats_hidden_v1"; // ✅ NEW (скрытые в панели статистики)
const LS_KEY_RENTALS_COLLAPSED = "resale_rentals_collapsed_v1"; // ✅ NEW (свернуть аренду слева)

// ====== helpers ======
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function uniqStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const s = String(v || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return `$${v.toFixed(2)}`;
}

// ✅ compact money (чтобы большие числа не вылезали за карточку)
function moneyCompact(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0";
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${Math.round(v / 1000)}k`;
  if (abs >= 1_000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
}

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  if (hh > 0) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${mm}:${pad(ss)}`;
}

function dateKeyLocalFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function niceMoneyTick(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  const abs = Math.abs(v);
  if (abs >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

function clampNum(n, fallback = 0) {
  const v = Number(String(n).trim().replace(",", "."));
  return Number.isFinite(v) ? v : fallback;
}

function calcEntryAmount(e) {
  // Backward compatible:
  // - старые записи: {amount}
  // - новые "покупка/продажа": {buy, sell} → прибыль
  if (typeof e?.amount === "number") return e.amount;

  const buy = Number(e?.buy);
  const sell = Number(e?.sell);

  const b = Number.isFinite(buy) ? buy : 0;
  const s = Number.isFinite(sell) ? sell : 0;

  // Если продажа ещё не указана — считаем как расход на покупку (минус)
  if (!s) return -Math.abs(b || 0);

  return s - Math.abs(b || 0);
}

function getEntryCategory(e) {
  // "all" | "auto" | "items"
  const c = String(e?.category || "").toLowerCase();
  if (c === "auto") return "auto";
  if (c === "items") return "items";
  return "all";
}

function buildSeries(entries, daysBack = 30) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - (daysBack - 1));

  const daily = new Map();
  for (const e of entries || []) {
    const ts = e?.timestamp;
    if (!ts) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    if (d < start || d > end) continue;
    const key = dateKeyLocalFromDate(d);

    const amt = calcEntryAmount(e);
    daily.set(key, (daily.get(key) || 0) + (Number(amt) || 0));
  }

  const out = [];
  let cur = new Date(start);
  let cum = 0;

  while (cur <= end) {
    const key = dateKeyLocalFromDate(cur);
    const sum = daily.get(key) || 0;
    cum += sum;
    out.push({ date: key, sum, cumulative: cum });
    cur = new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }

  return out;
}

// ====== small icon button ======
function IconBtn({ title, onClick, disabled, children, className = "", ...rest }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`p-2 rounded-xl border transition ${className} ${disabled
          ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
        }`}
    >
      {children}
    </button>
  );
}

function LockedBlock({ title = "Доступно только VIP", subtitle = "Обнови статус выше FREE, чтобы открыть функцию." }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/30">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50">
          <Lock className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

// ====== Auto stats (UNDER chart) ======
function AutoStatsUnderChart({ rentals, setRentals, vehicleDir, setVehicleDir }) {
  const [period, setPeriod] = useState("7"); // "7" | "30" | "all"
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingVehicleValue, setEditingVehicleValue] = useState("");
  const [hidden, setHidden] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_KEY_AUTO_STATS_HIDDEN) || "");
    return Array.isArray(saved) ? saved : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_AUTO_STATS_HIDDEN, JSON.stringify(hidden || []));
    } catch { }
  }, [hidden]);

  const hiddenSet = useMemo(() => new Set((hidden || []).map((s) => String(s).toLowerCase())), [hidden]);
  const now = Date.now();
  const since = useMemo(() => {
    if (period === "7") return now - 7 * 24 * 60 * 60 * 1000;
    if (period === "30") return now - 30 * 24 * 60 * 60 * 1000;
    return 0;
  }, [period, now]);

  const rows = useMemo(() => {
    const names = uniqStrings([...(vehicleDir || []), ...(rentals || []).map((r) => r?.name)]);

    const map = new Map();
    for (const n of names) map.set(n, { name: n, profit: 0, hours: 0, count: 0 });

    for (const r of rentals || []) {
      if (!r?.name) continue;
      const nm = String(r.name);
      const startAt = Number(r.startAt || 0);
      if (since && startAt && startAt < since) continue;
      const rent = Number(r.rent || 0);
      const endAt = Number(r.endAt || 0);
      const durH = endAt && startAt ? Math.max(0, (endAt - startAt) / 3600000) : 0;

      const cur = map.get(nm) || { name: nm, profit: 0, hours: 0, count: 0 };
      cur.profit += Number.isFinite(rent) ? rent : 0;
      cur.hours += Number.isFinite(durH) ? durH : 0;
      cur.count += 1;
      map.set(nm, cur);
    }

    let out = Array.from(map.values());
    const q = String(query || "").trim().toLowerCase();
    if (q) out = out.filter((x) => String(x.name).toLowerCase().includes(q));

    // hide logic only for panel
    out = out.filter((x) => (showHidden ? true : !hiddenSet.has(String(x.name).toLowerCase())));

    // sort by profit desc
    out.sort((a, b) => (b.profit || 0) - (a.profit || 0));
    return out;
  }, [rentals, vehicleDir, since, query, hiddenSet, showHidden]);

  const totals = useMemo(() => {
    let profit = 0;
    let hours = 0;
    let count = 0;
    for (const r of rows) {
      profit += Number(r.profit) || 0;
      hours += Number(r.hours) || 0;
      count += Number(r.count) || 0;
    }
    return { profit, hours, count };
  }, [rows]);

  const top1 = useMemo(() => (rows && rows.length ? rows[0] : null), [rows]);
  const top2 = useMemo(() => (rows && rows.length > 1 ? rows[1] : null), [rows]);

  const display = useMemo(() => {
    if (showAll || rows.length <= 5) return rows;
    return rows.slice(0, 5);
  }, [rows, showAll]);

  const maxProfit = useMemo(() => {
    return Math.max(1, ...display.map((x) => Math.abs(Number(x.profit) || 0)));
  }, [display]);

  const hideVehicle = (name) => {
    const key = String(name || "").trim();
    if (!key) return;
    const lower = key.toLowerCase();
    if (hiddenSet.has(lower)) return;
    setHidden((prev) => [...(prev || []), key]);
  };
  const unhideVehicle = (name) => {
    const lower = String(name || "").trim().toLowerCase();
    setHidden((prev) => (prev || []).filter((x) => String(x).trim().toLowerCase() !== lower));
  };

  const Chip = ({ id, children }) => (
    <button
      type="button"
      onClick={() => setPeriod(id)}
      className={`px-3 py-2 rounded-xl border text-sm transition ${period === id
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
          : "border-slate-200/70 dark:border-white/10 bg-white/10 text-slate-200/90 hover:bg-white/15"
        }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mt-3 rounded-3xl border border-slate-200/70 dark:border-white/10 bg-white/10 backdrop-blur-2xl p-4 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Статистика по транспорту</div>
          <div className="text-xs text-slate-400 mt-0.5">Прибыль и часы по каждой машине/мото (под графиком).</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip id="7">7д</Chip>
        <Chip id="30">30д</Chip>
        <Chip id="all">Всё</Chip>

        <div className="ml-auto w-full sm:w-[260px]">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
          <div className="text-xs text-slate-400">Итого прибыль</div>
          <div className="text-lg font-bold text-emerald-300 tabular-nums">{money(totals.profit)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
          <div className="text-xs text-slate-400">Итого аренд</div>
          <div className="text-lg font-bold text-slate-100 tabular-nums">{totals.count}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
          <div className="text-xs text-slate-400">Топ машина</div>
          {top1 ? (
            <div className="mt-0.5">
              <div className="text-sm font-semibold text-slate-100 truncate">{top1.name}</div>
              <div className="text-base font-bold text-emerald-300 tabular-nums">{money(top1.profit)}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-1">—</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
          <div className="text-xs text-slate-400">2 место</div>
          {top2 ? (
            <div className="mt-0.5">
              <div className="text-sm font-semibold text-slate-100 truncate">{top2.name}</div>
              <div className="text-base font-bold text-slate-100 tabular-nums">{money(top2.profit)}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 mt-1">—</div>
          )}
        </div>
      </div>


      <div className="mt-3 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-2" style={{ maxHeight: 360, overflowY: "auto" }}>
        {display.length === 0 ? (
          <div className="p-3 text-sm text-slate-400">Пока пусто.</div>
        ) : (
          <div className="space-y-2">
            {display.map((r) => {
              const w = Math.min(100, (Math.abs(Number(r.profit) || 0) / maxProfit) * 100);
              const isHid = hiddenSet.has(String(r.name).toLowerCase());
              return (
                <div key={r.name} className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {editingVehicle === r.name ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingVehicleValue}
                            onChange={(e) => setEditingVehicleValue(e.target.value)}
                            className="w-full rounded-xl bg-black/30 border border-slate-200/70 dark:border-white/10 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                            placeholder="Новое название…"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextName = String(editingVehicleValue || "").trim();
                              if (!nextName) return;
                              const oldName = r.name;

                              // update vehicle directory
                              if (typeof setVehicleDir === "function") {
                                setVehicleDir((prev) =>
                                  Array.isArray(prev)
                                    ? uniqStrings(prev.map((x) => (String(x) === String(oldName) ? nextName : x)))
                                    : prev
                                );
                              }

                              // rename rentals (keeps history; doesn't delete timers)
                              if (typeof setRentals === "function") {
                                setRentals((prev) =>
                                  Array.isArray(prev)
                                    ? prev.map((it) =>
                                        String(it?.name || "") === String(oldName) ? { ...it, name: nextName } : it
                                      )
                                    : prev
                                );
                              }

                              // move hidden flag to new name if needed
                              if (hiddenSet.has(String(oldName).toLowerCase())) {
                                const nextHidden = new Set(hiddenSet);
                                nextHidden.delete(String(oldName).toLowerCase());
                                nextHidden.add(String(nextName).toLowerCase());
                                setHidden([...nextHidden]);
                              }

                              setEditingVehicle(null);
                              setEditingVehicleValue("");
                            }}
                            className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm hover:bg-emerald-500/25"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVehicle(null);
                              setEditingVehicleValue("");
                            }}
                            className="shrink-0 px-3 py-2 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-slate-200 text-sm hover:bg-white/10"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-slate-100 truncate">{r.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {Math.round((r.hours || 0) * 10) / 10} ч • {r.count || 0} аренд
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-300 tabular-nums">{money(r.profit)}</div>

                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => (isHid ? unhideVehicle(r.name) : hideVehicle(r.name))}
                          className="px-2 py-1 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                          title={isHid ? "Показать в статистике" : "Скрыть из статистики"}
                        >
                          {isHid ? "Показать" : "Скрыть"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingVehicle(r.name);
                            setEditingVehicleValue(r.name);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                          title="Редактировать название"
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // "Удалить" здесь = убрать из панели (не трогая аренды).
                            // Реализуем как: скрыть + удалить из vehicleDir (чтобы не появлялось снова после удаления всех записей).
                            const nm = r.name;
                            hideVehicle(nm);
                            if (typeof setVehicleDir === "function") {
                              setVehicleDir((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x) !== String(nm)) : prev));
                            }
                          }}
                          className="px-2 py-1 rounded-lg border border-rose-400/30 bg-rose-500/10 text-xs text-rose-200 hover:bg-rose-500/15"
                          title="Удалить из панели (данные аренды не удаляются)"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* nicer bar */}
                  <div className="mt-3 h-2.5 rounded-full bg-black/30 border border-slate-200/70 dark:border-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 via-emerald-400/50 to-white/20 transition-all duration-500"
                      style={{ width: `${Math.max(3, w)}%` }}
                    />
                  </div>
                </div>
              );
})}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {rows.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-200 hover:bg-white/10"
          >
            {showAll ? "Показать топ-5" : `Показать все (${rows.length})`}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowHidden((s) => !s)}
          className="px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 text-sm text-slate-200 hover:bg-white/10"
        >
          {showHidden ? "Скрытые: ON" : "Показать скрытые"}
        </button>
      </div>
    </div>
  );
}

// ====== Chart (RIGHT) ======
function DailySideChart({ chartEntries, onResetChart, title, subtitle }) {
  const series = useMemo(() => buildSeries(chartEntries, 30), [chartEntries]);
  const [hover, setHover] = useState(null);

  const w = 1080;
  const h = 360;
  const padL = 92;
  const padR = 24;
  const padT = 22;
  const padB = 48;

  const vals = series.map((d) => d.cumulative);
  let minV = vals.length ? Math.min(...vals) : 0;
  let maxV = vals.length ? Math.max(...vals) : 0;

  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const range = maxV - minV;
  const extra = range * 0.12;
  minV -= extra;
  maxV += extra;

  const xFor = (i) => {
    const n = series.length - 1;
    if (n <= 0) return padL;
    return padL + (i / n) * (w - padL - padR);
  };

  const yFor = (v) => {
    const t = (v - minV) / (maxV - minV || 1);
    return padT + (1 - t) * (h - padT - padB);
  };

  const pts = series.map((d, i) => [xFor(i), yFor(d.cumulative)]);

  const path = (() => {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = ((px + x) / 2).toFixed(2);
      const cy = ((py + y) / 2).toFixed(2);
      d += ` Q ${px.toFixed(2)} ${py.toFixed(2)} ${cx} ${cy}`;
    }
    const last = pts[pts.length - 1];
    d += ` T ${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
    return d;
  })();

  const areaPath = (() => {
    if (!pts.length) return "";
    const first = pts[0];
    const last = pts[pts.length - 1];
    const baseY = h - padB;
    return `${path} L ${last[0].toFixed(2)} ${baseY} L ${first[0].toFixed(2)} ${baseY} Z`;
  })();

  const pickIndex = (clientX, rect) => {
    const mx = clientX - rect.left;
    const x0 = (mx / rect.width) * w;

    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = Math.abs(pts[i][0] - x0);
      if (dx < bestDist) {
        bestDist = dx;
        best = i;
      }
    }
    return best;
  };

  const onMove = (e) => {
    if (!pts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(pickIndex(e.clientX, rect));
  };

  const hi = hover ?? Math.max(0, series.length - 1);
  const hd = series[hi] || { date: "—", sum: 0, cumulative: 0 };
  const hx = series.length ? xFor(hi) : padL;
  const hy = series.length ? yFor(hd.cumulative) : h - padB;

  const yTicks = 4;
  const tickVals = useMemo(() => {
    const out = [];
    for (let i = 0; i <= yTicks; i++) {
      const tt = i / yTicks;
      const v = maxV - tt * (maxV - minV);
      out.push(Math.abs(v) < 1e-9 ? 0 : v);
    }
    return out;
  }, [minV, maxV]);

  const ticks = tickVals.map((v) => ({ v, y: yFor(v) }));
  const canReset = (chartEntries?.length || 0) > 0;
  const formatX = (key) => `${key.slice(5, 7)}/${key.slice(8, 10)}`;

  return (
    <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
              <ChartNoAxesCombined className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title || "График по дням"}</div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle || "Последние 30 дней. Данные графика — по выбранной вкладке."}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right mr-1">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Выбрано</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {hd.date} • {money(hd.cumulative)}
            </div>
          </div>

          <IconBtn title="Сбросить график" onClick={onResetChart} disabled={!canReset}>
            <RefreshCw className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </IconBtn>
        </div>
      </div>

      <div className="relative w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg
  viewBox={`0 0 ${w} ${h}`}
  className="w-full h-[360px] select-none"
>

          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {ticks.map((tt, idx) => (
            <g key={idx}>
              <line x1={padL} y1={tt.y} x2={w - padR} y2={tt.y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
              <text x={padL - 16} y={tt.y + 6} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="16">
                ${niceMoneyTick(tt.v)}
              </text>
            </g>
          ))}

          <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />

          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={path} fill="none" className="stroke-indigo-600 dark:stroke-indigo-300" strokeWidth="3" strokeLinecap="round" />

          {series.length > 0 && (
            <>
              <line x1={hx} y1={padT} x2={hx} y2={h - padB} className="stroke-indigo-300/70 dark:stroke-indigo-400/40" strokeWidth="1" />
              <circle cx={hx} cy={hy} r="6" className="fill-white dark:fill-slate-950 stroke-indigo-600 dark:stroke-indigo-300" strokeWidth="3" />
            </>
          )}
        </svg>

        {hover != null && series.length > 0 ? (
          <div
            className="absolute -translate-x-1/2 -translate-y-3 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 bg-white/95 dark:bg-slate-950/90 shadow-lg text-xs text-slate-700 dark:text-slate-200 pointer-events-none"
            style={{ left: `${(hx / w) * 100}%`, top: `${(hy / h) * 100}%` }}
          >
            <div className="font-semibold text-slate-900 dark:text-slate-100">{hd.date}</div>
            <div className="tabular-nums">Итог: {money(hd.cumulative)}</div>
            <div className="text-slate-500 dark:text-slate-400 tabular-nums">За день: {money(hd.sum)}</div>
          </div>
        ) : null}

        {series.length > 0 ? (
          <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            <span>{formatX(series[0].date)}</span>
            <span>{formatX(series[Math.floor(series.length / 2)].date)}</span>
            <span>{formatX(series[series.length - 1].date)}</span>
          </div>
        ) : (
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Нет данных для графика.</div>
        )}
      </div>
    </div>
  );
}

// ====== Rentals (LEFT) ======
function RentalsPanel({
  rentals,
  setRentals,
  onVehicleSeen,
  onAddToChart,
  ringtoneUrl,
  canPro,
  tgEnabled,
  onToggleTg,
  apiUpsertRental,
  apiDeleteRental,
  sendTelegram // ✅ NEW: function from parent
}) {
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [duration, setDuration] = useState("");
  const [unit, setUnit] = useState("h");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRent, setEditRent] = useState("");
  const [editEndAt, setEditEndAt] = useState("");

  const [tick, setTick] = useState(Date.now());

  // 🔊 alarm control (loop until stop)
  const alarmRef = useRef(null);
  const [alarmOn, setAlarmOn] = useState(false);

  useEffect(() => {
    const a = new Audio(ringtoneUrl);
    a.loop = true;
    a.volume = 0.9;
    alarmRef.current = a;
    return () => {
      try {
        a.pause();
      } catch { }
      alarmRef.current = null;
    };
  }, [ringtoneUrl]);

  const startAlarm = async () => {
    setAlarmOn(true);
    try {
      await alarmRef.current?.play?.();
    } catch { }
  };

  const stopAlarm = () => {
    setAlarmOn(false);
    try {
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }
    } catch { }
  };

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ensureNotifPermission = async () => {
    try {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      const res = await Notification.requestPermission();
      return res === "granted";
    } catch {
      return false;
    }
  };

  const unitToMs = (num, u) => {
    const n = Number(num);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (u === "m") return n * 60 * 1000;
    if (u === "h") return n * 60 * 60 * 1000;
    if (u === "d") return n * 24 * 60 * 60 * 1000;
    return 0;
  };

  const addRental = async () => {
    const nm = name.trim();
    const r = Number(String(rent).trim().replace(",", "."));
    const durMs = unitToMs(duration, unit);
    if (!nm) return;
    if (!Number.isFinite(r)) return;
    if (!durMs) return;

    // ✅ remember vehicle name for stats (does NOT affect rentals)
    try {
      onVehicleSeen?.(nm);
    } catch { }

    await ensureNotifPermission();

    const startAt = Date.now();
    const endAt = startAt + durMs;

    // ✅ persist to backend (so it can notify even if app closed)
    let serverId = null;
    try {
      const saved = await apiUpsertRental?.({ name: nm, rent: r, endAt });
      if (saved?.id) serverId = String(saved.id);
    } catch { }

    const item = {
      id: serverId || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: nm,
      rent: r,
      startAt,
      endAt,
      notify: true,
      fired: false,
      tgSent: false
    };

    setRentals((prev) => [item, ...prev]);

    // chart: auto category
    onAddToChart?.({
      id: `rent_${item.id}`,
      category: "auto",
      buy: 0,
      sell: Math.abs(r),
      note: `Аренда Т/С: ${nm}`,
      timestamp: new Date().toISOString()
    });

    setName("");
    setRent("");
    setDuration("");
  };

  const deleteRental = async (id) => {
    // ❗️Important: we DON'T remove the rental record from local state,
    // so auto-stats under the chart won't "reset".
    // We just mark it as deleted (soft delete) and turn off notifications.
    try {
      // backend can still delete/disable server-side timer, so no Telegram spam
      await apiDeleteRental?.(id);
    } catch { }

    setRentals((prev) =>
      (prev || []).map((x) =>
        x.id === id
          ? {
              ...x,
              deleted: true,
              deletedAt: Date.now(),
              notify: false,
              fired: true
            }
          : x
      )
    );
  };


  const toggleNotify = async (id) => {
    const cur = rentals.find((r) => r.id === id);
    const turningOn = cur ? !cur.notify : false;
    if (turningOn) await ensureNotifPermission();
    setRentals((prev) => prev.map((x) => (x.id === id ? { ...x, notify: !x.notify } : x)));
  };

  const resetRentals = () => setRentals([]);

  // ✅ FIRE: system notification + ringtone + telegram (even if window closed -> backend handles it)
  useEffect(() => {
    if (!rentals?.length) return;

    const now = Date.now();
    const due = rentals.filter((r) => r.notify && !r.fired && r.endAt <= now);
    if (due.length === 0) return;

    try {
      if ("Notification" in window && Notification.permission === "granted") {
        for (const r of due.slice(0, 3)) {
          new Notification("Аренда закончилась", { body: `${r.name} — время аренды вышло` });
        }
      }
    } catch { }

    startAlarm();

    // ✅ TG notifications only if:
    // - user enabled toggle
    // - user is > FREE
    // - backend exists
    // - not already sent
    if (tgEnabled && canPro) {
      for (const r of due) {
        if (!r.tgSent) {
          sendTelegram?.({
            type: "rental_end",
            title: "Аренда закончилась",
            message: `${r.name} — время аренды вышло`,
            rentalId: r.id
          });
        }
      }
    }

    setRentals((prev) =>
      prev.map((r) =>
        r.notify && !r.fired && r.endAt <= now
          ? {
            ...r,
            fired: true,
            tgSent: tgEnabled && canPro ? true : r.tgSent
          }
          : r
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const active = rentals.filter((r) => !r.deleted && r.endAt > Date.now());
  const ended = rentals.filter((r) => !r.deleted && r.endAt <= Date.now());

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name || "");
    setEditRent(String(r.rent ?? ""));

    const d = new Date(r.endAt);
    const pad = (x) => String(x).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditEndAt(local);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditRent("");
    setEditEndAt("");
  };

  const saveEdit = async (id) => {
    const nm = editName.trim();
    const rr = Number(String(editRent).trim().replace(",", "."));
    const dt = editEndAt ? new Date(editEndAt).getTime() : NaN;

    if (!nm) return;
    if (!Number.isFinite(rr)) return;
    if (!Number.isFinite(dt)) return;

    await ensureNotifPermission();

    // ✅ persist update (so backend knows new end time)
    try {
      await apiUpsertRental?.({ id, name: nm, rent: rr, endAt: dt });
    } catch { }

    setRentals((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
            ...r,
            name: nm,
            rent: rr,
            endAt: dt,
            fired: dt <= Date.now() ? true : false,
            tgSent: false
          }
          : r
      )
    );
    cancelEdit();
  };

  return (
    <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
              <Car className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Аренда транспорта</div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
           TG уведомления — кнопка слева (самолётик)
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <IconBtn
            title={alarmOn ? "Остановить рингтон" : "Рингтон выключен (включится при срабатывании)"}
            onClick={alarmOn ? stopAlarm : () => { }}
            disabled={!alarmOn}
            className={alarmOn ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10" : ""}
          >
            {alarmOn ? (
              <Volume2 className="w-4 h-4 text-amber-700 dark:text-amber-200" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            )}
          </IconBtn>

          <IconBtn title="Сбросить аренды" onClick={resetRentals} disabled={rentals.length === 0}>
            <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </IconBtn>
        </div>
      </div>

      <div className="grid gap-3 mb-5">
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Название Т/С</div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='например: "Sultan RS"'
            className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-7">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Аренда ($)</div>
            <Input
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              placeholder="например: 150"
              inputMode="decimal"
              className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100 tabular-nums"
            />
          </div>

          <div className="col-span-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Срок</div>
            <Input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="12"
              inputMode="numeric"
              className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100 tabular-nums"
            />
          </div>

          <div className="col-span-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Ед.</div>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-10 w-full px-2 rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
            >
              <option value="m">мин</option>
              <option value="h">час</option>
              <option value="d">день</option>
            </select>
          </div>
        </div>

        <Button onClick={addRental} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Добавить аренду
        </Button>
      </div>

      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
        <Clock3 className="w-3.5 h-3.5" />
        Активные ({active.length})
      </div>

      {active.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 rounded-2xl p-4 bg-white/60 dark:bg-slate-950/20">
          Нет активных аренд.
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((r) => {
            const leftSec = Math.max(0, Math.floor((r.endAt - Date.now()) / 1000));
            const isEditing = editingId === r.id;

            return (
              <div key={r.id} className="rounded-2xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4 bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl">
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        До: {format(new Date(r.endAt), "MMM d, yyyy • HH:mm")}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300 tabular-nums break-all">
                          {money(r.rent)}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{formatDuration(leftSec)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <IconBtn title={r.notify ? "Уведомление включено" : "Уведомление выключено"} onClick={() => toggleNotify(r.id)}>
                        {r.notify ? (
                          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                        ) : (
                          <BellOff className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                        )}
                      </IconBtn>

                      <IconBtn title="Редактировать" onClick={() => startEdit(r)}>
                        <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                      </IconBtn>

                      <IconBtn title="Удалить" onClick={() => deleteRental(r.id)}>
                        <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                      </IconBtn>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Название</div>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Аренда ($)</div>
                        <Input value={editRent} onChange={(e) => setEditRent(e.target.value)} inputMode="decimal" className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100 tabular-nums" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Закончится</div>
                        <Input type="datetime-local" value={editEndAt} onChange={(e) => setEditEndAt(e.target.value)} className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100 tabular-nums" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(r.id)} className="flex-1">
                        <Check className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                      <Button variant="secondary" onClick={cancelEdit} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Завершённые ({ended.length})</div>
            {ended.length === 0 ? (
        <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Пока пусто.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {ended.slice(0, 4).map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-3 bg-slate-50 dark:bg-slate-950/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    Закончилось: {format(new Date(r.endAt), "MMM d, yyyy • HH:mm")}
                  </div>
                </div>
                <IconBtn title="Удалить" onClick={() => deleteRental(r.id)}>
                  <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====== Main ======
export default function Calculator() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("items"); // ✅ NEW default: "вещи"

  const [entries, setEntries] = useState([]);
  const [rentals, setRentals] = useState([]);

  // ✅ Directory of vehicles (names), so stats can show vehicles even if all rentals deleted
  const [vehicleDir, setVehicleDir] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_KEY_VEHICLE_DIR) || "");
    return Array.isArray(saved) ? uniqStrings(saved) : [];
  });

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editBuy, setEditBuy] = useState("");
  const [editSell, setEditSell] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("items");

  // ✅ images map + preview modal for entries
  const [entryImages, setEntryImages] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_KEY_ENTRY_IMAGES) || "");
    return saved && typeof saved === "object" ? saved : {};
  });

  const amountRef = useRef(null);

  // ✅ PRO gating
  const [me, setMe] = useState(null);
  const [tier, setTier] = useState("FREE"); // FREE | VIP | PRO | etc
  const canPro = tier !== "FREE";

  // ✅ Telegram enable toggle (must be explicit)
  const [tgEnabled, setTgEnabled] = useState(() => {
    const v = localStorage.getItem(LS_KEY_TG_ENABLED);
    return v === "1";
  });

  // ✅ Chart tab: all | auto | items
  const [chartTab, setChartTab] = useState(() => localStorage.getItem(LS_KEY_CHART_TAB) || "all");
const [chartsCollapsed, setChartsCollapsed] = useState(() => localStorage.getItem(LS_KEY_CHART_COLLAPSED) === "1");

  const [rentalsCollapsed, setRentalsCollapsed] = useState(() => localStorage.getItem(LS_KEY_RENTALS_COLLAPSED) === "1");




  // ✅ toggle charts visibility (prevents ReferenceError -> black screen)
  const toggleChartsCollapsed = () => {
    setChartsCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(LS_KEY_CHART_COLLAPSED, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const toggleRentalsCollapsed = () => {
    setRentalsCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(LS_KEY_RENTALS_COLLAPSED, next ? "1" : "0");
      } catch { }
      return next;
    });
  };
;
const TAB_ORDER = ["all", "auto", "items"];
const [chartDir, setChartDir] = useState(0);

const selectChartTab = (next) => {
  const curIdx = TAB_ORDER.indexOf(chartTab);
  const nextIdx = TAB_ORDER.indexOf(next);
  setChartDir(nextIdx - curIdx);
  setChartTab(next);
};

// ✅ Auto stats panel (under chart)
const [autoPanelOpen, setAutoPanelOpen] = useState(false);

  useEffect(() => localStorage.setItem(LS_KEY_TG_ENABLED, tgEnabled ? "1" : "0"), [tgEnabled]);
  useEffect(() => localStorage.setItem(LS_KEY_CHART_TAB, chartTab), [chartTab]);

  const uploadEntryImage = (entryId, file) => {
    if (!entryId || !file) return;
    if (!file.type?.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEntryImages((prev) => ({ ...(prev || {}), [entryId]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // load
  useEffect(() => {
    const savedEntries = safeParse(localStorage.getItem(LS_KEY_ENTRIES));
    if (Array.isArray(savedEntries)) setEntries(savedEntries);

    const savedRentals = safeParse(localStorage.getItem(LS_KEY_RENTALS));
    if (Array.isArray(savedRentals)) setRentals(savedRentals);
  }, []);

  // save
  useEffect(() => localStorage.setItem(LS_KEY_ENTRIES, JSON.stringify(entries)), [entries]);
  useEffect(() => localStorage.setItem(LS_KEY_RENTALS, JSON.stringify(rentals)), [rentals]);
  useEffect(() => localStorage.setItem(LS_KEY_VEHICLE_DIR, JSON.stringify(vehicleDir || [])), [vehicleDir]);
  useEffect(() => localStorage.setItem(LS_KEY_ENTRY_IMAGES, JSON.stringify(entryImages || {})), [entryImages]);

  // ✅ try fetch me/tier
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (fetchMeSafe) {
          const m = await fetchMeSafe();
          if (!mounted) return;
          setMe(m);
          const role = String(m?.role || m?.user?.role || "").toLowerCase();
          const isAdmin = role === "admin" || role === "owner" || role === "superadmin";
          const vipUntilRaw = m?.vip_until || m?.vipUntil || m?.vip_till || null;
          const promoUntilRaw = m?.promo_until || m?.promoUntil || m?.promo_till || null;
          const vipUntil = vipUntilRaw ? new Date(vipUntilRaw) : null;
          const promoUntil = promoUntilRaw ? new Date(promoUntilRaw) : null;
          const vipByDate = vipUntil && !Number.isNaN(vipUntil.getTime()) ? vipUntil.getTime() > Date.now() : false;
          const promoByDate = promoUntil && !Number.isNaN(promoUntil.getTime()) ? promoUntil.getTime() > Date.now() : false;
          const isVip = isAdmin || role === "vip" || !!m?.vip_active || vipByDate;
          const isPromo = isAdmin || role === "promo" || !!m?.promo_active || promoByDate;
          const t = isAdmin ? "ADMIN" : isVip ? "VIP" : isPromo ? "PROMO" : "FREE";
          setTier(t);

          // ✅ load TG consent + rentals from backend (if token exists)
          try {
            const token2 = localStorage.getItem("auth_token");
            if (token2) {
              const [sRes, rRes] = await Promise.allSettled([
                fetch("http://localhost:3001/settings/telegram", {
                  headers: { Authorization: `Bearer ${token2}` }
                }),
                fetch("http://localhost:3001/rentals", {
                  headers: { Authorization: `Bearer ${token2}` }
                })
              ]);

              if (sRes.status === "fulfilled") {
                const js = await sRes.value.json().catch(() => ({}));
                if (mounted && typeof js?.tg_notify_enabled === "boolean") {
                  setTgEnabled(js.tg_notify_enabled);
                }
              }

              if (rRes.status === "fulfilled") {
                const jr = await rRes.value.json().catch(() => ({}));
                const list = Array.isArray(jr?.rentals) ? jr.rentals : [];
                const mapped = list.map((x) => ({
                  id: String(x.id),
                  name: x.name,
                  rent: Number(x.rent || 0),
                  startAt: x.created_at ? new Date(x.created_at).getTime() : Date.now(),
                  endAt: x.end_at ? new Date(x.end_at).getTime() : Date.now(),
                  notify: true,
                  fired: !!x.fired,
                  tgSent: !!x.notified
                }));
                if (mounted && mapped.length) setRentals(mapped);
              }
            }
          } catch { }

          return;
        }

        // fallback: try /me
        const token = localStorage.getItem("auth_token");
        const res = await fetch("http://localhost:3001/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setMe(data);
        const role = String(data?.role || data?.user?.role || "").toLowerCase();
        const isAdmin = role === "admin" || role === "owner" || role === "superadmin";
        const vipUntilRaw = data?.vip_until || data?.vipUntil || data?.vip_till || null;
        const promoUntilRaw = data?.promo_until || data?.promoUntil || data?.promo_till || null;
        const vipUntil = vipUntilRaw ? new Date(vipUntilRaw) : null;
        const promoUntil = promoUntilRaw ? new Date(promoUntilRaw) : null;
        const vipByDate = vipUntil && !Number.isNaN(vipUntil.getTime()) ? vipUntil.getTime() > Date.now() : false;
        const promoByDate = promoUntil && !Number.isNaN(promoUntil.getTime()) ? promoUntil.getTime() > Date.now() : false;
        const isVip = isAdmin || role === "vip" || !!data?.vip_active || vipByDate;
        const isPromo = isAdmin || role === "promo" || !!data?.promo_active || promoByDate;
        const t = isAdmin ? "ADMIN" : isVip ? "VIP" : isPromo ? "PROMO" : "FREE";
        setTier(t);

        // ✅ load TG consent + rentals from backend (if token exists)
        try {
          const token2 = localStorage.getItem("auth_token");
          if (token2) {
            const [sRes, rRes] = await Promise.allSettled([
              fetch("http://localhost:3001/settings/telegram", {
                headers: { Authorization: `Bearer ${token2}` }
              }),
              fetch("http://localhost:3001/rentals", {
                headers: { Authorization: `Bearer ${token2}` }
              })
            ]);

            if (sRes.status === "fulfilled") {
              const js = await sRes.value.json().catch(() => ({}));
              if (mounted && typeof js?.tg_notify_enabled === "boolean") {
                setTgEnabled(js.tg_notify_enabled);
              }
            }

            if (rRes.status === "fulfilled") {
              const jr = await rRes.value.json().catch(() => ({}));
              const list = Array.isArray(jr?.rentals) ? jr.rentals : [];
              const mapped = list.map((x) => ({
                id: String(x.id),
                name: x.name,
                rent: Number(x.rent || 0),
                startAt: x.created_at ? new Date(x.created_at).getTime() : Date.now(),
                endAt: x.end_at ? new Date(x.end_at).getTime() : Date.now(),
                notify: true,
                fired: !!x.fired,
                tgSent: !!x.notified
              }));
              if (mounted && mapped.length) setRentals(mapped);
            }
          }
        } catch { }

      } catch {
        // no-op: stay FREE
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);


  // ===== helpers to call backend with auth =====
  const authedFetch = async (url, options = {}) => {
    const token = localStorage.getItem("auth_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return data;
  };

  const apiUpsertRental = async ({ id, name, rent, endAt }) => {
    const data = await authedFetch("http://localhost:3001/rentals/upsert", {
      method: "POST",
      body: JSON.stringify({ id, name, rent, endAt })
    });
    return data?.rental || null;
  };

  const apiDeleteRental = async (id) => {
    await authedFetch(`http://localhost:3001/rentals/${id}`, { method: "DELETE" });
    return true;
  };

  const toggleTgEnabled = async () => {
    const next = !tgEnabled;
    setTgEnabled(next);
    localStorage.setItem(LS_KEY_TG_ENABLED, next ? "1" : "0");
    try {
      await authedFetch("http://localhost:3001/settings/telegram", {
        method: "POST",
        body: JSON.stringify({ enabled: next })
      });
    } catch { }
  };

  // ✅ Telegram sender: expects backend endpoint to route to your TG bot by userId from DB
  const sendTelegram = async ({ type, title, message, rentalId }) => {
    try {
      const token = localStorage.getItem("auth_token");
      await fetch("http://localhost:3001/notify/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type, title, message, rentalId })
      });
    } catch { }
  };

  const handleSave = () => {
    // ✅ New format: buy (purchase), sell (optional later)
    const buy = clampNum(amount, NaN);
    if (!Number.isFinite(buy) || buy <= 0) return;

    const newEntry = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      category, // all/items/auto
      buy: Math.abs(buy),
      sell: 0,
      note: note.trim() || "Без записи",
      timestamp: new Date().toISOString()
    };

    setEntries((prev) => [newEntry, ...prev]);

    setAmount("");
    setNote("");
    requestAnimationFrame(() => amountRef.current?.focus?.());
  };

  const handleDelete = (id) => {
    if (editingId === id) {
      setEditingId(null);
      setEditBuy("");
      setEditSell("");
      setEditNote("");
      setEditCategory("items");
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));

    setEntryImages((prev) => {
      const next = { ...(prev || {}) };
      delete next[id];
      return next;
    });
  };

  const resetEntriesOnly = () => {
    setEditingId(null);
    setEditBuy("");
    setEditSell("");
    setEditNote("");
    setEditCategory("items");
    setEntries([]);
    setEntryImages({});
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    // Backward compatibility: if old entry has amount, map to buy/sell roughly
    if (typeof e?.amount === "number") {
      const a = Number(e.amount);
      setEditBuy(a < 0 ? Math.abs(a) : 0);
      setEditSell(a > 0 ? a : 0);
    } else {
      setEditBuy(String(e.buy ?? ""));
      setEditSell(String(e.sell ?? ""));
    }
    setEditNote(String(e.note ?? ""));
    setEditCategory(getEntryCategory(e));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuy("");
    setEditSell("");
    setEditNote("");
    setEditCategory("items");
  };

  const saveEdit = (id) => {
    const buy = clampNum(editBuy, NaN);
    const sell = clampNum(editSell, 0);

    if (!Number.isFinite(buy) || buy < 0) return;

    const nextNote = String(editNote || "").trim() || "Без записи";
    const nextCategory = editCategory === "auto" ? "auto" : editCategory === "items" ? "items" : "all";

    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
            ...e,
            // convert to new format
            amount: undefined,
            buy: Math.abs(buy || 0),
            sell: Math.max(0, sell || 0),
            note: nextNote,
            category: nextCategory
          }
          : e
      )
    );

    cancelEdit();
  };

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        const a = calcEntryAmount(e);
        acc.total += a;
        if (a > 0) acc.positive += a;
        if (a < 0) acc.negative += Math.abs(a);
        return acc;
      },
      { total: 0, positive: 0, negative: 0 }
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const a = calcEntryAmount(e);
      if (filter === "positive" && a <= 0) return false;
      if (filter === "negative" && a >= 0) return false;

      if (!q) return true;
      return String(e.note || "").toLowerCase().includes(q);
    });
  }, [entries, filter, search]);

  // ✅ Chart datasets by tab
  const chartEntries = useMemo(() => {
    const tab = chartTab;
    const arr = entries || [];
    if (tab === "auto") return arr.filter((e) => getEntryCategory(e) === "auto");
    if (tab === "items") return arr.filter((e) => getEntryCategory(e) === "items");
    return arr;
  }, [entries, chartTab]);

  // ✅ Auto analytics (rentals count + profit)
  const autoStats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const autoEntries = entries.filter((e) => getEntryCategory(e) === "auto");
    const sumBy = (t0) =>
      autoEntries.reduce((acc, e) => {
        const ts = new Date(e.timestamp).getTime();
        if (!Number.isFinite(ts) || ts < t0) return acc;
        return acc + calcEntryAmount(e);
      }, 0);

    const rentalsAll = rentals.length;
    const rentalsMonth = rentals.filter((r) => Number(r?.startAt) >= monthAgo).length;
    const rentalsWeek = rentals.filter((r) => Number(r?.startAt) >= weekAgo).length;

    return {
      profitWeek: sumBy(weekAgo),
      profitMonth: sumBy(monthAgo),
      rentalsAll,
      rentalsMonth,
      rentalsWeek
    };
  }, [entries, rentals]);

  const resetChartOnly = () => {
    // “сброс графика” = очищаем только выбранную вкладку (мягко)
    const tab = chartTab;
    if (tab === "all") {
      setEntries([]);
      setEntryImages({});
      return;
    }
    setEntries((prev) => prev.filter((e) => getEntryCategory(e) !== tab));
  };

  const chartTitle =
    chartTab === "auto" ? "График: Авто" : chartTab === "items" ? "График: Вещи" : "График: Общий";
  const chartSubtitle =
    chartTab === "auto"
      ? "Прибыль/расходы по авто за 30 дней."
      : chartTab === "items"
        ? "Прибыль/расходы по вещам за 30 дней."
        : "Все категории вместе за 30 дней.";

  return (
    <div className="relative min-h-screen pb-24 transition-colors">
      {/* ✅ ЕДИНЫЙ ФОН НА ВЕСЬ ЭКРАН (как в Home) */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070b16]" />
        <div className="absolute -top-44 -left-44 w-[900px] h-[900px] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -top-28 -right-52 w-[820px] h-[820px] rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-[-240px] left-1/2 -translate-x-1/2 w-[1100px] h-[680px] rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>
      <div className="sticky top-0 z-30 bg-[#070b16]/65 backdrop-blur-xl border-b border-slate-200/70 dark:border-white/10">

      </div>

      <div className="px-6 mt-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT */}
            <div className="lg:col-span-3 relative">
              {/* slim controls on the left (no frames) */}
              <div className="hidden lg:flex flex-col gap-2 absolute -left-12 top-6">
                <button
                  type="button"
                  onClick={toggleRentalsCollapsed}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-700 hover:bg-white/95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 backdrop-blur-xl transition"
                  title={rentalsCollapsed ? "Показать аренду" : "Свернуть аренду"}
                  aria-label={rentalsCollapsed ? "Показать аренду" : "Свернуть аренду"}
                >
                  {rentalsCollapsed ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!canPro) return;
                    toggleTgEnabled();
                  }}
                  aria-pressed={tgEnabled}
                  className={`h-10 w-10 inline-flex items-center justify-center rounded-2xl backdrop-blur-xl transition ${
                    tgEnabled
                      ? "bg-sky-100 hover:bg-sky-200/70 text-sky-700 dark:bg-sky-500/25 dark:hover:bg-sky-500/30 dark:text-sky-200"
                      : "bg-white/70 hover:bg-white/95 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-200"
                  }`}
                  title={canPro ? (tgEnabled ? "TG уведомления: ВКЛ" : "TG уведомления: ВЫКЛ") : "Только VIP"}
                  aria-label="TG уведомления"
                >
                  <Send className={`w-5 h-5 ${!canPro ? "opacity-40" : ""}`} />
                </button>
              </div>

              {rentalsCollapsed ? (
                <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Аренда транспорта</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Свернуто. Нажми на глаз слева, чтобы вернуть.</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleRentalsCollapsed}
                      className="px-3 py-2 rounded-xl border border-slate-200/70 bg-slate-900/5 text-sm text-slate-700 hover:bg-slate-900/10 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 transition"
                    >
                      Показать
                    </button>
                  </div>
                </div>
              ) : (
                <RentalsPanel
                rentals={rentals}
                setRentals={setRentals}
                onVehicleSeen={(nm) => setVehicleDir((prev) => uniqStrings([nm, ...(prev || [])]))}
                onAddToChart={(entry) => setEntries((prev) => [entry, ...prev])}
                ringtoneUrl={ringtoneMp3}
                canPro={canPro}
                tgEnabled={tgEnabled}
                onToggleTg={toggleTgEnabled}
                apiUpsertRental={apiUpsertRental}
                apiDeleteRental={apiDeleteRental}
                sendTelegram={sendTelegram}
              />
              )}
            </div>

            {/* MIDDLE */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"
              >
                <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4 overflow-hidden">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
                    <ListFilter className="w-3 h-3" />
                    Записи
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{entries.length}</div>
                </div>

                <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4 overflow-hidden">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Доход
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tabular-nums truncate max-w-full" title={money(totals.positive)}>
                    {moneyCompact(totals.positive)}
                  </div>
                </div>

                <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4 overflow-hidden">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs mb-1">
                    <TrendingDown className="w-3 h-3" />
                    Расход
                  </div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-300 tabular-nums truncate max-w-full" title={money(totals.negative)}>
                    {moneyCompact(totals.negative)}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className={`rounded-2xl p-5 mb-4 ${totals.total >= 0 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-rose-500 to-red-500"
                  }`}
              >
                <div className="flex items-center justify-between text-slate-900 dark:text-white">
                  <div className="min-w-0">
                    <div className="text-sm opacity-80 mb-1">Итог:</div>
                    <div className="text-3xl font-bold truncate" title={money(totals.total)}>
                      {totals.total >= 0 ? "+" : "-"}
                      {money(Math.abs(totals.total))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/20">{totals.total >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}</div>
                </div>
              </motion.div>

              {/* ✅ Category selector + add entry */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-6 mb-4"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    <Plus className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                    Добавить покупку
                  </h3>

                  <IconBtn title="Сбросить записи" onClick={resetEntriesOnly} disabled={entries.length === 0}>
                    <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                  </IconBtn>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-7">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Сумма покупки ($)</div>
                      <Input
                        ref={amountRef}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="например: 23.56"
                        className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
                        inputMode="decimal"
                      />
                    </div>

                    <div className="col-span-5">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Категория</div>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-10 w-full px-3 rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
                      >
                        <option value="items">Вещи</option>
                        <option value="auto">Авто</option>
                        <option value="all">Общее</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Запись</div>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="например: купил джинсы / купил запчасть..."
                      rows={3}
                      className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <Button onClick={handleSave} className="w-full">
                    Сохранить
                  </Button>
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "Все" },
                    { id: "positive", label: "Профит" },
                    { id: "negative", label: "Расход" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition select-none ${filter === f.id
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900"
                        }`}
                      type="button"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по записи…"
                    className="pl-9 dark:bg-slate-950/20 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredEntries.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-slate-500 dark:text-slate-400 bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 rounded-2xl p-6"
                    >
                      Пока нет записей. Добавь первую покупку выше.
                    </motion.div>
                  ) : (
                    filteredEntries.map((e) => {
                      const isEditing = editingId === e.id;
                      const hasImg = !!entryImages?.[e.id];
                      const amt = calcEntryAmount(e);
                      const cat = getEntryCategory(e);

                      const buy = Number(e?.buy) || 0;
                      const sell = Number(e?.sell) || 0;

                      return (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-2xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {!isEditing ? (
                                  <div className={`text-lg font-bold ${amt >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                                    {amt >= 0 ? "+" : "-"}
                                    {money(Math.abs(amt))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2 w-full">
                                    <div className="grid grid-cols-12 gap-2">
                                      <div className="col-span-6">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Покупка ($)</div>
                                        <Input
                                          value={editBuy}
                                          onChange={(ev) => setEditBuy(ev.target.value)}
                                          className="h-9 dark:bg-slate-950/30 dark:border-slate-800 dark:text-slate-100 tabular-nums"
                                          inputMode="decimal"
                                          placeholder="например: 20"
                                        />
                                      </div>
                                      <div className="col-span-6">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Продано за ($)</div>
                                        <Input
                                          value={editSell}
                                          onChange={(ev) => setEditSell(ev.target.value)}
                                          className="h-9 dark:bg-slate-950/30 dark:border-slate-800 dark:text-slate-100 tabular-nums"
                                          inputMode="decimal"
                                          placeholder="например: 45"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-12 gap-2">
                                      <div className="col-span-12">
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Категория</div>
                                        <select
                                          value={editCategory}
                                          onChange={(ev) => setEditCategory(ev.target.value)}
                                          className="h-9 w-full px-3 rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
                                        >
                                          <option value="items">Вещи</option>
                                          <option value="auto">Авто</option>
                                          <option value="all">Общее</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <span
                                  className={`text-[11px] px-2 py-1 rounded-xl border ${cat === "auto"
                                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                                      : cat === "items"
                                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
                                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200"
                                    }`}
                                >
                                  {cat === "auto" ? "Авто" : cat === "items" ? "Вещи" : "Общее"}
                                </span>

                                <div className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(e.timestamp), "MMM d, yyyy • HH:mm")}</div>
                              </div>

                              {!isEditing ? (
                                <>
                                  <div className="text-sm text-slate-700 dark:text-slate-200 mt-1 break-words">{e.note}</div>

                                  {/* ✅ show buy/sell */}
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 rounded-xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300">
                                      Покупка: <span className="font-semibold text-slate-900 dark:text-slate-100">{money(buy || 0)}</span>
                                    </span>
                                    <span className="px-2 py-1 rounded-xl border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300">
                                      Продажа: <span className="font-semibold text-slate-900 dark:text-slate-100">{sell ? money(sell) : "—"}</span>
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="mt-3">
                                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Запись</div>
                                  <Textarea
                                    value={editNote}
                                    onChange={(ev) => setEditNote(ev.target.value)}
                                    rows={3}
                                    className="dark:bg-slate-950/30 dark:border-slate-800 dark:text-slate-100"
                                    placeholder="например: купил коробки..."
                                  />
                                  <div className="mt-3 flex gap-2">
                                    <Button onClick={() => saveEdit(e.id)} className="flex-1">
                                      <Check className="w-4 h-4 mr-2" />
                                      Сохранить
                                    </Button>
                                    <Button variant="secondary" onClick={cancelEdit} className="flex-1">
                                      <X className="w-4 h-4 mr-2" />
                                      Отмена
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              {!isEditing && (
                                <>
                                  {/* ✅ Photo upload (без "глазика") */}
                                  <label
                                    title={canPro ? (hasImg ? "Заменить фото" : "Добавить фото") : "Фото доступно только VIP"}
                                    className={`p-2 rounded-xl border transition ${canPro
                                      ? (hasImg ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 hover:bg-amber-100/40 dark:hover:bg-amber-500/15" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900")
                                      : "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800"
                                    }`}
                                  >
                                    {canPro ? (
                                      <ImagePlus className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                    ) : (
                                      <Lock className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                    )}

                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={!canPro}
                                      onChange={(ev) => {
                                        if (!canPro) return;
                                        const f = ev.target.files?.[0];
                                        if (f) uploadEntryImage(e.id, f);
                                        // чтобы можно было выбрать тот же файл снова
                                        ev.target.value = "";
                                      }}
                                    />
                                  </label>

                                  <IconBtn title="Редактировать" onClick={() => startEdit(e)}>
                                    <Pencil className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                                  </IconBtn>
                                </>
                              )}

                              <IconBtn title="Удалить" onClick={() => handleDelete(e.id)}>
                                <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                              </IconBtn>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5 lg:sticky lg:top-6 h-fit space-y-4">
              {/* ✅ Tabs for charts */}
              <div className="bg-white/70  dark:bg-slate-950/20 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-200/70 dark:border-white/10 dark:border-slate-200/70 dark:border-white/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers3 className="w-4 h-4" />
                    Графики
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Только с VIP</div>
                    <button
                      type="button"
                      onClick={toggleChartsCollapsed}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/10 text-slate-200 hover:bg-white/15 transition"
                      title={chartsCollapsed ? "Показать графики" : "Скрыть графики"}
                      aria-label={chartsCollapsed ? "Показать графики" : "Скрыть графики"}
                    >
                      {chartsCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "Общий", icon: <ChartNoAxesCombined className="w-4 h-4" /> },
                    { id: "auto", label: "Авто", icon: <Car className="w-4 h-4" /> },
                    { id: "items", label: "Вещи", icon: <Boxes className="w-4 h-4" /> }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectChartTab(t.id)}
                      className={`px-3 py-2 rounded-xl border text-sm transition flex items-center gap-2 ${chartTab === t.id
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900"
                        }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

{/* ✅ Main chart (gated) */}
{canPro ? (
  <AnimatePresence initial={false} mode="wait">
    {!chartsCollapsed ? (
      <motion.div
        key="charts-visible"
        initial={{ opacity: 0, y: 10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: 10, height: 0 }}
        transition={{ duration: 0.22 }}
        className="overflow-hidden"
      >

  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={chartTab}
      initial={{ opacity: 0, x: chartDir >= 0 ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: chartDir >= 0 ? -24 : 24 }}
      transition={{ duration: 0.22 }}
    >
      <DailySideChart
        chartEntries={chartEntries}
        onResetChart={resetChartOnly}
        title={chartTitle}
        subtitle={chartSubtitle}
      />

        {/* ✅ Under-chart panel instead of side menu (ONLY for Auto tab) */}
        {chartTab === "auto" && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAutoPanelOpen((s) => !s)}
              className="px-3 py-2 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/10 text-sm text-slate-200 hover:bg-white/15"
            >
              {autoPanelOpen ? "Скрыть статистику" : "Показать статистику по транспорту"}
            </button>

            <AnimatePresence initial={false}>
              {autoPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18 }}
                >
                  <AutoStatsUnderChart rentals={rentals} setRentals={setRentals} vehicleDir={vehicleDir} setVehicleDir={setVehicleDir} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
    </motion.div>
  </AnimatePresence>
      </motion.div>

    ) : (
      <motion.div
        key="charts-collapsed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur p-4 text-sm text-slate-200"
      >
        Графики скрыты. Нажми на глазик, чтобы показать.
      </motion.div>
    )}
  </AnimatePresence>

) : (
  <LockedBlock title="Графики" subtitle="Графики доступны только пользователям выше FREE." />
)}
</div>
          </div>
        </div>
      </div>
    </div>
  );
}
