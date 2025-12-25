import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  Crown,
  ShieldCheck,
  Layers,
  CheckCircle2,
  MessageCircle,
  User
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatPct(p) {
  return `${Math.round(clamp(p, 0, 1) * 100)}%`;
}

function openDiscord() {
  const url = "https://discord.com/users/mobsioff";
  try {
    const api = typeof window !== "undefined" ? window.appAPI : null;
    if (api?.openExternal) return api.openExternal(url);
  } catch {}
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    try {
      window.location.href = url;
    } catch {}
  }
}

/** ✅ Премиальный фон: мягкий “aurora + grain + vignette” */
function PremiumBackdrop({ reduced }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* base */}
      <div className="absolute inset-0 bg-[#070A12]" />

      {/* aurora blobs */}
      <div className="absolute -top-52 -right-48 h-[680px] w-[680px] rounded-full blur-3xl bg-indigo-500/18" />
      <div className="absolute -bottom-56 -left-52 h-[720px] w-[720px] rounded-full blur-3xl bg-fuchsia-500/14" />
      <div className="absolute top-[38%] left-[52%] h-[620px] w-[620px] rounded-full blur-3xl bg-cyan-500/10" />

      {/* subtle animated shimmer layer */}
      {!reduced ? (
        <motion.div
          className="absolute -inset-[30%] opacity-[0.10]"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.00), rgba(255,255,255,0.10), rgba(255,255,255,0.00), rgba(255,255,255,0.12), rgba(255,255,255,0.00))",
            filter: "blur(14px)"
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      {/* grid dots */}
      <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:46px_46px]" />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.86)_100%)]" />

      {/* grain */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.10),rgba(255,255,255,0.10)_1px,transparent_1px,transparent_3px)]" />
    </div>
  );
}

/** ✅ “Liquid Glass” контейнер */
function LiquidGlass({ children, className = "" }) {
  return (
    <div
      className={[
        "relative rounded-[30px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl",
        "shadow-[0_28px_90px_-48px_rgba(0,0,0,0.92)]",
        className
      ].join(" ")}
    >
      {/* edge ring */}
      <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-white/10" />
      {/* top highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-[30px] [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)] bg-white/10" />
      {/* diagonal sheen */}
      <div className="pointer-events-none absolute inset-0 rounded-[30px] opacity-[0.25] [mask-image:linear-gradient(115deg,transparent_20%,black_50%,transparent_80%)] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {children}
    </div>
  );
}

/** ✅ Лого/марка без “мультяшности”: корона в стекле + мягкое свечение */
function LogoMark({ reduced }) {
  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.65, ease }}
      className="relative"
    >
      {!reduced ? (
        <motion.div
          className="absolute -inset-9 rounded-[40px] blur-2xl bg-gradient-to-br from-indigo-500/26 via-fuchsia-500/18 to-cyan-500/14"
          animate={{ opacity: [0.45, 0.62, 0.45], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <div className="absolute -inset-9 rounded-[40px] blur-2xl bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/14 to-cyan-500/10" />
      )}

      <div className="relative h-20 w-20 rounded-[26px] border border-white/12 bg-white/8 backdrop-blur-2xl flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-white/12 to-transparent" />
        <div className="absolute -left-10 top-0 h-40 w-24 rotate-[20deg] bg-white/10 blur-xl" />
        <Crown className="relative h-9 w-9 text-white/92 drop-shadow" />
      </div>
    </motion.div>
  );
}

function Pill({ icon: Icon, text, tone = "neutral" }) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-white/70",
    accent: "border-indigo-500/25 bg-indigo-500/10 text-indigo-100",
    ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold",
        "backdrop-blur",
        tones[tone] || tones.neutral
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {text}
    </span>
  );
}

function StepLine({ steps, phase, reduced }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        {steps.map((s, idx) => {
          const active = idx === phase;
          const done = idx < phase;
          return (
            <div key={s.t} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "h-7 w-7 rounded-full grid place-items-center border",
                    done
                      ? "border-emerald-500/25 bg-emerald-500/10"
                      : active
                      ? "border-indigo-500/25 bg-indigo-500/10"
                      : "border-white/10 bg-white/5"
                  ].join(" ")}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                  ) : (
                    <s.icon className={["h-4 w-4", active ? "text-indigo-100" : "text-white/60"].join(" ")} />
                  )}
                </span>
                <div className="min-w-0">
                  <div className={["text-[12px] font-semibold truncate", active ? "text-white/85" : "text-white/55"].join(" ")}>
                    {s.t}
                  </div>
                </div>
              </div>

              <div className="mt-2 h-1.5 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{
                    width: done ? "100%" : active ? "70%" : "18%"
                  }}
                  transition={{ duration: reduced ? 0 : 0.4, ease }}
                  className="h-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300"
                  style={{ filter: "drop-shadow(0 10px 18px rgba(99,102,241,0.22))" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ p, reduced }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[12px] text-white/55 font-semibold mb-2">
        <span>Загрузка</span>
        <span className="tabular-nums">{formatPct(p)}</span>
      </div>

      <div className="relative h-3 rounded-full border border-white/10 bg-white/5 overflow-hidden">
        {!reduced ? (
          <motion.div
            className="absolute inset-y-0 w-28 bg-white/10 blur-md"
            animate={{ x: ["-30%", "120%"] }}
            transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }}
          />
        ) : null}

        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${clamp(p, 0, 1) * 100}%` }}
          transition={{ duration: 0.18, ease: "linear" }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-cyan-300"
          style={{ filter: "drop-shadow(0 12px 20px rgba(99,102,241,0.28))" }}
        />
      </div>
    </div>
  );
}

export default function Splash({
  onDone,
  open = true,
  minMs = 2600,
  maxMs = 4200,
  appName = "RESALE Helper",
  subtitle = "Инструменты для фарма и перепродажи",
  author = "mobsioff",
  discord = "mobsioff"
}) {
  const reduced = useReducedMotion();
  const [p, setP] = useState(0);
  const [phase, setPhase] = useState(0);
  const [done, setDone] = useState(false);
  const calledRef = useRef(false);

  const steps = useMemo(
    () => [
      { t: "Подготовка интерфейса", icon: Layers },
      { t: "Проверка доступа", icon: ShieldCheck },
      { t: "Запуск модулей", icon: Sparkles }
    ],
    []
  );

  useEffect(() => {
    if (!open) return;

    setP(0);
    setPhase(0);
    setDone(false);
    calledRef.current = false;

    const start = Date.now();
    const target = clamp(Math.floor(minMs + Math.random() * (maxMs - minMs)), 1200, 15000);

    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const x = clamp(elapsed / target, 0, 1);

      // “умная” кривая: старт быстро, середина плавно, конец чуть ускоряем
      const eased =
        x < 0.32 ? x * 0.92 : x < 0.72 ? 0.294 + (x - 0.32) * 0.78 : 0.606 + (x - 0.72) * 1.40;

      const prog = clamp(eased, 0, 1);
      setP(prog);

      if (prog > 0.22) setPhase(1);
      if (prog > 0.58) setPhase(2);

      if (x >= 1) {
        setP(1);
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, minMs, maxMs]);

  // ✅ onDone один раз + задержка на fade-out
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      if (calledRef.current) return;
      calledRef.current = true;
      onDone?.();
    }, 520);
    return () => clearTimeout(t);
  }, [done, onDone]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className={`fixed inset-0 z-[9999] flex items-center justify-center ${done ? "pointer-events-none" : "pointer-events-auto"}`}
        >
          <PremiumBackdrop reduced={reduced} />

          <div className="relative w-full px-6">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease }}
              className="mx-auto max-w-[760px]"
            >
              <LiquidGlass className="p-6 md:p-7">
                {/* header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <LogoMark reduced={reduced} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill icon={Crown} text="Liquid Glass" tone="accent" />
                        <Pill icon={steps[phase]?.icon || Sparkles} text={steps[phase]?.t || "Загрузка"} />
                      </div>

                      <div className="mt-3">
                        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                          {appName}
                        </div>
                        <div className="mt-1 text-sm text-white/60">{subtitle}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <User className="h-4 w-4 text-white/70" />
                      <div className="leading-tight">
                        <div className="text-[12px] font-bold text-white/80">{author}</div>
                        <button
                          type="button"
                          onClick={openDiscord}
                          className="pointer-events-auto text-[11px] text-white/55 hover:text-white/80 transition inline-flex items-center gap-1.5"
                          title="Открыть Discord"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          discord: {discord}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* steps */}
                <StepLine steps={steps} phase={phase} reduced={reduced} />

                {/* progress */}
                <div className="mt-6">
                  <ProgressBar p={p} reduced={reduced} />
                </div>

                {/* footer */}
                <div className="mt-5 flex items-center justify-between">
                  <div className="text-[12px] text-white/55 font-semibold">
                    {done ? "Готово. Открываем приложение…" : "Запускаем аккуратно — без лагов 😌"}
                  </div>

                  <AnimatePresence mode="wait">
                    {done ? (
                      <motion.div
                        key="ok"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-100"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Ready
                      </motion.div>
                    ) : (
                      <motion.div
                        key="dots"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/45"
                      >
                        <span className="h-2 w-2 rounded-full bg-white/30" />
                        <span className="h-2 w-2 rounded-full bg-white/20" />
                        <span className="h-2 w-2 rounded-full bg-white/15" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </LiquidGlass>

              <div className="mt-4 text-center text-[11px] text-white/35">
                Автор: <span className="text-white/55 font-semibold">{author}</span> • Discord:{" "}
                <span className="text-white/55 font-semibold">{discord}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
