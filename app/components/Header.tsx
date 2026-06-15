"use client";

export default function Header() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  return (
    <header className="relative overflow-hidden border-b border-[#1a2d45]">
      {/* Ambient pitch stripes */}
      <div className="pitch-stripe absolute inset-0 pointer-events-none" />

      {/* Top accent — tri-colour bar like a broadcaster ident */}
      <div className="relative flex h-[4px]">
        <div className="flex-1 bg-[#2d7a4f]" />
        <div className="w-24 bg-[#f5a623]" />
        <div className="flex-1 bg-[#2d7a4f]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left — title block */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="trophy-glow text-[16px]">🏆</span>
              <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold
                             tracking-[0.28em] text-[#3d9e68] uppercase">
                FIFA World Cup 2026
              </p>
            </div>

            {/* Main title */}
            <h1 className="font-[family-name:var(--font-display)] leading-none">
              <span className="block text-[38px] sm:text-[48px] font-bold tracking-tight text-white">
                Morning
              </span>
              <span className="block text-[38px] sm:text-[48px] font-bold tracking-tight
                               text-transparent bg-clip-text"
                    style={{ backgroundImage: "linear-gradient(135deg, #f5a623 0%, #ffcc66 50%, #c47d10 100%)" }}>
                Dashboard
              </span>
            </h1>
          </div>

          {/* Right — date + live badge */}
          <div className="text-right shrink-0 pt-1">
            <p className="text-[10px] text-[#4a6a8a] uppercase tracking-[0.18em] font-semibold leading-tight">
              {today}
            </p>

            {/* Live badge */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <div className="relative flex items-center justify-center w-5 h-5">
                <span className="broadcast-ring absolute inset-0 rounded-full border border-[#3d9e68]" />
                <span className="pulse-dot w-2 h-2 rounded-full bg-[#3d9e68] inline-block relative z-10" />
              </div>
              <span className="font-[family-name:var(--font-display)] text-[13px] font-semibold
                               tracking-[0.2em] text-[#3d9e68] uppercase">
                Live
              </span>
            </div>

            {/* Stadium silhouette — decorative */}
            <div className="mt-4 text-[#1a2d45] text-[28px] select-none" aria-hidden>
              🏟️
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2d7a4f]/40 to-transparent" />
    </header>
  );
}
