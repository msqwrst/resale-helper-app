import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Timer, Calculator, Star, ArrowRight, Sparkles, Zap, MessageCircle, Heart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const tools = useMemo(
    () => [
      {
        title: "BP",
        description: "Фарм-лист с быстрыми отметками и сохранением прогресса.",
        icon: Star,
        color: "from-yellow-500 to-orange-600",
        iconBg: "bg-yellow-100 dark:bg-yellow-500/20",
        iconColor: "text-amber-600 dark:text-amber-300",
        page: "BP",
        tag: "Фарм-лист"
      },
      {
        title: "Таймер",
        description: "Объявления • аукционы • напоминания. Быстро и без нервов.",
        icon: Timer,
        color: "from-emerald-500 to-teal-600",
        iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-300",
        page: "Timer",
        tag: "Быстрый отсчёт"
      },
      {
        title: "Калькулятор",
        description: "Учитывай доход/расход и всегда знай реальный итог.",
        icon: Calculator,
        color: "from-sky-500 to-blue-600",
        iconBg: "bg-sky-100 dark:bg-sky-500/20",
        iconColor: "text-sky-700 dark:text-sky-300",
        page: "Calculator",
        tag: "Учёт денег"
      }
    ],
    []
  );

  // ✅ Только инвайт
  const DISCORD_INVITE = import.meta.env.VITE_DISCORD_INVITE || "https://discord.gg/ТВОЙ_ИНВАЙТ";

  // ===== PC-only: mouse parallax =====
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1..1
      setMx(x);
      setMy(y);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ===== Smart show/hide Discord button on scroll =====
  const [showDiscord, setShowDiscord] = useState(true);

  useEffect(() => {
    let last = window.scrollY || 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const down = y > last + 2;
      // показываем если скроллим вверх или мы близко к верху
      setShowDiscord(!down || y < 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen pb-12 overflow-x-hidden bg-transparent">
      {/* фон fixed */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50 dark:from-[#060713] dark:via-[#070b18] dark:to-[#030409]" />

        {/* glows with parallax */}
        <div
          className="absolute top-[-140px] left-1/2 -translate-x-1/2 w-[760px] h-[320px] rounded-full blur-[140px]
                     bg-gradient-to-r from-emerald-500 via-indigo-500 to-fuchsia-500
                     opacity-15 dark:opacity-25"
          style={{ transform: `translate3d(${mx * 18}px, ${my * 12}px, 0) translateX(-50%)` }}
        />
        <div
          className="absolute bottom-[-220px] left-[-180px] w-[520px] h-[520px] rounded-full blur-[160px]
                     bg-emerald-500 opacity-10 dark:opacity-18"
          style={{ transform: `translate3d(${mx * 10}px, ${my * 8}px, 0)` }}
        />
        <div
          className="absolute bottom-[-240px] right-[-160px] w-[560px] h-[560px] rounded-full blur-[170px]
                     bg-indigo-600 opacity-10 dark:opacity-18"
          style={{ transform: `translate3d(${mx * -12}px, ${my * -9}px, 0)` }}
        />

        {/* star dots */}
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 18px 26px, rgba(255,255,255,0.85) 40%, transparent 41%),
              radial-gradient(1.5px 1.5px at 120px 84px, rgba(255,255,255,0.8) 40%, transparent 41%),
              radial-gradient(1px 1px at 220px 160px, rgba(255,255,255,0.75) 40%, transparent 41%)
            `,
            backgroundSize: "260px 260px"
          }}
        />
      </div>

      {/* контент поверх фона */}
      <div className="relative z-10">
        <div className="relative px-6 py-10 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6
                         border border-slate-200 bg-white text-indigo-700
                         dark:border-white/10 dark:bg-white/5 dark:text-indigo-200"
            >
              <Heart className="w-4 h-4" />
              MHELPER GTA5RP
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900 dark:text-white">
              ТВОЙ ДОСТУП К ИНСТРУМЕНТАМ
            </h1>
          </motion.div>
        </div>

        <div className="relative px-6">
          <div className="max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm font-semibold uppercase tracking-wider mb-6 text-slate-400 dark:text-slate-500"
            >
              Инструменты
            </motion.h2>

            <div className="grid gap-4">
              {tools.map((tool, index) => (
                <motion.div
                  key={tool.title}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.06 }}
                >
                  <Link to={createPageUrl(tool.page)} className="block">
                    <div
                      className="group relative rounded-2xl border p-6 select-none
                                 bg-white border-slate-200
                                 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40
                                 hover:-translate-y-[2px] hover:scale-[1.01]
                                 dark:bg-slate-950/35 dark:border-white/10
                                 dark:hover:border-white/20 dark:hover:shadow-black/35
                                 transition-all duration-300"
                    >
                      {/* subtle shine */}
                      <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-[0.10]
                                    rounded-2xl transition-opacity duration-300`}
                      />

                      <div className="relative flex items-start gap-4">
                        <div
                          className={`${tool.iconBg} p-3 rounded-xl border border-transparent
                                      group-hover:scale-110 transition-transform duration-300`}
                        >
                          <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2 text-slate-900 dark:text-white">
                            {tool.title}
                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          </h3>

                          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {tool.description}
                          </p>

                          <div className="mt-3 flex items-center gap-2">
                            <div
                              className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-xl
                                         border border-slate-200 bg-white
                                         dark:border-white/10 dark:bg-white/5
                                         text-slate-600 dark:text-slate-300"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              {tool.tag}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Floating Discord button (smart hide/show + pulse) */}
      <motion.div
        initial={false}
        animate={{
          opacity: showDiscord ? 1 : 0,
          y: showDiscord ? 0 : 14,
          pointerEvents: showDiscord ? "auto" : "none"
        }}
        transition={{ duration: 0.18 }}
        className="fixed right-6 bottom-24 md:bottom-6 z-[90]"
      >
        {/* pulse rings */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl"
          initial={{ opacity: 0.45, scale: 1 }}
          animate={{ opacity: [0.45, 0, 0.45], scale: [1, 1.28, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 0 0 rgba(99,102,241,0.35)" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl"
          initial={{ opacity: 0.25, scale: 1 }}
          animate={{ opacity: [0.25, 0, 0.25], scale: [1, 1.45, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 0 0 rgba(236,72,153,0.25)" }}
        />

        <motion.a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="group relative inline-flex items-center gap-3 px-5 py-4 rounded-3xl
                     bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white
                     shadow-2xl shadow-indigo-500/25 border border-white/10
                     backdrop-blur select-none"
          title="Присоединиться к Discord"
        >
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-white/10 border border-white/10">
            <MessageCircle className="w-5 h-5" />
          </span>

          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">Discord</div>
            <div className="text-xs text-white/80">Присоединиться</div>
          </div>

          {/* tooltip */}
          <div
            className="pointer-events-none absolute -top-12 right-0 opacity-0 translate-y-2
                       group-hover:opacity-100 group-hover:translate-y-0
                       transition-all duration-200"
          >
            <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur px-3 py-2 text-xs text-white/80 shadow-xl">
              Нажми — откроется Discord
            </div>
          </div>
        </motion.a>
      </motion.div>
    </div>
  );
}
