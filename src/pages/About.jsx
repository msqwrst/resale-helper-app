import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Timer,
  Calculator,
  Sparkles,
  Github,
  Heart,
  Info,
  Shield,
  Crown,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { fetchMe } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Card({ icon: Icon, title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-black/30 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        </div>
        <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</div>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

function parseVipUntil(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function statusFromMe(me) {
  const role = String(me?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isGold = role === "gold";
  const vipUntil = parseVipUntil(me?.vip_until);
  const vipByDate = vipUntil ? vipUntil.getTime() > Date.now() : false;
  // ✅ GOLD = VIP по доступам
  const isVip = isAdmin || role === "vip" || role === "gold" || !!me?.vip_active || vipByDate;

  const kind = isAdmin ? "admin" : isGold ? "gold" : isVip ? "vip" : "free";
  const label = isAdmin ? "ADMIN" : isGold ? "GOLD" : isVip ? "VIP" : "FREE";

  return { kind, label, isAdmin, isVip, isGold, vipUntil };
}

function StatusBadge({ me }) {
  const { kind, label, vipUntil, isAdmin } = useMemo(() => statusFromMe(me), [me]);

  const dot =
    kind === "admin"
      ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]"
      : kind === "gold"
        ? "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]"
        : kind === "vip"
          ? "bg-fuchsia-500 shadow-[0_0_18px_rgba(217,70,239,0.55)]"
        : "bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.35)]";

  const Icon = kind === "admin" ? Shield : kind === "vip" || kind === "gold" ? Crown : Info;

  return (
    <div className="mt-5 inline-flex flex-wrap items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/70 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-sm font-semibold">
        Активный статус: <span className="font-extrabold">{label}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/30">
        <Icon className="w-3.5 h-3.5" />
        {kind === "admin" ? "Полный доступ" : kind === "vip" || kind === "gold" ? "Доступ к ИИ" : "Базовый доступ"}
      </span>
      {vipUntil && !isAdmin ? (
        <span className="hidden sm:inline ml-1 text-xs opacity-70">(до {vipUntil.toLocaleString()})</span>
      ) : null}
    </div>
  );
}

export default function About() {
  const location = useLocation();

  const [me, setMe] = useState(null);

  const [vipCode, setVipCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null); // { type: "ok"|"err", text }
  const [meLoading, setMeLoading] = useState(false);

  // highlight/focus when redirected from modal
  const [flashRedeem, setFlashRedeem] = useState(false);
  const redeemWrapRef = useRef(null);
  const redeemInputRef = useRef(null);

  async function loadMe() {
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

  async function redeem() {
    const code = String(vipCode || "").trim().toUpperCase();
    setRedeemMsg(null);
    if (!code) {
      setRedeemMsg({ type: "err", text: "Введи VIP-код." });
      return;
    }
    setRedeemLoading(true);
    try {
      await api("/redeem", { method: "POST", body: JSON.stringify({ code }) });
      setVipCode("");
      setRedeemMsg({ type: "ok", text: "VIP успешно активирован ✅" });
      await loadMe();
    } catch (e) {
      const msg = String(e?.message || "");
      let nice = msg;
      if (msg.includes("BAD_CODE")) nice = "Неверный VIP-код.";
      else if (msg.includes("CODE_EXPIRED")) nice = "Код истёк.";
      else if (msg.includes("CODE_LIMIT")) nice = "Код уже использован.";
      else if (msg.includes("NO_TOKEN")) nice = "Нужно войти в аккаунт.";
      setRedeemMsg({ type: "err", text: nice || "Не удалось активировать VIP." });
    } finally {
      setRedeemLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ если пришли с /about?redeem=1 — подсветить и сфокусировать инпут
  useEffect(() => {
    const sp = new URLSearchParams(location.search || "");
    const need = sp.get("redeem") === "1";
    if (!need) return;

    // scroll + focus
    setTimeout(() => {
      redeemWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      redeemInputRef.current?.focus?.();
      setFlashRedeem(true);
      setTimeout(() => setFlashRedeem(false), 1000);
    }, 60);
  }, [location.search]);

  const items = [
    {
      icon: Star,
      title: "BP",
      text: "Фарм-лист с быстрыми отметками, подсчётом BP и сохранением прогресса на устройстве."
    },
    {
      icon: Timer,
      title: "Таймер",
      text: "Обратный отсчёт для объявлений/аукционов/напоминаний. Пресеты, история и уведомления."
    },
    {
      icon: Calculator,
      title: "Калькулятор",
      text: "Записывай доходы и расходы: материалы, комиссия, доставка — всё что угодно. Итог считается сам."
    }
  ];

  return (
  <div className="pb-24 transition-colors overflow-hidden">
      <div className="relative overflow-hidden px-6 py-10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-200/50 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200 rounded-full text-sm font-semibold border border-indigo-100 dark:border-indigo-500/20">
            <Heart className="w-4 h-4" />
            MHELPER GTA5RP
          </div>

          <h1 className="mt-5 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            О приложении
          </h1>

          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-xl">
            Набор инструментов для перепродажи и фарма BP — быстрый, аккуратный и приятный UI, который работает оффлайн
            и запоминает настройки.
          </p>

          <StatusBadge me={me} />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {items.map((it, idx) => (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.06 }}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 backdrop-blur p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <it.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  <div className="font-bold text-slate-900 dark:text-slate-50">{it.title}</div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{it.text}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="px-6">
        <div className="max-w-2xl mx-auto grid gap-4">
          {/* VIP redeem (ТОЛЬКО ТУТ) */}
          <div ref={redeemWrapRef}>
            <Card icon={KeyRound} title="Активировать VIP">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Введи VIP-код, который тебе выдал админ. После активации откроется вкладка <span className="font-semibold">AI</span>.
              </div>

              <div
                className={[
                  "mt-3 rounded-3xl p-3 border transition",
                  flashRedeem
                    ? "border-amber-300 bg-amber-50/70 dark:border-amber-400/40 dark:bg-amber-500/10 shadow-[0_0_0_6px_rgba(251,191,36,0.20)]"
                    : "border-transparent"
                ].join(" ")}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    ref={redeemInputRef}
                    value={vipCode}
                    onChange={(e) => setVipCode(e.target.value)}
                    placeholder="VIP-XXXX-XXXX"
                    className={[
                      "rounded-2xl",
                      "bg-white/80 dark:bg-black/30",          // ✅ убираем белый «бар» + норм в dark
                      "border border-slate-200/70 dark:border-white/15",
                      "text-slate-900 dark:text-white",        // ✅ текст всегда виден
                      "placeholder:text-slate-400 dark:placeholder:text-white/35",
                      "focus-visible:ring-2 focus-visible:ring-indigo-500/40",
                      "focus-visible:border-indigo-400/50"
                    ].join(" ")}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") redeem();
                    }}
                  />
                  <Button onClick={redeem} disabled={redeemLoading} className="rounded-2xl gap-2">
                    {redeemLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Активирую...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Активировать
                      </>
                    )}
                  </Button>


                </div>

                {redeemMsg ? (
                  <div
                    className={`mt-3 rounded-2xl border p-3 text-sm ${redeemMsg.type === "ok"
                      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                      : "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200"
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      {redeemMsg.type === "ok" ? (
                        <CheckCircle2 className="w-4 h-4 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                      )}
                      <div>{redeemMsg.text}</div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Если статус не обновился — нажми “Обновить статус” или перезайди в приложение.
                </div>
              </div>
            </Card>
          </div>

          <Card icon={Info} title="FAQ">
            <ul className="list-disc pl-5 space-y-4">
              <li>
                <div className="font-semibold">Можно ли сбросить прогресс?</div>
                <div className="ml-4 text-slate-600 dark:text-slate-300">Да — на страницах есть кнопки сброса.</div>
              </li>
              <li>
                <div className="font-semibold">Почему вкладка AI закрыта?</div>
                <div className="ml-4 text-slate-600 dark:text-slate-300">
                  AI доступен только для VIP / PROMO / ADMIN. Активируй код выше и обнови статус.
                </div>
              </li>
            </ul>
          </Card>

          <Card icon={Heart} title="Поддержка">
            <ul className="list-disc pl-5 space-y-4">
              <li>
                <div className="font-semibold">Нашёл баг или есть идеи?</div>
                <div className="ml-4 text-slate-600 dark:text-slate-300">
                  Напиши админу или скинь скрин/видео — так мы быстрее починим.
                </div>
              </li>
              <li>
                <div className="font-semibold">Хочешь фичу?</div>
                <div className="ml-4 text-slate-600 dark:text-slate-300">
                  Предложи — если полезно большинству, добавим.
                </div>
              </li>
            </ul>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="rounded-2xl gap-2"
                type="button"
                onClick={() => window.open("https://discord.gg/GESqaKKFty", "_blank")}
              >
                <Github className="w-4 h-4" />
                DISCORD
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl gap-2"
                type="button"
                onClick={loadMe}
              >
                <RefreshCw className={`w-4 h-4 ${meLoading ? "animate-spin" : ""}`} />
                Проверить статус
              </Button>
            </div>
          </Card>
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 select-none">
            <div className="font-semibold tracking-wide uppercase">Developers</div>
            <div className="mt-1 space-x-2">
              <span className="font-medium">mobsioff</span>
              <span>•</span>
              <span className="font-medium">babayqa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
