import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  const [minutes, setMinutes] = useState("5");
  const [seconds, setSeconds] = useState("0");
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const intervalRef = useRef(null);

  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return { m: String(mins).padStart(2, "0"), s: String(rem).padStart(2, "0") };
  };

  const display = formatTime(remainingSeconds);

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setShowAlert(true);
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

  const handleStart = () => {
    if (!hasStarted) {
      const mins = parseInt(minutes, 10) || 0;
      const secs = parseInt(seconds, 10) || 0;
      const total = mins * 60 + secs;
      if (total > 0) {
        setTotalSeconds(total);
        setRemainingSeconds(total);
        setHasStarted(true);
        setIsRunning(true);
      }
    } else {
      setIsRunning(true);
    }
  };

  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    setHasStarted(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
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
    }
  };

  // circle math
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
                  <div className="text-sm text-slate-500 mt-1">
                    {hasStarted ? (isRunning ? "Running" : "Paused") : "Ready"}
                  </div>
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
                  onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Секунды</div>
                <Input
                  disabled={hasStarted}
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value.replace(/[^\d]/g, ""))}
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

      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Время вышло!</AlertDialogTitle>
            <AlertDialogDescription>ваш таймер был завершен.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
