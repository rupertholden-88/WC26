"use client";

export default function Header() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="relative overflow-hidden border-b border-[#1a2d45]">
      {/* Pitch stripe background */}
      <div className="pitch-stripe absolute inset-0 pointer-events-none" />

      {/* Top accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-[#2d7a4f] via-[#3d9e68] to-[#2d7a4f]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[11px] font-medium tracking-[0.22em] text-[#3d9e68] uppercase mb-1">
            FIFA World Cup 2026
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[28px] sm:text-[36px] font-bold tracking-tight leading-none text-white">
            Morning{" "}
            <span className="text-[#f5a623]">Dashboard</span>
          </h1>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[11px] text-[#4a6a8a] uppercase tracking-widest font-medium">
            {today}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#3d9e68] inline-block" />
            <span className="text-[11px] text-[#3d9e68] font-medium tracking-wide">Live</span>
          </div>
        </div>
      </div>
    </header>
  );
}
