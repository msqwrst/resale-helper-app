import React, { useEffect, useMemo } from "react";

export default function SeasonalEffects({ enabled = true, count = 24 }) {
  const flakes = useMemo(() => {
    // фиксируем снежинки, чтобы не пересоздавались каждый рендер
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100; // %
      const size = 6 + Math.random() * 10; // px
      const duration = 8 + Math.random() * 10; // s
      const delay = Math.random() * 8; // s
      const drift = (Math.random() * 40 - 20); // px
      const opacity = 0.35 + Math.random() * 0.45;

      return { id: i, left, size, duration, delay, drift, opacity };
    });
  }, [count]);

  useEffect(() => {
    if (!enabled) return;
    // уважим "reduce motion"
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      // если у человека отключены анимации — можно вообще не показывать
      // или показывать статично (сейчас просто ничего не делаем)
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      {/* мягкий верхний glow */}
      <div className="absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-white/30 to-transparent" />

      {flakes.map((f) => (
        <span
          key={f.id}
          className="absolute -top-10 select-none"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
            animation: `snow-fall ${f.duration}s linear ${f.delay}s infinite`,
            transform: `translateX(${f.drift}px)`,
          }}
        >
          ❄️
        </span>
      ))}

      <style>{`
        @keyframes snow-fall {
          0% { transform: translate3d(0, -20px, 0); }
          100% { transform: translate3d(0, calc(100vh + 80px), 0); }
        }
      `}</style>
    </div>
  );
}
