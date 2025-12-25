import React, { useMemo } from "react";

export default function HolidayLights({ enabled = true }) {
  if (!enabled) return null;

  // Увеличили количество для плотности
  const bulbs = useMemo(() => Array.from({ length: 32 }), []);
  const snowflakes = useMemo(() => Array.from({ length: 25 }), []);

  const colors = [
    "rgba(255, 60, 60, 0.95)",   // Red
    "rgba(40, 220, 100, 0.95)",  // Emerald
    "rgba(255, 200, 50, 0.95)",  // Warm Gold
    "rgba(60, 150, 255, 0.95)",  // Blue
    "rgba(255, 255, 255, 0.98)", // Pure Ice
  ];

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-[50] h-40 overflow-hidden select-none">
      {/* Мягкая подсветка сверху */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-60" />

      {/* Провод с более мелкими изгибами */}
      <svg
        className="absolute left-[-1%] right-[-1%] top-[-10px] w-[102%] h-16"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,15 Q75,90 150,15 T300,15 T450,15 T600,15 T750,15 T900,15 T1050,15 T1200,15"
          fill="none"
          stroke="#0f1a0f"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Маленькие лампочки (Micro-LED style) */}
      {bulbs.map((_, i) => {
        const color = colors[i % colors.length];
        const leftPos = (i * 3.1) + 1;
        const isLow = i % 2 === 1;

        return (
          <div
            key={`bulb-${i}`}
            className="absolute flex flex-col items-center"
            style={{
              left: `${leftPos}%`,
              top: isLow ? '38px' : '18px',
              animation: `swing ${2.5 + (i % 3)}s ease-in-out infinite alternate`,
              transformOrigin: 'top center',
            }}
          >
            <div className="w-1.5 h-2.5 bg-[#1a2e1a] rounded-t-sm" />
            <div
              className="mini-bulb"
              style={{
                "--bulb-c": color,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${1.5 + (i % 2)}s`,
              }}
            />
          </div>
        );
      })}

      {/* Бесшовный цикл снежинок */}
      {snowflakes.map((_, i) => {
        const duration = 7 + Math.random() * 8;
        const delay = Math.random() * -15; // Отрицательная задержка, чтобы они уже падали при загрузке
        return (
          <div
            key={`snow-${i}`}
            className="snowflake-container"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            <span 
              className="snowflake-item"
              style={{ fontSize: `${8 + Math.random() * 10}px` }}
            >
              ❄
            </span>
          </div>
        );
      })}

      <style>{`
        .mini-bulb {
          width: 10px;
          height: 14px;
          border-radius: 50% 50% 50% 50% / 70% 70% 30% 30%;
          background: var(--bulb-c);
          box-shadow: 
            0 0 10px var(--bulb-c),
            0 0 20px var(--bulb-c);
          animation: twinkle-pulse infinite ease-in-out;
        }

        @keyframes twinkle-pulse {
          0%, 100% { opacity: 0.7; filter: brightness(0.8) scale(0.95); }
          50% { opacity: 1; filter: brightness(1.3) scale(1.05); box-shadow: 0 0 15px var(--bulb-c), 0 0 25px var(--bulb-c); }
        }

        @keyframes swing {
          from { transform: rotate(-4deg); }
          to { transform: rotate(4deg); }
        }

        /* Контейнер для снежинок с зацикленным падением */
        .snowflake-container {
          position: absolute;
          top: -20px;
          animation: fall-loop linear infinite;
          will-change: transform;
        }

        .snowflake-item {
          display: block;
          color: white;
          opacity: 0.6;
          animation: snow-sway 3s ease-in-out infinite alternate, snow-fade 1s linear infinite alternate;
        }

        @keyframes fall-loop {
          0% { transform: translateY(-5vh); }
          100% { transform: translateY(110vh); }
        }

        /* Плавное появление и исчезновение, чтобы не было резких границ */
        @keyframes snow-fade {
          0% { opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.7; }
          100% { opacity: 0; }
        }

        @keyframes snow-sway {
          from { transform: translateX(-15px) rotate(0deg); }
          to { transform: translateX(15px) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}