import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import SeasonalEffects from "@/components/SeasonalEffects";
import HolidayLights from "@/components/HolidayLights";
import {
  Search,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Plus,
  Minus,
  BarChart3,
  Calendar,
  Download,
  Save,
  Lock
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

/**
 * BP.jsx (server tasks) + 📈 Analytics theme
 * ✅ Platinum переключатель
 * ✅ Поиск + фильтр "только не выполненные"
 * ✅ Количество (-/+) только для: "3 часа в онлайне (можно выполнять многократно за день)"
 * ✅ Сохранение текущего состояния задач в localStorage
 *
 * NEW:
 * ✅ История BP по дням (localStorage)
 * ✅ График за месяц + быстрые метрики
 * ✅ Экспорт CSV (история)
 *
 * Как работает история:
 * - Автосейв: при изменении totalBP сохраняем "пик" за текущий день (max)
 * - Кнопка "Зафиксировать сегодня" принудительно сохраняет значение (тоже max)
 */


// ===== API (for VIP gating) =====
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";
function getToken() {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}
async function fetchMeSafe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const LS_BP_STATE = "bp_state_v3";
const LS_BP_HISTORY = "bp_history_v1";

const REPEATABLE_ID =
  "актуальные_для_всех_3_часа_в_онлайне_можно_выполнять_многократно_за_день";

const DEFAULT_TASKS = [
  {
    id: "актуальные_для_всех_3_часа_в_онлайне_можно_выполнять_многократно_за_день",
    title: "3 часа в онлайне (можно выполнять многократно за день)",
    group: "Актуальные для всех",
    bpBase: 2,
    bpPlat: 4,
    repeatable: true
  },
  {
    id: "соц_мини_активности_посетить_любой_сайт_в_браузере",
    title: "Посетить любой сайт в браузере",
    group: "Соц/Мини-активности",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "соц_мини_активности_зайти_в_любой_канал_в_brawl",
    title: "Зайти в любой канал в Brawl",
    group: "Соц/Мини-активности",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "соц_мини_активности_поставить_лайк_любой_анкете_в_match",
    title: "Поставить лайк любой анкете в Match",
    group: "Соц/Мини-активности",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "кейсы_казино_прокрутить_за_dp_серебряный_золотой_или_driver_кейс",
    title: "Прокрутить за DP серебряный, золотой или driver кейс",
    group: "Кейсы/Казино",
    bpBase: 10,
    bpPlat: 20,
    repeatable: false
  },
  {
    id: "питомец_кинуть_мяч_питомцу_15_раз",
    title: "Кинуть мяч питомцу 15 раз",
    group: "Питомец",
    bpBase: 2,
    bpPlat: 4,
    repeatable: false
  },
  {
    id: "питомец_15_выполненных_питомцем_команд",
    title: "15 выполненных питомцем команд",
    group: "Питомец",
    bpBase: 2,
    bpPlat: 4,
    repeatable: false
  },
  {
    id: "кейсы_казино_ставка_в_колесе_удачи_в_казино_межсерверное_колесо",
    title: "Ставка в колесе удачи в казино (межсерверное колесо)",
    group: "Кейсы/Казино",
    bpBase: 3,
    bpPlat: 6,
    repeatable: false
  },
  {
    id: "транспорт_проехать_1_станцию_на_метро",
    title: "Проехать 1 станцию на метро",
    group: "Транспорт",
    bpBase: 2,
    bpPlat: 4,
    repeatable: false
  },
  {
    id: "фарм_поймать_20_рыб",
    title: "Поймать 20 рыб",
    group: "Фарм",
    bpBase: 4,
    bpPlat: 8,
    repeatable: false
  },
  {
    id: "клубы_выполнить_2_квеста_любых_клубов",
    title: "Выполнить 2 квеста любых клубов",
    group: "Клубы",
    bpBase: 4,
    bpPlat: 8,
    repeatable: false
  },
  {
    id: "автосервис_починить_деталь_в_автосервисе",
    title: "Починить деталь в автосервисе",
    group: "Автосервис",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "спорт_забросить_2_мяча_в_баскетболе",
    title: "Забросить 2 мяча в баскетболе",
    group: "Спорт",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "спорт_забить_2_гола_в_футболе",
    title: "Забить 2 гола в футболе",
    group: "Спорт",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "казино_победить_в_армрестлинге",
    title: "Победить в армрестлинге",
    group: "Казино",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  },
  {
    id: "казино_победить_в_дартс",
    title: "Победить в дартс",
    group: "Казино",
    bpBase: 1,
    bpPlat: 2,
    repeatable: false
  }
  // ⚠️ остальной твой список можешь оставить как есть — просто допиши ниже
];

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.trunc(n) : min;
  return Math.max(min, Math.min(max, x));
}

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonthKey(year, monthIndex0) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function formatMonthTitle(year, monthIndex0) {
  const dt = new Date(year, monthIndex0, 1);
  return dt.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BP() {
  const allTasks = DEFAULT_TASKS;

  const [query, setQuery] = useState("");
  const [isPlat, setIsPlat] = useState(false);
  const [onlyUnchecked, setOnlyUnchecked] = useState(false);
  const [activeGroup, setActiveGroup] = useState("Все");

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [me, setMe] = useState(null);
  const canSeeAnalytics = !!(me && me.role && me.role !== "free");


  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await fetchMeSafe();
      if (alive) setMe(m);
    })();
    return () => {
      alive = false;
    };
  }, []);


  const [state, setState] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_BP_STATE) || "");
    return saved && typeof saved === "object"
      ? saved
      : { checked: {}, qty: {}, isPlat: false, onlyUnchecked: false, activeGroup: "Все" };
  });

  const [history, setHistory] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_BP_HISTORY) || "");
    return saved && typeof saved === "object" ? saved : { byDay: {}, updatedAt: null };
  });

  // hydrate controls once
  useEffect(() => {
    if (state && typeof state === "object") {
      if (typeof state.isPlat === "boolean") setIsPlat(state.isPlat);
      if (typeof state.onlyUnchecked === "boolean") setOnlyUnchecked(state.onlyUnchecked);
      if (typeof state.activeGroup === "string") setActiveGroup(state.activeGroup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const payload = {
      checked: state.checked || {},
      qty: state.qty || {},
      isPlat,
      onlyUnchecked,
      activeGroup
    };
    localStorage.setItem(LS_BP_STATE, JSON.stringify(payload));
  }, [state.checked, state.qty, isPlat, onlyUnchecked, activeGroup]);

  useEffect(() => {
    localStorage.setItem(LS_BP_HISTORY, JSON.stringify(history));
  }, [history]);

  const checked = state.checked || {};
  const qty = state.qty || {};

  const toggleTask = useCallback((id) => {
    setState((prev) => {
      const nextChecked = { ...(prev.checked || {}), [id]: !(prev.checked || {})[id] };

      // если выключили повторяемое — сбросим qty до 1
      if (id === REPEATABLE_ID && !nextChecked[id]) {
        const nextQty = { ...(prev.qty || {}), [id]: 1 };
        return { ...prev, checked: nextChecked, qty: nextQty };
      }

      return { ...prev, checked: nextChecked };
    });
  }, []);

  const MAX_HOURS = 8;

  const setTaskQty = useCallback((id, next) => {
    const v = clampInt(next, 1, MAX_HOURS);
    setState((prev) => ({ ...prev, qty: { ...(prev.qty || {}), [id]: v } }));
  }, []);

  const resetAll = useCallback(() => {
    setState((prev) => ({ ...prev, checked: {}, qty: {} }));
  }, []);

  const groups = useMemo(() => {
    const set = new Set(allTasks.map((t) => t.group));
    return ["Все", ...Array.from(set)];
  }, [allTasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTasks.filter((t) => {
      if (activeGroup !== "Все" && t.group !== activeGroup) return false;
      if (onlyUnchecked && checked[t.id]) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.group.toLowerCase().includes(q);
    });
  }, [allTasks, query, activeGroup, onlyUnchecked, checked]);

  // totalBP по всем задачам
  const totalBP = useMemo(() => {
    return allTasks.reduce((sum, t) => {
      if (!checked[t.id]) return sum;
      const bp = isPlat ? t.bpPlat : t.bpBase;
      const mult = t.id === REPEATABLE_ID ? (qty[t.id] || 1) : 1;
      return sum + bp * mult;
    }, 0);
  }, [allTasks, checked, isPlat, qty]);

  const doneCount = useMemo(() => {
    let c = 0;
    for (const t of allTasks) if (checked[t.id]) c++;
    return c;
  }, [allTasks, checked]);

  // prevent Space from scrolling the page (only on BP page)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space") {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ===== Analytics (history) =====
  const [monthOffset, setMonthOffset] = useState(0); // 0 = текущий месяц, -1 = прошлый, ...

  const monthInfo = useMemo(() => {
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = dt.getFullYear();
    const mi = dt.getMonth();
    return { year, monthIndex0: mi, key: startOfMonthKey(year, mi), title: formatMonthTitle(year, mi) };
  }, [monthOffset]);

  const monthSeries = useMemo(() => {
    const { year, monthIndex0 } = monthInfo;
    const dim = daysInMonth(year, monthIndex0);
    const out = [];
    const byDay = history?.byDay || {};
    for (let d = 1; d <= dim; d++) {
      const key = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const v = Number(byDay[key] || 0);
      out.push({
        day: String(d),
        bp: v,
        _key: key
      });
    }
    return out;
  }, [history, monthInfo]);

  const monthTotal = useMemo(() => monthSeries.reduce((s, x) => s + (x.bp || 0), 0), [monthSeries]);
  const daysWithData = useMemo(() => monthSeries.filter((x) => (x.bp || 0) > 0).length, [monthSeries]);
  const monthAvg = useMemo(() => (daysWithData ? Math.round((monthTotal / daysWithData) * 10) / 10 : 0), [monthTotal, daysWithData]);
  const bestDay = useMemo(() => {
    let best = { day: "—", bp: 0 };
    for (const x of monthSeries) if ((x.bp || 0) > best.bp) best = { day: x.day, bp: x.bp || 0 };
    return best.bp ? best : { day: "—", bp: 0 };
  }, [monthSeries]);

  // Автосейв: сохраняем пик за сегодня при изменении totalBP
  useEffect(() => {
    const today = ymdLocal(new Date());
    setHistory((prev) => {
      const byDay = { ...(prev?.byDay || {}) };
      const cur = Number(byDay[today] || 0);
      const next = Math.max(cur, Number(totalBP || 0));
      if (next === cur) return prev;
      byDay[today] = next;
      return { ...prev, byDay, updatedAt: new Date().toISOString() };
    });
  }, [totalBP]);

  const commitToday = useCallback(() => {
    const today = ymdLocal(new Date());
    setHistory((prev) => {
      const byDay = { ...(prev?.byDay || {}) };
      const cur = Number(byDay[today] || 0);
      const next = Math.max(cur, Number(totalBP || 0));
      byDay[today] = next;
      return { ...prev, byDay, updatedAt: new Date().toISOString() };
    });
  }, [totalBP]);

  const exportHistoryCsv = useCallback(() => {
    const byDay = history?.byDay || {};
    const keys = Object.keys(byDay).sort();
    const lines = ["date,bp"];
    for (const k of keys) lines.push(`${k},${Number(byDay[k] || 0)}`);
    downloadText(`bp_history_${ymdLocal(new Date())}.csv`, lines.join("\n"));
  }, [history]);

  return (
    <div className="pb-24 transition-colors">
      <SeasonalEffects />
      <HolidayLights />

      {/* Header */}
      <div className="relative z-10 px-6 pt-8 pb-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2 rounded-xl border shadow-sm
                bg-slate-100 border-slate-200
                dark:bg-white/10 dark:border-white/10"
            >
              <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-200" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BP</h1>
            <span className="text-xs text-slate-600 dark:text-white/60 ml-1">Задания</span>

            <div className="ml-auto flex items-center gap-2">
              {canSeeAnalytics ? (
                <Button
                  onClick={() => setShowAnalytics(true)}
                  className="shadow-sm text-white border-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:opacity-95"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  График
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled
                    className="shadow-sm text-white/80 border-0 bg-white/10 cursor-not-allowed"
                    title="График доступен только VIP/Admin"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    График
                  </Button>
                  <Badge className="bg-pink-500/20 text-fuchsia-200 border border-fuchsia-400/30">
                    VIP
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <p className="text-slate-600 dark:text-white/70">Отмечай задания, считай BP и смотри прогресс по месяцам</p>
        </motion.div>
      </div>

      <div className="relative z-10 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Analytics Panel */}
          <AnimatePresence>
          {showAnalytics && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* backdrop */}
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowAnalytics(false)}
              />

              {/* panel */}
              <motion.div
                className="relative w-full sm:max-w-3xl mx-auto m-0 sm:m-4"
                initial={{ y: 30, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute -top-12 right-3 sm:right-6">
                  <Button
                    onClick={() => setShowAnalytics(false)}
                    className="border-0 text-white shadow-sm bg-white/10 hover:bg-white/20"
                  >
                    Закрыть
                  </Button>
                </div>

                <div
                className="rounded-3xl border shadow-xl overflow-hidden
                  bg-white/80 border-slate-200/70
                  dark:bg-white/5 dark:border-white/10"
              >
                <div
                  className="p-5 border-b
                    border-slate-200/70
                    dark:border-white/10"
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-2xl border bg-indigo-500/10 border-indigo-400/30 dark:bg-indigo-500/15 dark:border-indigo-400/25">
                        <BarChart3 className="w-5 h-5 text-indigo-700 dark:text-indigo-200" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">BP Аналитика</div>
                        <div className="text-xs text-slate-600 dark:text-white/60">
                          Автосейв пика за день + ручная фиксация
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthOffset((m) => m - 1)}
                        className="rounded-xl
                          border-slate-200 bg-white text-slate-900 hover:bg-slate-50
                          dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        title="Предыдущий месяц"
                      >
                        ←
                      </Button>

                      <div className="px-3 py-2 rounded-xl border text-sm flex items-center gap-2
                        bg-white border-slate-200 text-slate-900
                        dark:bg-slate-950/40 dark:border-white/10 dark:text-white"
                      >
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-white/60" />
                        <span className="capitalize">{monthInfo.title}</span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                        className="rounded-xl
                          border-slate-200 bg-white text-slate-900 hover:bg-slate-50
                          dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        title="Следующий месяц"
                        disabled={monthOffset >= 0}
                      >
                        →
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl border p-3 bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
                      <div className="text-[11px] text-slate-600 dark:text-white/60">Сумма за месяц</div>
                      <div className="text-xl font-bold">{monthTotal}</div>
                    </div>
                    <div className="rounded-2xl border p-3 bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
                      <div className="text-[11px] text-slate-600 dark:text-white/60">Дней с активностью</div>
                      <div className="text-xl font-bold">{daysWithData}</div>
                    </div>
                    <div className="rounded-2xl border p-3 bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
                      <div className="text-[11px] text-slate-600 dark:text-white/60">Среднее (только активные)</div>
                      <div className="text-xl font-bold">{monthAvg}</div>
                    </div>
                    <div className="rounded-2xl border p-3 bg-white border-slate-200 text-slate-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
                      <div className="text-[11px] text-slate-600 dark:text-white/60">Лучший день</div>
                      <div className="text-xl font-bold">
                        {bestDay.day === "—" ? "—" : `${bestDay.day} → ${bestDay.bp}`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={commitToday}
                      className="rounded-xl border-0 shadow-sm text-white
                        bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:opacity-95"
                      title="Сохранит пик за сегодня"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Зафиксировать сегодня
                    </Button>

                    <Button
                      variant="outline"
                      onClick={exportHistoryCsv}
                      className="rounded-xl shadow-sm
                        border-slate-200 bg-white text-slate-900 hover:bg-slate-50
                        dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                      title="Экспорт всей истории в CSV"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV история
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthSeries} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value) => [value, "BP"]}
                          labelFormatter={(label) => `День ${label}`}
                          contentStyle={{
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(2,6,23,0.92)",
                            color: "white"
                          }}
                        />
                        <Bar dataKey="bp" radius={[10, 10, 0, 0]} fill="rgba(99,102,241,0.85)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 dark:text-white/55">
                    Совет: просто отмечай задачи — график сам сохраняет пик BP за день.
                  </div>
                </div>
              </div>
            
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Sticky Stats Bar */}
          <div className="sticky top-3 z-40 mb-4">
            <div
              className="backdrop-blur-xl rounded-2xl px-4 py-3 shadow-xl border
                bg-white/90 text-slate-900 border-slate-200/70
                dark:bg-slate-950/75 dark:text-white dark:border-white/10"
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />

                  <div className="min-w-[110px]">
                    <div className="text-[11px] leading-4 text-slate-600 dark:text-white/60">
                      Всего BP
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalBP}
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200/70 dark:bg-white/10" />

                  <div className="min-w-[110px]">
                    <div className="text-[11px] leading-4 text-slate-600 dark:text-white/60">
                      Отмечено
                    </div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white">
                      {doneCount}
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200/70 dark:bg-white/10 hidden sm:block" />

                  <div className="flex items-center gap-2">
                    <Switch checked={onlyUnchecked} onCheckedChange={setOnlyUnchecked} />
                    <span className="text-sm text-slate-700 dark:text-white/80">
                      Только не выполненные
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  className="rounded-xl shadow-sm
                    border-slate-200 bg-white text-slate-900 hover:bg-slate-50
                    dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  title="Сбросить все отметки"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Сбросить всё
                </Button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            className="backdrop-blur-xl rounded-3xl shadow-xl border p-5 mb-6
              bg-white/80 border-slate-200/70
              dark:bg-white/5 dark:border-white/10"
          >
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-400 dark:text-white/50 shrink-0" />
                <Input
                  placeholder="Поиск задания или категории..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400
                    focus-visible:ring-indigo-500/30
                    dark:bg-slate-950/40 dark:border-white/10 dark:text-white dark:placeholder:text-white/40 dark:focus-visible:ring-indigo-500/40"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={isPlat} onCheckedChange={setIsPlat} />
                  <span className="text-sm text-slate-700 dark:text-white/80">Platinum BP</span>
                </div>
              </div>

              {/* Категории */}
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const active = activeGroup === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setActiveGroup(g)}
                      className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                        active
                          ? "border-indigo-400/60 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tasks */}
          {filtered.length === 0 ? (
            <div
              className="text-sm rounded-2xl p-6 border backdrop-blur-xl
                bg-white/80 border-slate-200/70 text-slate-600
                dark:bg-white/5 dark:border-white/10 dark:text-white/70"
            >
              Ничего не найдено. Попробуй другой запрос или категорию.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => {
                const active = !!checked[t.id];
                const bp = isPlat ? t.bpPlat : t.bpBase;
                const isRepeatable = t.id === REPEATABLE_ID;
                const mult = isRepeatable ? (qty[t.id] || 1) : 1;

                return (
                  <motion.div
                    key={t.id}
                    layout
                    onClick={() => toggleTask(t.id)}
                    className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition cursor-pointer select-none backdrop-blur-xl ${
                      active
                        ? "bg-indigo-500/10 border-indigo-400/50 dark:bg-indigo-500/15 dark:border-indigo-400/30"
                        : "bg-white/80 border-slate-200/70 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/7"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={active} onCheckedChange={() => toggleTask(t.id)} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm text-slate-900 dark:text-white break-words">{t.title}</div>
                        <div className="text-xs text-slate-600 dark:text-white/55 mt-1">
                          {isRepeatable ? "Можно выполнять многократно (укажи количество)" : "Одно выполнение"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isRepeatable && (
                        <div
                          className="flex items-center gap-1 rounded-xl border px-1 py-1
                            bg-slate-100 border-slate-200
                            dark:bg-slate-950/30 dark:border-white/10"
                        >
                          <button
                            type="button"
                            onClick={() => setTaskQty(t.id, (qty[t.id] || 1) - 1)}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                            title="Минус"
                          >
                            <Minus className="w-4 h-4 text-slate-700 dark:text-white/80" />
                          </button>

                          <div className="w-8 text-center text-sm font-semibold text-slate-900 dark:text-white">
                            {mult}
                          </div>

                          <button
                            type="button"
                            onClick={() => setTaskQty(t.id, (qty[t.id] || 1) + 1)}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                            title="Плюс"
                          >
                            <Plus className="w-4 h-4 text-slate-700 dark:text-white/80" />
                          </button>
                        </div>
                      )}

                      <Badge variant={active ? "default" : "secondary"} className="shrink-0">
                        +{bp * mult} BP
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
