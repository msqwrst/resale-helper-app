import React, { useMemo, useState } from "react";
/**
 * ULTRA PREMIUM REGISTRATION/LOGIN UI
 * - Эффект Glassmorphism (матовое стекло)
 * - Анимированная живая подложка (Aurora Borealis)
 * - Интерактивные состояния кнопок
 */

const TG_URL = import.meta.env.VITE_TELEGRAM_BOT_URL;

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

async function loginByCodeDirect(code, note) {
  const res = await fetch(`${API_URL}/auth/tg/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, note: note || undefined })
  });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = { error: txt || "BAD_RESPONSE" }; }
  if (!res.ok || !data?.token) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  try { localStorage.setItem("auth_token", data.token); } catch {}
  return data;
}

function normalizeCode(raw) {
  const cleaned = (raw || "").toUpperCase().replace(/[^\dA-Z_-]/g, "").slice(0, 32);
  return cleaned;
}

export default function Login() {
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const pretty = useMemo(() => normalizeCode(code), [code]);
  const canSubmit = pretty.length >= 4 && !loading;

  async function submit(e) {
    e.preventDefault();
    setTouched(true);
    setErr("");

    const value = normalizeCode(code);
    if (value.length < 4) {
      setErr("Код слишком короткий (минимум 4 символа)");
      return;
    }

    setLoading(true);
    try {
      await loginByCodeDirect(value, note.trim());
location.href = "/home";
    } catch (e) {
      setErr(e?.message || "Ошибка входа. Проверьте код.");
    } finally {
      setLoading(false);
    }
  }

  const openTelegram = () => window.open(TG_URL, "_blank", "noopener,noreferrer");

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030407] text-slate-100 selection:bg-indigo-500/30">
      
      {/* СЛОЙ 1: Анимированный фон (Aurora) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px] animate-bounce [animation-duration:10s]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[440px]">
          
          {/* СЛОЙ 2: Верхний бейдж */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-indigo-300">
                Secure Access System
              </span>
            </div>
          </div>

          {/* СЛОЙ 3: Основная карточка */}
          <div className="relative group">
            {/* Свечение вокруг карточки при наведении */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[32px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            
            <form
              onSubmit={submit}
              className="relative bg-[#0a0c14]/80 border border-white/10 backdrop-blur-3xl rounded-[30px] p-8 shadow-2xl overflow-hidden"
            >
              {/* Декоративная полоса сверху */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                  Регистрация
                </h1>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                  Получите код в нашем боте для <br/> моментального входа в систему
                </p>
              </div>

              {/* Кнопка Телеграм */}
              <button
                type="button"
                onClick={openTelegram}
                className="w-full relative group/btn overflow-hidden rounded-2xl p-[1px] transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 transition-all" />
                <div className="relative bg-[#0a0c14] group-hover/btn:bg-transparent transition-colors rounded-2xl px-4 py-4 flex items-center justify-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-indigo-400 group-hover/btn:text-white transition-colors">
                    <path d="M21.9 3.3L3.9 10.4c-1.2.5-1.2 2.2.1 2.6l4.9 1.6 1.7 5.1c.4 1.3 2.1 1.3 2.6.1l7.1-18c.4-1.1-.7-2.2-1.8-1.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-semibold text-sm">Открыть Telegram</span>
                </div>
              </button>

              <div className="flex items-center gap-4 my-8">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ввод кода</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>

              {/* Поле ввода */}
              <div className="space-y-4">
                <div className="relative">
                  <input
                    value={pretty}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="КОД ИЗ БОТА"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-5 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-white/10 placeholder:tracking-normal placeholder:text-sm"
                  />
                  {pretty && (
                    <button 
                      type="button"
                      onClick={() => setCode("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Заметка / ключевые слова (опционально) */}
                <div className="relative">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ключевые слова (например: FamQ / GOLD / 30 дней)…"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all placeholder:text-white/15"
                  />
                  {note && (
                    <button
                      type="button"
                      onClick={() => setNote("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                      title="Очистить"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {err && (<div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs text-center animate-shake">
                    {err}
                  </div>
                )}
              </div>

              {/* Кнопка отправки */}
              <button
                disabled={!canSubmit}
                className={`mt-8 w-full py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg
                  ${canSubmit 
                    ? "bg-white text-black hover:shadow-white/10 hover:scale-[1.02] active:scale-95" 
                    : "bg-white/5 text-white/20 cursor-not-allowed"}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Проверка...
                  </span>
                ) : "Подтвердить регистрацию"}
              </button>
            </form>
          </div>

          {/* Футер */}
          <p className="mt-8 text-center text-slate-500 text-xs">
            Возникли проблемы? <span className="text-indigo-400 cursor-pointer hover:underline">Поддержка</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}