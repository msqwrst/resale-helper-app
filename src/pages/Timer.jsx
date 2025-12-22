import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import alarmMp3 from "@/assets/facebook-messenger-ringtone.mp3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Timer as TimerIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function Timer() {
  const alarmRef = useRef(null);
  const intervalRef = useRef(null);

  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");

  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const [showAlert, setShowAlert] = useState(false);

  // ✅ init alarm (loop)
  useEffect(() => {
    alarmRef.current = new Audio(alarmMp3);
    alarmRef.current.loop = true;
    alarmRef.current.volume = 0.8;

    return () => {
      try {
        alarmRef.current?.pause();
        alarmRef.current = null;
      } catch {}
    };
  }, []);

  const startAlarm = async () => {
    try {
      if (!alarmRef.current) return;
      alarmRef.current.currentTime = 0;
      await alarmRef.current.play();
    } catch {
      // если вдруг политика звука мешает — можно добавить кнопку "Включить звук"
    }
  };

  const stopAlarm = () => {
    try {
      if (!alarmRef.current) return;
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    } catch {}
  };

  // ✅ Пункты 1-в-1 как на скрине
  const categories = [
    { label: "Выберите категорию", value: "", total: null },
    { label: "Почта (10:00)", value: "mail", total: 10 * 60 },
    { label: "Организация (02:00:00)", value: "org", total: 2 * 60 * 60 },
    { label: "Карты таро (03:00:00)", value: "taro", total: 3 * 60 * 60 },
    { label: "Дрессировка (15:00)", value: "train", total: 15 * 60 },
    { label: "Автоугон (01:30:00)", value: "carjack", total: 1 * 60 * 60 + 30 * 60 },
    { label: "Сутенерка (01:30:00)", value: "pimp", total: 1 * 60 * 60 + 30 * 60 },
    { label: "Автобус (03:00)", value: "bus", total: 3 * 60 },
    { label: "Задание клуба (02:00:00)", value: "club", total: 2 * 60 * 60 },
    { label: "Тир (01:30:00)", value: "range", total: 1 * 60 * 60 + 30 * 60 },
    { label: "Контрабанда (05:00)", value: "contraband", total: 5 * 60 },
    { label: "Свой таймер", value: "custom", total: null }
  ];

  const [selectedCategory, setSelectedCategory] = useState("");

  const applyTotal = (total) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    setMinutes(String(m));
    setSeconds(String(s));
  };

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);

    const item = categories.find((c) => c.value === value);
    if (!item) return;

    if (item.value === "custom" || item.total == null) return;
    if (hasStarted) return;

    applyTotal(item.total);
  };

  // ✅ ticking (без запуска звука внутри setState)
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingSeconds]);

  // ✅ когда дошли до 0 — показываем окно и включаем звук (loop)
  useEffect(() => {
    if (hasStarted && remainingSeconds === 0 && !isRunning && totalSeconds > 0) {
      setShowAlert(true);
      startAlarm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, remainingSeconds, isRunning, totalSeconds]);

  const handleStart = () => {
    stopAlarm(); // ✅ всегда вырубаем звук перед стартом

    const mins = parseInt(minutes, 10) || 0;
    const secs = parseInt(seconds, 10) || 0;

    if (!hasStarted) {
      const total = mins * 60 + secs;
      if (total <= 0) return;

      setTotalSeconds(total);
      setRemainingSeconds(total);
      setHasStarted(true);
      setIsRunning(true);
      return;
    }

    // если дошёл до 0 — стартуем заново
    if (remainingSeconds === 0 && totalSeconds > 0) {
      setRemainingSeconds(totalSeconds);
    }

    setIsRunning(true);
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    stopAlarm();
    setIsRunning(false);
    setHasStarted(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    setShowAlert(false);
  };

  const presets = [
    { label: "1 мин", m: 1, s: 0 },
    { label: "5 мин", m: 5, s: 0 },
    { label: "10 мин", m: 10, s: 0 },
    { label: "15 мин", m: 15, s: 0 }
  ];

  const applyPreset = (m, s) => {
    if (!hasStarted) {
      setMinutes(String(m));
      setSeconds(String(s));
      setSelectedCategory("custom");
    }
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return { m: String(mins).padStart(2, "0"), s: String(rem).padStart(2, "0") };
  };

  const display = formatTime(remainingSeconds);

  const r = 45;
  const c = 2 * Math.PI * r;
  const dash = c - (progress / 100) * c;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-12">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl">
              <TimerIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Таймер</h1>
          </div>
          <p className="text-emerald-100">Установите обратный отсчет для объявлений, аукционов или напоминаний</p>
        </motion.div>
      </div>

      <div className="px-6 -mt-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-6"
          >
            {/* Категория таймера */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-slate-500 mb-2">Категория таймера</div>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={hasStarted}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
                  hasStarted
                    ? "border-slate-200 text-slate-400 bg-slate-50"
                    : "border-amber-400/60 focus:border-amber-400 bg-white text-slate-800"
                }`}
              >
                {categories.map((c) => (
                  <option key={c.value || c.label} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {hasStarted && <div className="text-xs text-slate-400 mt-2">Чтобы сменить категорию — нажми “Сбросить”.</div>}
            </div>

            {/* Circle */}
            <div className="relative w-56 h-56 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={dash}
                  initial={false}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 0.2 }}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-slate-900 tabular-nums">
                    {display.m}:{display.s}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{hasStarted ? (isRunning ? "Running" : "Paused") : "Ready"}</div>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Минуты</div>
                <Input
                  disabled={hasStarted}
                  value={minutes}
                  onChange={(e) => {
                    setSelectedCategory("custom");
                    setMinutes(e.target.value.replace(/[^\d]/g, ""));
                  }}
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Секунды</div>
                <Input
                  disabled={hasStarted}
                  value={seconds}
                  onChange={(e) => {
                    setSelectedCategory("custom");
                    setSeconds(e.target.value.replace(/[^\d]/g, ""));
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-6">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.m, p.s)}
                  disabled={hasStarted}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition ${
                    hasStarted
                      ? "border-slate-200 text-slate-400 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {!isRunning ? (
                <Button className="flex-1" onClick={handleStart}>
                  <span className="inline-flex items-center gap-2">
                    <Play className="w-4 h-4" /> Старт
                  </span>
                </Button>
              ) : (
                <Button className="flex-1" variant="ghost" onClick={handlePause}>
                  <span className="inline-flex items-center gap-2">
                    <Pause className="w-4 h-4" /> Пауза
                  </span>
                </Button>
              )}

              <Button variant="ghost" className="flex-1" onClick={handleReset}>
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Сбросить
                </span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <AlertDialog
        open={showAlert}
        onOpenChange={(open) => {
          if (!open) stopAlarm();
          setShowAlert(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Время вышло!</AlertDialogTitle>
            <AlertDialogDescription>Ваш таймер был завершен.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                stopAlarm();
                setShowAlert(false);
              }}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
