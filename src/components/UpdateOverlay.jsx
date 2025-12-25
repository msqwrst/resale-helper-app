import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight
} from "lucide-react";

function safeAPI() {
  return typeof window !== "undefined" && window.appAPI?.update ? window.appAPI.update : null;
}

const fmtPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${Math.max(0, Math.min(100, n)).toFixed(0)}%`;
};

export default function UpdateOverlay() {
  const api = useMemo(() => safeAPI(), []);

  const [open, setOpen] = useState(false);

  const [policy, setPolicy] = useState(null);
  const [needBlock, setNeedBlock] = useState(false);
  const needBlockRef = useRef(false);

  const [current, setCurrent] = useState(null);

  const [availableInfo, setAvailableInfo] = useState(null);
  const [downloadedInfo, setDownloadedInfo] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("idle"); // idle | checking | available | downloading | downloaded | error
  const [progress, setProgress] = useState(null); // { percent, transferred, total, bytesPerSecond }
  const [busy, setBusy] = useState(false);

  // Close on ESC (если не force)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (!needBlockRef.current) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!api) return;

    let unsubscribers = [];
    const trySub = (maybeUnsub) => {
      if (typeof maybeUnsub === "function") unsubscribers.push(maybeUnsub);
    };

    // 1) policy/версия
    api
      .getPolicy?.()
      .then((res) => {
        if (!res) return;
        const nb = Boolean(res.needBlock);
        setPolicy(res.policy || null);
        setNeedBlock(nb);
        needBlockRef.current = nb;
        setCurrent(res.current || null);

        // Если force=true — сразу показываем и проверяем
        if (nb) {
          setOpen(true);
          setError(null);
          setStage("checking");
          api.check?.();
        }
      })
      .catch(() => {});

    // 2) updater events
    trySub(
      api.onChecking?.(() => {
        setError(null);
        setProgress(null);
        setStage("checking");
        if (needBlockRef.current) setOpen(true);
      })
    );

    trySub(
      api.onAvailable?.((info) => {
        setAvailableInfo(info || null);
        setDownloadedInfo(null);
        setError(null);
        setProgress(null);

        // Если у тебя autoDownload=true, то можно сразу визуально показать "скачиваем"
        setStage("downloading");
        setOpen(true);
      })
    );

    // progress (если твой preload это прокидывает — супер; если нет, просто игнор)
    trySub(
      api.onProgress?.((p) => {
        setProgress(p || null);
        setStage("downloading");
        if (needBlockRef.current) setOpen(true);
        else setOpen(true);
      })
    );

    trySub(
      api.onDownloaded?.((info) => {
        setDownloadedInfo(info || null);
        setError(null);
        setProgress((prev) => prev || { percent: 100 });
        setStage("downloaded");
        setOpen(true);

        // Если force update — ставим сразу
        if (needBlockRef.current) {
          setTimeout(() => api.install?.(), 600);
        }
      })
    );

    trySub(
      api.onNone?.(() => {
        setError(null);
        setProgress(null);
        setStage("idle");
        if (!needBlockRef.current) setOpen(false);
      })
    );

    trySub(
      api.onError?.((msg) => {
        setError(String(msg || "Update error"));
        setStage("error");
        setOpen(true);
      })
    );

    // 3) автопроверка на старте
    const t = setTimeout(() => api.check?.(), 1200);

    return () => {
      clearTimeout(t);
      unsubscribers.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  }, [api]);

  const isForce = needBlock;
  const vAvail = availableInfo?.version || downloadedInfo?.version || "";
  const vCurr = current || "";

  const title = isForce ? "Требуется обновление" : "Доступно обновление";
  const subtitle =
    stage === "checking"
      ? "Проверяем обновления…"
      : stage === "downloading"
      ? `Скачиваем ${vAvail ? `v${vAvail}` : "обновление"}…`
      : stage === "downloaded"
      ? `Готово к установке ${vAvail ? `v${vAvail}` : ""}`
      : stage === "error"
      ? "Не удалось обновиться"
      : "";

  const message = isForce
    ? policy?.message || "Чтобы продолжить, нужно установить обновление."
    : "Рекомендуем установить обновление — новые функции, фиксы и улучшения стабильности.";

  const pct = fmtPct(progress?.percent);
  const canClose = !isForce;
  const canInstall = stage === "downloaded" || isForce;
  const canDownload = stage === "available" || stage === "downloading";

  const onClose = () => {
    if (!canClose) return;
    setOpen(false);
  };

  const onCheck = async () => {
    if (!api?.check) return;
    if (busy) return;
    setBusy(true);
    try {
      setError(null);
      setProgress(null);
      setStage("checking");
      await api.check?.();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!api?.download) return;
    if (busy) return;
    setBusy(true);
    try {
      setError(null);
      setStage("downloading");
      setOpen(true);
      await api.download?.();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const onInstall = async () => {
    if (!api?.install) return;
    if (busy) return;
    setBusy(true);
    try {
      api.install?.();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
      setOpen(true);
      setBusy(false);
    }
  };

  const Icon = stage === "error" ? AlertTriangle : isForce ? ShieldAlert : Sparkles;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="update-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          onMouseDown={(e) => {
            // click-outside closes only if not forced
            if (e.target === e.currentTarget && canClose) setOpen(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl" />

          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />

          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl"
          >
            {/* Top gradient border */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

            {/* Header */}
            <div className="relative flex items-start gap-4 p-6">
              <div className="relative">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon className="h-6 w-6 text-amber-200" />
                </div>
                {stage === "downloading" && (
                  <div className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-slate-950/80">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-200" />
                  </div>
                )}
                {stage === "downloaded" && (
                  <div className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full border border-white/10 bg-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold tracking-tight text-white">
                    {title}
                  </h3>
                  {vAvail && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      v{vAvail}
                    </span>
                  )}
                  {isForce ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                      Обязательно
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                      Рекомендуется
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-200/80">{subtitle}</p>

                <p className="mt-4 text-sm leading-relaxed text-slate-100/90">
                  {message}
                </p>

                {(vCurr || policy?.minVersion) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200/70">
                    {vCurr && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        Текущая: {vCurr}
                      </span>
                    )}
                    {policy?.minVersion && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        Мин.: {policy.minVersion}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {canClose && (
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="Закрыть"
                  title="Закрыть"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Progress */}
            {(stage === "downloading" || stage === "downloaded") && (
              <div className="relative px-6 pb-4">
                <div className="flex items-center justify-between text-xs text-slate-200/70">
                  <span>
                    {stage === "downloaded" ? "Загружено" : "Загрузка"}
                  </span>
                  <span>{pct || (stage === "downloaded" ? "100%" : "…")}</span>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width:
                        typeof progress?.percent === "number"
                          ? `${Math.max(2, Math.min(100, progress.percent))}%`
                          : stage === "downloaded"
                          ? "100%"
                          : "35%"
                    }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-300/80 via-emerald-300/70 to-sky-300/70"
                  />
                </div>

                {typeof progress?.bytesPerSecond === "number" && (
                  <div className="mt-2 text-xs text-slate-200/60">
                    Скорость: {(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-6 pb-4">
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-200" />
                    <div className="whitespace-pre-wrap break-words">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="relative flex flex-wrap items-center justify-end gap-2 border-t border-white/10 bg-slate-950/30 p-4">
              {!isForce && (
                <button
                  onClick={onCheck}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100/90 transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  Проверить
                </button>
              )}

              {/* Если autoDownload=true — кнопка "Скачать" всё равно полезна как "повторить загрузку" */}
              {canDownload && (
                <button
                  onClick={onDownload}
                  disabled={busy || stage === "downloaded"}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Скачать
                </button>
              )}

              <button
                onClick={onInstall}
                disabled={busy || !canInstall}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/15 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-400/20 disabled:opacity-60"
              >
                <span>Установить</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {!isForce && (
                <button
                  onClick={onClose}
                  disabled={busy}
                  className="ml-1 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-200/70 transition hover:text-white disabled:opacity-60"
                >
                  Позже
                </button>
              )}
            </div>

            {/* Subtle footer */}
            <div className="relative px-6 pb-5 text-[11px] text-slate-200/45">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Премиум‑обновление: быстрее, чище, безопаснее.
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
