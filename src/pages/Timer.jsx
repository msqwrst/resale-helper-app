import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  Crown
} from "lucide-react";

import messengerRingtone from "@/assets/facebook-messenger-ringtone.mp3";

const LS_KEY = "resale_timer_state_v3";
const LS_FORM_KEY = "resale_timer_form_v1";
const MAX_TIMERS_FREE = 2;

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";
function getToken() {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}
async function fetchMeSafe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function tierFromMe(me) {
  const role = String(me?.role || "").toLowerCase();

  const isAdmin = role === "admin";

  const vipUntil = parseDate(me?.vip_until);
  const vipByDate = vipUntil ? vipUntil.getTime() > Date.now() : false;
  const isVip = isAdmin || role === "vip" || !!me?.vip_active || vipByDate;

  const promoUntil = parseDate(me?.promo_until);
  const promoByDate = promoUntil ? promoUntil.getTime() > Date.now() : false;
  const isPromo = isAdmin || role === "promo" || !!me?.promo_active || promoByDate;

  if (isAdmin) return "ADMIN";
  if (isVip) return "VIP";
  if (isPromo) return "PROMO";
  return "FREE";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function formatTime(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x) => String(x).padStart(2, "0");
  if (hh > 0) return `${hh}:${pad(mm)}:${pad(ss)}`;
  return `${mm}:${pad(ss)}`;
}
function secondsFromInputs(minutes, seconds) {
  const m = parseInt(String(minutes).replace(/\D/g, "") || "0", 10);
  const s = parseInt(String(seconds).replace(/\D/g, "") || "0", 10);
  return clamp(m, 0, 999) * 60 + clamp(s, 0, 59);
}

export default function Timer() {
  const [minutes, setMinutes] = useState("3");
  const [seconds, setSeconds] = useState("0");
  const [label, setLabel] = useState("");
  const [soundOn, setSoundOn] = useState(true);

  const [me, setMe] = useState(null);
  const [tier, setTier] = useState("FREE");

  const [timers, setTimers] = useState([]);
  const [history, setHistory] = useState([]);

  const [limitMsg, setLimitMsg] = useState("");
  const limitMsgTimerRef = useRef(null);

  const audioRef = useRef(null);
  const tickRef = useRef(null);
  const [alarmTimerId, setAlarmTimerId] = useState(null);

  // ✅ refs чтобы интервал не пересоздавался каждую секунду (и не лагал UI)
  const alarmRef = useRef(null);
  const soundOnRef = useRef(true);

  useEffect(() => {
    alarmRef.current = alarmTimerId;
  }, [alarmTimerId]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const isPrivileged = useMemo(() => tier !== "FREE", [tier]);
  const maxTimersAllowed = isPrivileged ? 30 : MAX_TIMERS_FREE;

  const totalSeconds = useMemo(
    () => secondsFromInputs(minutes, seconds),
    [minutes, seconds]
  );

  const showLimit = (msg) => {
    try {
      if (limitMsgTimerRef.current) window.clearTimeout(limitMsgTimerRef.current);
      setLimitMsg(msg);
      limitMsgTimerRef.current = window.setTimeout(() => setLimitMsg(""), 2500);
    } catch {}
  };

  // ===== load me/tier =====
  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await fetchMeSafe();
      if (!alive) return;
      setMe(m);
      setTier(tierFromMe(m));
    })();
    return () => {
      alive = false;
      try {
        if (limitMsgTimerRef.current) window.clearTimeout(limitMsgTimerRef.current);
      } catch {}
    };
  }, []);

  // ===== load form draft =====
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(LS_FORM_KEY) || "");
    if (saved && typeof saved === "object") {
      if (typeof saved.minutes === "string") setMinutes(saved.minutes);
      if (typeof saved.seconds === "string") setSeconds(saved.seconds);
      if (typeof saved.label === "string") setLabel(saved.label);
    }
  }, []);

  // ===== load state =====
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(LS_KEY) || "");
    if (saved && typeof saved === "object") {
      if (Array.isArray(saved.timers)) setTimers(saved.timers);
      if (Array.isArray(saved.history)) setHistory(saved.history);
      if (typeof saved.soundOn === "boolean") setSoundOn(saved.soundOn);
    }
  }, []);

  // ===== persist =====
  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        timers,
        history,
        soundOn
      })
    );
  }, [timers, history, soundOn]);

  // ===== alarm helpers =====
  const stopAlarm = () => {
    try {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    } catch {}
    setAlarmTimerId(null);
  };

  const unlockAudio = async () => {
    try {
      const a = audioRef.current;
      if (!a) return;
      a.loop = true;
      a.volume = 0.9;
      await a.play();
      a.pause();
      a.currentTime = 0;
    } catch {}
  };

  const startAlarm = async (timerId) => {
    if (!soundOnRef.current) return;
    try {
      const a = audioRef.current;
      if (!a) return;
      a.loop = true;
      a.volume = 0.9;
      await a.play();
      setAlarmTimerId(timerId);
    } catch {}
  };

  useEffect(() => {
    if (!soundOn && alarmTimerId) stopAlarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  // ===== actions =====
  const addTimer = async (sec, name) => {
    const s = typeof sec === "number" ? sec : totalSeconds;
    const n = typeof name === "string" ? name : label;
    if (s <= 0) return;

    if (!isPrivileged && timers.length >= MAX_TIMERS_FREE) {
      showLimit("FREE: максимум 2 таймера. VIP/PROMO/ADMIN — без лимита.");
      return;
    }

    await unlockAudio();

    const now = Date.now();
    const t = {
      id: uid(),
      label: (n || "").trim() || "Таймер",
      totalSec: s,
      running: true,
      targetTs: now + s * 1000,
      remaining: s,
      createdTs: now,
      endedTs: null
    };

    setTimers((prev) => [t, ...prev].slice(0, maxTimersAllowed));

    if ((n || "").trim()) {
      setHistory((prev) => [{ label: (n || "").trim(), sec: s, ts: now }, ...prev].slice(0, 20));
    }
  };

  const pauseTimer = (id) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (!t.running) return t;
        const now = Date.now();
        const left = Math.max(0, Math.round((t.targetTs - now) / 1000));
        return { ...t, running: false, targetTs: null, remaining: left };
      })
    );
  };

  const resumeTimer = async (id) => {
    await unlockAudio();
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.running) return t;
        const now = Date.now();
        const left = Math.max(0, Math.floor(t.remaining || 0));
        if (left <= 0) return t;
        return { ...t, running: true, targetTs: now + left * 1000 };
      })
    );
  };

  const resetTimer = (id) => {
    if (alarmTimerId === id) stopAlarm();
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, running: false, targetTs: null, remaining: t.totalSec, endedTs: null }
          : t
      )
    );
  };

  const removeTimer = (id) => {
    if (alarmTimerId === id) stopAlarm();
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    stopAlarm();
    setTimers([]);
  };

  const presets = useMemo(
    () => [
      { name: "Почта", sec: 600 },
      { name: "Дрессировка", sec: 900 },
      { name: "Задан. Клуба", sec: 7200 },
      { name: "Тир", sec: 5400 },
      { name: "Таро", sec: 10800 },
      { name: "Угонка", sec: 5400 },
      { name: "Сутинерка", sec: 5400 }
    ],
    []
  );

  const hasRunning = useMemo(
    () => timers.some((t) => t.running && t.targetTs),
    [timers]
  );

  // ✅ НЕЛАГАЮЩИЙ тик-луп: запускается только когда есть running таймеры
  // ✅ уведомление/звук строго 1 раз на завершение
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (!hasRunning) return;

    const tick = () => {
      const now = Date.now();
      let finished = null;

      setTimers((prev) =>
        prev.map((t) => {
          if (!t.running || !t.targetTs) return t;

          const left = Math.max(0, Math.round((t.targetTs - now) / 1000));

          if (left <= 0) {
            // уже завершали — НЕ спамим
            if (t.endedTs) return { ...t, running: false, targetTs: null, remaining: 0 };

            finished = { id: t.id, label: t.label };
            return { ...t, running: false, targetTs: null, remaining: 0, endedTs: now };
          }

          return { ...t, remaining: left };
        })
      );

      if (!alarmRef.current && finished) {
        try {
          if ("Notification" in window) {
            const show = () =>
              new Notification("Таймер завершён", {
                body: finished.label || "Пора действовать 💥"
              });

            if (Notification.permission === "granted") show();
            else if (Notification.permission !== "denied") {
              Notification.requestPermission().then((p) => p === "granted" && show());
            }
          }
        } catch {}

        startAlarm(finished.id);
      }
    };

    tick(); // сразу обновим
    tickRef.current = setInterval(tick, 1000); // ✅ 1 раз/сек (без лагов и блокировок)

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRunning]);

  const isFreeAtLimit = useMemo(
    () => !isPrivileged && timers.length >= MAX_TIMERS_FREE,
    [isPrivileged, timers.length]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div className="px-6 pt-8 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                Таймеры <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {isPrivileged ? (
                  <span className="inline-flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Статус: <b className="ml-1">{tier}</b> • без лимита на таймеры
                  </span>
                ) : (
                  <span>FREE: максимум {MAX_TIMERS_FREE} таймера одновременно</span>
                )}
              </div>
            </div>

            {alarmTimerId ? (
              <Button
                type="button"
                onClick={stopAlarm}
                className="rounded-2xl bg-rose-600 hover:bg-rose-600/90"
              >
                <Bell className="w-4 h-4 mr-2" />
                Остановить
              </Button>
            ) : null}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-6 bg-white dark:bg-slate-900/60 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Название
                </div>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="например: угонка"
                  className="w-full dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
                />
                <AnimatePresence>
                  {!!limitMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-100"
                    >
                      {limitMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onClick={() => addTimer()}
                disabled={totalSeconds <= 0 || isFreeAtLimit}
                className="shrink-0 rounded-2xl"
                type="button"
                title={isFreeAtLimit ? "FREE лимит: максимум 2 таймера" : "Добавить и сразу запустить"}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Минуты
                </div>
                <Input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  inputMode="numeric"
                  className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Секунды
                </div>
                <Input
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  inputMode="numeric"
                  className="dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSoundOn((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Звук: <b>{soundOn ? "ON" : "OFF"}</b>
              </button>

              <Button type="button" variant="secondary" onClick={clearAll} className="rounded-2xl">
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить все
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => addTimer(p.sec, p.name)}
                  disabled={isFreeAtLimit}
                  className={`px-3 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900 ${
                    isFreeAtLimit ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={isFreeAtLimit ? "FREE лимит: максимум 2 таймера" : ""}
                >
                  {p.name} • {formatTime(p.sec)}
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence>
            {timers.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-6 space-y-3"
              >
                {timers.map((t) => {
                  const remaining = Number(t.remaining || 0);
                  const total = Math.max(1, Number(t.totalSec || 1));
                  const p = clamp(1 - remaining / total, 0, 1);

                  return (
                    <div
                      key={t.id}
                      className="bg-white dark:bg-slate-900/60 rounded-3xl shadow-xl shadow-slate-200/40 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">
                            {t.label}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                            Осталось:{" "}
                            <b className="text-slate-900 dark:text-slate-50">{formatTime(remaining)}</b> из{" "}
                            {formatTime(total)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {t.running ? (
                            <button
                              onClick={() => pauseTimer(t.id)}
                              className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                              type="button"
                              title="Пауза"
                            >
                              <Pause className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            </button>
                          ) : (
                            <button
                              onClick={() => resumeTimer(t.id)}
                              className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                              type="button"
                              title="Продолжить"
                            >
                              <Play className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                            </button>
                          )}

                          <button
                            onClick={() => resetTimer(t.id)}
                            className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                            type="button"
                            title="Сброс"
                          >
                            <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                          </button>

                          <button
                            onClick={() => removeTimer(t.id)}
                            className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                            type="button"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 dark:bg-emerald-300 transition-[width] duration-150 ease-linear"
                            style={{ width: `${(p * 100).toFixed(3)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-sm text-slate-500 dark:text-slate-400"
              >
                Нет таймеров. Нажми <b>Добавить</b> или кликни по пресету.
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {history.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    История (последние)
                  </div>

                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition select-none"
                    type="button"
                  >
                    Очистить
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 10).map((h) => (
                    <button
                      key={h.ts}
                      type="button"
                      onClick={() => addTimer(h.sec, h.label)}
                      disabled={isFreeAtLimit}
                      className={`px-3 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-900 ${
                        isFreeAtLimit ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      title={isFreeAtLimit ? "FREE лимит: максимум 2 таймера" : ""}
                    >
                      {h.label} • {formatTime(h.sec)}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <audio ref={audioRef} preload="auto" src={messengerRingtone} />
    </div>
  );
}
