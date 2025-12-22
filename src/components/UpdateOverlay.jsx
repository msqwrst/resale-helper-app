import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function safeAPI() {
  return typeof window !== "undefined" && window.appAPI?.update ? window.appAPI.update : null;
}

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
  const [stage, setStage] = useState("idle"); // idle | checking | available | downloaded | error

  useEffect(() => {
    if (!api) return;

    let unsubscribers = [];

    const trySub = (maybeUnsub) => {
      if (typeof maybeUnsub === "function") unsubscribers.push(maybeUnsub);
    };

    // 1) Подтягиваем policy/версию
    api
      .getPolicy?.()
      .then((res) => {
        if (!res) return;

        const nb = Boolean(res.needBlock);
        setPolicy(res.policy || null);
        setNeedBlock(nb);
        needBlockRef.current = nb;
        setCurrent(res.current || null);

        // Если force=true и версия ниже minVersion — сразу проверяем обновы
        if (nb) {
          setOpen(true);
          setStage("checking");
          api.check?.();
        }
      })
      .catch(() => {});

    // 2) Слушаем апдейтер события
    // Если твой preload возвращает функцию отписки — мы её сохраним.
    // Если нет — тоже ок (cleanup просто будет пустым).
    trySub(
      api.onChecking?.(() => {
        setError(null);
        setStage("checking");
        if (needBlockRef.current) setOpen(true);
      })
    );

    trySub(
      api.onAvailable?.((info) => {
        setAvailableInfo(info || null);
        setDownloadedInfo(null);
        setError(null);
        setStage("available");
        setOpen(true);
      })
    );

    trySub(
      api.onDownloaded?.((info) => {
        setDownloadedInfo(info || null);
        setError(null);
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
        setStage("idle");

        // если не force — закрываем
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

    // 3) Автопроверка на старте
    const t = setTimeout(() => api.check?.(), 1200);

    return () => {
      clearTimeout(t);
      // Если есть функции отписки — вызовем
      unsubscribers.forEach((fn) => {
        try {
          fn();
        } catch {}
      });
    };
  }, [api]);

  const title = needBlock ? "Требуется обновление" : "Доступно обновление";

  const subtitle = (() => {
    if (stage === "checking") return "Проверяем обновления…";
    if (stage === "available") return `Найдена версия ${availableInfo?.version || ""}. Скачиваем…`;
    if (stage === "downloaded")
      return `Версия ${downloadedInfo?.version || availableInfo?.version || ""} готова к установке.`;
    if (stage === "error") return "Ошибка обновления";
    return "";
  })();

  const message = needBlock
    ? policy?.message || "Чтобы продолжить, нужно установить обновление."
    : "Рекомендуем установить обновление для новых функций и фиксов.";

  const canContinue = !needBlock; // если не force — можно закрыть

  const onInstall = () => {
    try {
      api.install?.();
    } catch (e) {
      setError(String(e));
      setStage("error");
      setOpen(true);
    }
  };

  const onClose = () => {
    if (needBlockRef.current) return;
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(2, 6, 23, 0.78)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{
              width: "min(560px, 96vw)",
              borderRadius: 22,
              padding: 22,
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(148,163,184,0.18)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <motion.div
                animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
                transition={{ duration: 0.6 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800 }}>!</div>
              </motion.div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>{title}</div>
                <div style={{ fontSize: 13, opacity: 0.8, color: "rgb(226 232 240)" }}>{subtitle}</div>
              </div>

              {canContinue && (
                <button
                  onClick={onClose}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(148,163,184,0.25)",
                    color: "rgb(226 232 240)",
                    borderRadius: 12,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  Закрыть
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                color: "rgb(226 232 240)",
                opacity: 0.9,
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              {message}
              {current && policy?.minVersion && needBlock && (
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                  Текущая версия: {current} • Минимальная: {policy.minVersion}
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 14,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgb(254 226 226)",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              {!needBlock && (
                <button
                  onClick={() => api.check?.()}
                  style={{
                    borderRadius: 14,
                    padding: "10px 14px",
                    background: "rgba(148,163,184,0.10)",
                    border: "1px solid rgba(148,163,184,0.22)",
                    color: "rgb(226 232 240)",
                    cursor: "pointer",
                  }}
                >
                  Проверить
                </button>
              )}

              <button
                onClick={onInstall}
                disabled={stage !== "downloaded" && !needBlock}
                style={{
                  borderRadius: 14,
                  padding: "10px 14px",
                  background: "rgba(34,197,94,0.18)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  color: "white",
                  cursor: "pointer",
                  opacity: stage !== "downloaded" && !needBlock ? 0.55 : 1,
                }}
              >
                Установить и перезапустить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
