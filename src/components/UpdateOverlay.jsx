import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  RefreshCw,
  Sparkles,
  X,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

/**
 * Update overlay for electron-updater
 * - Non-forced updates can be snoozed ("Позже") without reopening instantly
 * - Avoids infinite "downloading" state when no progress events are coming
 * - Works with window.appAPI.update OR legacy window.updater
 */

function safeAPI() {
  if (typeof window === "undefined") return null;
  return window.appAPI?.update || window.updater || null;
}

const fmtPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${Math.max(0, Math.min(100, n)).toFixed(0)}%`;
};

const SNOOZE_KEY = "mhelper_update_snooze_until";
const nowMs = () => Date.now();
const getSnoozeUntil = () => {
  try {
    const v = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};
const setSnooze = (msFromNow) => {
  try {
    localStorage.setItem(SNOOZE_KEY, String(nowMs() + msFromNow));
  } catch {}
};
const clearSnooze = () => {
  try {
    localStorage.removeItem(SNOOZE_KEY);
  } catch {}
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
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const snoozedRef = useRef(false);

  const isForce = needBlock;

  const canClose = !isForce;
  const canDownload = stage === "available" || stage === "error";
  const canInstall = stage === "downloaded";

  const vAvail = availableInfo?.version || downloadedInfo?.version || "";
  const vCurr = current || "";

  const pct = fmtPct(progress?.percent);

  const title = isForce ? "Требуется обновление" : "Доступно обновление";
  const subtitle =
    stage === "checking"
      ? "Проверяем обновления…"
      : stage === "available"
        ? "Есть новая версия. Можно скачать в фоне или поставить сразу."
        : stage === "downloading"
          ? `Скачиваем ${vAvail ? `v${vAvail}` : "обновление"}…`
          : stage === "downloaded"
            ? "Готово! Можно установить."
            : stage === "error"
              ? "Ошибка обновления"
              : " ";

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

  // Init + subscribe updater events
  useEffect(() => {
    if (!api) return;

    const isSnoozed = () => !needBlockRef.current && getSnoozeUntil() > nowMs();

    // If snoozed — don't pop the overlay (but let updater do its thing in background)
    snoozedRef.current = isSnoozed();

    const unsubs = [];
    const sub = (maybeUnsub) => {
      if (typeof maybeUnsub === "function") unsubs.push(maybeUnsub);
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

        if (nb) {
          // force update -> always show
          clearSnooze();
          snoozedRef.current = false;
          setOpen(true);
          setError(null);
          setStage("checking");
          api.check?.();
        }
      })
      .catch(() => {});

    // 2) updater events
    sub(
      api.onChecking?.(() => {
        setError(null);
        setProgress(null);
        setStage("checking");
        if (needBlockRef.current) setOpen(true);
      })
    );

    sub(
      api.onAvailable?.((info) => {
        setAvailableInfo(info || null);
        setDownloadedInfo(null);
        setError(null);
        setProgress(null);

        // IMPORTANT: do NOT assume we're downloading until we get progress
        setStage("available");

        if (!isSnoozed()) {
          setOpen(true);
        }
      })
    );

    sub(
      api.onProgress?.((p) => {
        setProgress(p || null);
        setStage("downloading");

        if (needBlockRef.current) setOpen(true);
        else if (!isSnoozed()) setOpen(true);
      })
    );

    sub(
      api.onDownloaded?.((info) => {
        setDownloadedInfo(info || null);
        setError(null);
        setProgress((prev) => prev || { percent: 100 });
        setStage("downloaded");

        if (!isSnoozed()) setOpen(true);

        // If force update — ставим сразу
        if (needBlockRef.current) {
          setTimeout(() => api.install?.(), 600);
        }
      })
    );

    sub(
      api.onNone?.(() => {
        setError(null);
        setProgress(null);
        setStage("idle");
        if (!needBlockRef.current) setOpen(false);
      })
    );

    sub(
      api.onError?.((msg) => {
        setError(String(msg || "Update error"));
        setStage("error");
        if (!isSnoozed()) setOpen(true);
      })
    );

    // 3) автопроверка на старте
    const t = setTimeout(() => api.check?.(), 1200);

    return () => {
      clearTimeout(t);
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  }, [api]);

  // Anti-stuck: if we are "downloading" but no progress arrives for a while -> show as "available"
  useEffect(() => {
    if (stage !== "downloading") return;
    const startedAt = nowMs();
    const t = setInterval(() => {
      const stale = nowMs() - startedAt > 15000; // 15s no progress change
      const p = Number(progress?.percent);
      const noPct = !Number.isFinite(p);
      if (stale && noPct && stage === "downloading") {
        setStage("available");
      }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const onClose = () => {
    if (needBlockRef.current) return;
    setOpen(false);
  };

  const onLater = () => {
    if (needBlockRef.current) return;
    // Snooze 6 hours
    setSnooze(6 * 60 * 60 * 1000);
    snoozedRef.current = true;
    setOpen(false);
  };

  const onCheck = async () => {
    if (!api?.check) return;
    setBusy(true);
    setError(null);
    setStage("checking");
    clearSnooze(); // manual check should show UI
    snoozedRef.current = false;
    try {
      await api.check();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!api?.download) return;
    setBusy(true);
    setError(null);
    setStage("downloading");
    clearSnooze();
    snoozedRef.current = false;
    try {
      await api.download();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  const onInstall = async () => {
    if (!api?.install) return;
    setBusy(true);
    setError(null);
    try {
      await api.install();
    } catch (e) {
      setError(String(e?.message || e));
      setStage("error");
      setBusy(false);
    }
  };

  if (!api) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="updateOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-md flex items-center justify-center p-4"
          onMouseDown={() => {
            if (canClose) setOpen(false);
          }}
        >
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-950/95 to-slate-950/80 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/5 border border-white/10">
                    <Sparkles className="h-4 w-4 text-slate-100/80" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-white">{title}</div>
                    <div className="text-xs text-slate-200/70 mt-0.5">{subtitle}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-200/70">
                  {vCurr && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      Текущая: {vCurr}
                    </span>
                  )}
                  {vAvail && (
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-amber-100">
                      Новая: {vAvail}
                    </span>
                  )}
                  {policy?.minVersion && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                      Мин.: {policy.minVersion}
                    </span>
                  )}
                </div>
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
                  <span>{stage === "downloaded" ? "Загружено" : "Загрузка"}</span>
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
                            : "28%"
                    }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-300/80 via-emerald-300/70 to-sky-300/70"
                  />
                </div>
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
                  <RefreshCw className={`h-4 w-4 ${busy && stage === "checking" ? "animate-spin" : ""}`} />
                  Проверить
                </button>
              )}

              {canDownload && (
                <button
                  onClick={onDownload}
                  disabled={busy}
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
                title={canInstall ? "Установить и перезапустить" : "Сначала скачайте обновление"}
              >
                <ArrowRight className="h-4 w-4" />
                Установить
              </button>

              {!isForce && (
                <button
                  onClick={onLater}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/0 px-4 py-2 text-sm font-semibold text-slate-200/70 transition hover:bg-white/5 hover:text-slate-100 disabled:opacity-60"
                  title="Спрятать окно на несколько часов"
                >
                  Позже
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
