"use client";

import { Result } from "@/app/lib/claude";

interface Props {
  results: Result[] | null;
  onOpen: () => void;
}

// Compact live-score strip pinned above the tabs, visible on every tab while
// a match is in play. Score digits are keyed by value so a goal re-mounts the
// span and replays the pop animation.
export default function LiveBanner({ results, onOpen }: Props) {
  const live = (results ?? []).filter(r => r.status === "LIVE");
  if (live.length === 0) return null;

  return (
    <div
      onClick={onOpen}
      className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-1.5 cursor-pointer
                 bg-[var(--bg-live)] border-b border-[var(--border-live)] backdrop-blur-md"
      role="button"
      aria-label="Live matches — open results"
    >
      {live.map((r, i) => (
        <div key={i} className="flex items-center justify-center gap-2.5 py-1">
          <span className="pulse-dot text-orange-400 text-[8px]">●</span>
          <span className="font-[family-name:var(--font-display)] text-[10px] font-bold tracking-[0.16em] text-orange-400 uppercase">
            Live{r.clock ? ` ${r.clock}` : ""}
          </span>

          <span className="font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--text-primary)] truncate max-w-[110px]">
            {r.home}
          </span>
          <span className="flex items-center gap-1 font-[family-name:var(--font-display)] text-[15px] font-bold score-digit">
            <span key={`h${r.homeScore}`} className="score-pop text-[var(--accent)]">{r.homeScore}</span>
            <span className="text-[var(--text-dim)]">–</span>
            <span key={`a${r.awayScore}`} className="score-pop text-[var(--accent)]">{r.awayScore}</span>
          </span>
          <span className="font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--text-primary)] truncate max-w-[110px]">
            {r.away}
          </span>
        </div>
      ))}
    </div>
  );
}
