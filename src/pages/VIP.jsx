import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Lock,
  Shield,
  Sparkles,
  Bot,
  Send,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ================= Helpers ================= */

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function statusFromMe(me) {
  const role = String(me?.role || "").toLowerCase();
  const isStaff = role === "staff";
  const isAdmin = role === "admin";

  const vipUntil = parseDate(me?.vip_until);
  const vipByDate = vipUntil ? vipUntil.getTime() > Date.now() : false;

  const isVip = isAdmin || role === "vip" || !!me?.vip_active || vipByDate;
  return { role, isAdmin, isStaff, isVip, vipUntil };
}

async function callAssistant({ messages }) {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    if (!res.ok) throw new Error("BAD_RESPONSE");
    const data = await res.json();
    const reply = data?.reply ?? data?.message ?? "";
    if (!reply) throw new Error("EMPTY_REPLY");
    return reply;
  } catch {
    const last = [...messages].reverse().find((m) => m?.role === "user")?.content || "";
    return (
      "⚠️ Backend для AI не подключён.\n\n" +
      "Подключи endpoint POST /api/ai/chat и возвращай { reply: \"...\" }.\n\n" +
      "Твой запрос: " +
      last
    );
  }
}

/* ================= UI bits ================= */

function ChatBubble({ side = "bot", children }) {
  const isUser = side === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          "max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-relaxed border " +
          "shadow-[0_18px_60px_rgba(0,0,0,0.10)] ring-1 ring-black/5 dark:ring-white/10 " +
          (isUser
            ? "bg-white/70 dark:bg-slate-950/55 border-slate-200/70 dark:border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
            : "bg-gradient-to-b from-white/80 to-white/55 dark:from-slate-950/65 dark:to-slate-950/35 " +
              "border-slate-200/70 dark:border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100")
        }
      >
        {children}
      </div>
    </div>
  );
}

function Dots() {
  const dot = "w-1.5 h-1.5 rounded-full bg-slate-500/70 dark:bg-slate-300/70";
  return (
    <span className="inline-flex items-center gap-1">
      <motion.span
        className={dot}
        animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className={dot}
        animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: 0.15, ease: "easeInOut" }}
      />
      <motion.span
        className={dot}
        animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: 0.3, ease: "easeInOut" }}
      />
    </span>
  );
}

function TypewriterText({ text, speed = 12, onDone }) {
  const [out, setOut] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setOut("");
    if (!text) {
      onDone?.();
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, Math.max(7, speed));

    return () => clearInterval(t);
  }, [text, speed, onDone]);

  return <div className="whitespace-pre-wrap break-words">{out}</div>;
}

function PageBg() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* base */}
      <div className="absolute inset-0 bg-[#070b16]" />
      {/* mesh glows */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-fuchsia-500/12 blur-[90px]" />
      <div className="absolute top-12 -right-40 w-[520px] h-[520px] rounded-full bg-indigo-500/12 blur-[90px]" />
      <div className="absolute bottom-[-180px] left-[35%] w-[680px] h-[680px] rounded-full bg-cyan-500/10 blur-[110px]" />
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/35" />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px"
        }}
      />
    </div>
  );
}

/* ================= Page ================= */

export default function VIP() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [chatOpen, setChatOpen] = useState(true);

  const [chat, setChat] = useState(() => [
    {
      id: "hello",
      role: "assistant",
      content: "Привет! Я VIP AI-помощник. Напиши, что нужно 🙂"
    }
  ]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | thinking | typing

  const listRef = useRef(null);
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchMe();
      setMe(data);
    } catch {
      setMe(null);
      setErr("Не удалось проверить статус. Проверь интернет или авторизацию.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { role, isAdmin, isStaff, isVip, vipUntil } = useMemo(() => statusFromMe(me), [me]);

  const isGold = role === "gold";

  // 🔒 AI пока в разработке — доступ только ADMIN / STAFF
  const canUseAI = isAdmin;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.length, sending, phase, chatOpen]);

  // автофокус когда открыл чат
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus?.(), 220);
  }, [chatOpen]);

  const statusKind = isAdmin ? "admin" : isStaff ? "staff" : isGold ? "gold" : isVip ? "vip" : "free";
  const statusLabel = isAdmin ? "ADMIN" : isStaff ? "STAFF" : isGold ? "GOLD" : isVip ? "VIP" : "FREE";
  const expiryLine = isAdmin ? null : isVip && vipUntil ? `до ${vipUntil.toLocaleString()}` : null;

  const StatusPill = () => {
    const dot =
      statusKind === "admin"
        ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.55)]"
        : statusKind === "staff"
        ? "bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.55)]"
        : statusKind === "gold"
        ? "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]"
        : statusKind === "vip"
        ? "bg-fuchsia-500 shadow-[0_0_18px_rgba(217,70,239,0.55)]"
        : "bg-slate-400 shadow-[0_0_14px_rgba(148,163,184,0.35)]";

    return (
      <span className="inline-flex items-center gap-2 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white/90">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        {statusLabel}
        {expiryLine ? <span className="font-semibold opacity-80">• {expiryLine}</span> : null}
      </span>
    );
  };

  const inputTextClass =
    "rounded-2xl bg-white dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-500 dark:text-white/40 focus-visible:ring-2 focus-visible:ring-white/20";

  function addUserMessage(t) {
    const userMsg = {
      id: crypto.randomUUID?.() || String(Date.now()),
      role: "user",
      content: t
    };
    setChat((prev) => [...prev, userMsg]);
    return userMsg;
  }

  async function onSend(e) {
    e?.preventDefault?.();
    const t = String(text || "").trim();
    if (!t || sending || !canUseAI) return;

    setText("");
    setSending(true);
    setPhase("thinking");

    const userMsg = addUserMessage(t);
    const base = [...chat, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const reply = await callAssistant({ messages: base });

      const typingId = crypto.randomUUID?.() || String(Date.now() + 1);
      setChat((prev) => [
        ...prev,
        { id: typingId, role: "assistant", content: "", __typing: true, __full: String(reply || "") }
      ]);
      setPhase("typing");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus?.(), 0);
    }
  }

  function finishTyping(id) {
    setChat((prev) =>
      prev.map((m) => {
        if (m?.id !== id) return m;
        return { id: m.id, role: "assistant", content: m.__full || "" };
      })
    );
    setPhase("idle");
  }

  return (
    <div className="relative min-h-screen px-6">
      <PageBg />

      <div className="max-w-5xl mx-auto pb-10">
        {/* Header bar */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-5 shadow-[0_22px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-white/8 border border-slate-200 dark:border-white/12 flex items-center justify-center">
                <Crown className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  VIP <span className="text-slate-600 dark:text-white/60 font-semibold text-sm">AI помощник</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill />
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white/80 hover:bg-white dark:bg-white/10 transition"
                title="Обновить статус"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Обновить
              </button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-100 p-3 text-sm">
              {err}
            </div>
          ) : null}
        </motion.div>

        {/* Main grid */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4">
          {/* LEFT: AI box */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl shadow-[0_22px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/10 overflow-hidden">
            {/* Header of AI box */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold">
                <MessageSquare className="w-4 h-4" />
                AI чат
                {!canUseAI && (
                  <div className="ml-2 inline-flex items-center gap-2">
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-amber-300" />
                      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition
                                      text-[11px] whitespace-nowrap rounded-2xl border border-slate-200 dark:border-white/10 bg-black/75 px-2.5 py-1 text-slate-900 dark:text-white/90 shadow-lg">
                        Доступ только ADMIN / STAFF
                      </div>
                    </div>
                    <motion.span
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      className="text-[11px] font-semibold text-amber-200"
                    >
                      в разработке…
                    </motion.span>
                  </div>
                )}
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-2 py-0.5 text-[11px] text-slate-700 dark:text-white/70">
                  <Bot className="w-3.5 h-3.5" />
                  Assistant
                </span>
              </div>

              {/* ONE toggle button only */}
              <Button
                variant="outline"
                className="rounded-2xl border-slate-200 dark:border-white/12 bg-white dark:bg-white/5 text-slate-800 dark:text-white/80 hover:bg-white dark:bg-white/10"
                type="button"
                disabled={!canUseAI}
                onClick={() => setChatOpen((v) => !v)}
                title={chatOpen ? "Свернуть чат" : "Открыть чат"}
              >
                {chatOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {chatOpen ? (
                <motion.div
                  key="ai-open"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {/* messages */}
                  
                  <div className="relative">
                    {!canUseAI && (
                      <div className="absolute inset-0 z-10 rounded-3xl backdrop-blur-md bg-black/45 flex items-center justify-center px-6">
                        <div className="text-center">
                          <div className="mx-auto w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-amber-300" />
                          </div>
                          <div className="mt-3 text-slate-900 dark:text-white font-extrabold text-lg">AI в разработке</div>
                          <div className="mt-1 text-sm text-slate-700 dark:text-white/70">Доступно только ADMIN / STAFF</div>
                        </div>
                      </div>
                    )}
<div
                    ref={listRef}
                    className={"h-[56vh] min-h-[420px] max-h-[680px] overflow-auto px-4 py-4 space-y-3 " + (!canUseAI ? "opacity-60" : "")}
                  >
                    {chat.map((m) => {
                      const isTypingMsg = !!m.__typing;
                      if (!isTypingMsg) {
                        return (
                          <ChatBubble key={m.id} side={m.role === "user" ? "user" : "bot"}>
                            <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          </ChatBubble>
                        );
                      }
                      return (
                        <ChatBubble key={m.id} side="bot">
                          <TypewriterText
                            text={String(m.__full || "")}
                            speed={12}
                            onDone={() => finishTyping(m.id)}
                          />
                        </ChatBubble>
                      );
                    })}

                    {sending && phase === "thinking" ? (
                      <ChatBubble side="bot">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="font-medium">Думаю</span>
                          <Dots />
                        </div>
                      </ChatBubble>
                    ) : null}
                  </div>

                  
                  </div>

                  {/* input */}
                  <div className="px-4 pb-4">
                    <form onSubmit={onSend} className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={canUseAI ? "Напиши сообщение…" : "AI в разработке (только ADMIN / STAFF)"}
                        className={inputTextClass}
                        disabled={!canUseAI || sending}
                      />
                      <Button
                        className="rounded-2xl gap-2"
                        disabled={!canUseAI || sending || !String(text || "").trim()}
                        type="submit"
                      >
                        <Send className="w-4 h-4" />
                        Отправить
                      </Button>
                    </form>  
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="ai-closed"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="px-4 py-6"
                >
                  <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
                    <div className="text-slate-900 dark:text-white font-extrabold">AI чат свернут</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-white/55">
                      Нажми стрелку сверху, чтобы открыть.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Info box */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-4 shadow-[0_22px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <Shield className="w-4 h-4" />
              Доступ
            </div>

            <div className="mt-3 space-y-3 text-sm text-slate-800 dark:text-white/80">
              <div className="rounded-2xl border border-white/4 bg-white/4 p-3">
                <div className="font-semibold text-slate-900 dark:text-white/90">Статус:</div>
                <div className="mt-2">
                  <StatusPill />
                </div>
              </div>

              <div className="rounded-2xl border border-white/4 bg-white/4 p-3">
                <div className="font-semibold text-slate-900 dark:text-white/90">Что внутри VIP:</div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-900 dark:text-white/90">
                  <li>Отслеживание графика</li>
                  <li></li>
                  <li></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/4 bg-white/4 p-3">
                <div className="font-semibold text-slate-900 dark:text-white/90">В разработке:</div>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-700 dark:text-white/70">
                  <li>AI чат-помощник</li>
                  <li></li>
                  <li></li>
                </ul>
              </div>
              <div className="pt-1 flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  className="rounded-2xl border-slate-200 dark:border-white/12 bg-white dark:bg-white/5 text-slate-800 dark:text-white/80 hover:bg-white dark:bg-white/10"
                  onClick={() => navigate("/home")}
                  type="button"
                >
                  В Home
                </Button>
                <Button className="rounded-2xl" onClick={() => load()} type="button">
                  Проверить статус
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen lock overlay for FREE */}
        <AnimatePresence>
          {!loading && !isVip ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />

              <motion.div
                initial={{ y: 18, scale: 0.98, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 10, scale: 0.98, opacity: 0 }}
                className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/8 backdrop-blur-xl p-6 shadow-[0_22px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-slate-900 dark:text-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white">Только VIP</div>
                    <div className="mt-1 text-sm text-slate-900 dark:text-white/75">
                      Этот раздел доступен только VIP-пользователям. У тебя сейчас:{" "}
                      <span className="font-semibold">{role ? role.toUpperCase() : "FREE"}</span>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Button className="rounded-2xl gap-2" onClick={() => navigate("/home")} type="button">
                        В Home
                      </Button>

                      <Button
                        variant="outline"
                        className="rounded-2xl border-white/20 text-slate-900 dark:text-white hover:bg-white dark:bg-white/10"
                        onClick={() => load()}
                        type="button"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Обновить статус
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
