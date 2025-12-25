import React from "react";

export default function AppBackground({ children, className = "" }) {
  return (
    <div className={["relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#05060a]", className].join(" ")}>
      {/* 🎄 ТЁМНЫЙ НОВОГОДНИЙ ФОН (как в Home) */}
      <div className="pointer-events-none absolute inset-0">
        {/* базовый градиент ночи */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-slate-50 dark:from-[#060713] dark:via-[#070b18] dark:to-[#030409]" />

        {/* мягкие “огни” */}
        <div
          className="absolute top-[-140px] left-1/2 -translate-x-1/2 w-[760px] h-[320px] rounded-full blur-[140px]
                     bg-gradient-to-r from-emerald-500 via-indigo-500 to-fuchsia-500
                     opacity-15 dark:opacity-25"
        />
        <div
          className="absolute bottom-[-220px] left-[-180px] w-[520px] h-[520px] rounded-full blur-[160px]
                     bg-emerald-500 opacity-10 dark:opacity-18"
        />
        <div
          className="absolute bottom-[-240px] right-[-160px] w-[560px] h-[560px] rounded-full blur-[170px]
                     bg-indigo-600 opacity-10 dark:opacity-18"
        />

        {/* ❄ снег */}
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 18px 26px, rgba(255,255,255,0.85) 40%, transparent 41%),
              radial-gradient(1.5px 1.5px at 120px 84px, rgba(255,255,255,0.8) 40%, transparent 41%),
              radial-gradient(1px 1px at 220px 160px, rgba(255,255,255,0.75) 40%, transparent 41%)
            `,
            backgroundSize: "260px 260px",
          }}
        />
      </div>

      {/* CONTENT */}
      <div className="relative">{children}</div>
    </div>
  );
}
