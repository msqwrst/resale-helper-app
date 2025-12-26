import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, CheckCircle2, AlertTriangle } from "lucide-react";

function safeAPI() {
  if (typeof window !== "undefined" && window.appAPI?.update) return window.appAPI.update;
  if (typeof window !== "undefined" && window.updater) return window.updater;
  return null;
}

const fmtVer = (info) => {
  const v = info?.version || info?.updateInfo?.version;
  return v ? `v${v}` : "";
};

export default function UpdateToast() {
  const api = useMemo(() => safeAPI(), []);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("idle"); // idle | downloading | downloaded | error
  const [info, setInfo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const forceRef = useRef(false);

  useEffect(() => {
    if (!api) return;

    api.getPolicy?.().then((r) => {
      forceRef.current = Boolean(r?.needBlock);
    });

    const unsubs = [];

    unsubs.push(
      api.onAvailable?.((i) => {
        if (forceRef.current) return;
        setInfo(i || null);
        setStage("downloading");
        setOpen(true);
      })
    );

    unsubs.push(
      api.onProgress?.((p) => {
        if (forceRef.current) return;
        setProgress(p || null);
        setStage("downloading");
        setOpen(true);
      })
    );

    unsubs.push(
      api.onDownloaded?.((i) => {
        if (forceRef.current) return;
        setInfo(i || info);
        setStage("downloaded");
        setOpen(true);
      })
    );

    unsubs.push(
      api.onError?.((msg) => {
        if (forceRef.current) return;
        setError(String(msg || "UPDATE_ERROR"));
        setStage("error");
        setOpen(true);
      })
    );

    return () => unsubs.forEach((u) => u && u());
  }, [api]);

  if (!api || !open) return null;

  const pct =
    typeof progress?.percent === "number"
      ? Math.max(0, Math.min(100, progress.percent)).toFixed(0)
      : null;

  const title =
    stage === "downloaded"
      ? "Обновление готово"
      : stage === "downloading"
      ? "Скачивается обновление…"
      : "Ошибка обновления";

  const subtitle =
    stage === "downloaded"
      ? `Готово к установке ${fmtVer(info)}`
      : stage === "downloading"
      ? `${fmtVer(info)} ${pct ? `• ${pct}%` : ""}`
      : error;

  const Icon =
    stage === "downloaded" ? CheckCircle2 : stage === "error" ? AlertTriangle : Download;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        className="fixed right-4 bottom-24 z-[99998] w-[360px] max-w-[90vw]"
      >
        <div className="rounded-3xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl p-4">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white">{title}</div>
              <div className="text-xs text-white/70 mt-0.5">{subtitle}</div>

              {stage === "downloading" && (
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${pct || 30}%` }}
                  />
                </div>
              )}

              {stage === "downloaded" && (
                <button
                  onClick={() => api.install?.()}
                  className="mt-3 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 transition"
                >
                  Перезапустить и обновить
                </button>
              )}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
