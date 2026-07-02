"use client";

import { useState } from "react";
import { TEAMS } from "@/app/lib/myteam";

interface Props {
  current: string | null;
  onSelect: (name: string | null) => void;
  onClose: () => void;
}

export default function TeamPicker({ current, onSelect, onClose }: Props) {
  const [q, setQ] = useState("");
  const filtered = TEAMS.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[var(--bg-card)] border-2 border-[var(--accent)] rounded-2xl w-full max-w-sm max-h-[75vh] overflow-y-auto scrollbar-none shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-[0.22em] text-[var(--text-dim)] uppercase">
            Pick your team
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--text-dim)] hover:text-[var(--text-primary)] text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search teams…"
          className="w-full bg-[var(--bg-mid)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm
                     text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none
                     focus:border-[var(--accent)] mb-3"
        />

        <div className="grid grid-cols-2 gap-1.5">
          {filtered.map(t => (
            <button
              key={t.name}
              onClick={() => onSelect(t.name)}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors
                          font-[family-name:var(--font-display)] text-[13px] font-semibold
                          ${current === t.name
                            ? "bg-[var(--accent)] text-[#080e1a]"
                            : "bg-[var(--bg-mid)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)]"
                          }`}
            >
              <span className="shrink-0">{t.flag}</span>
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--text-dim)] italic py-4 text-center">No teams match “{q}”</p>
        )}

        {current && (
          <button
            onClick={() => onSelect(null)}
            className="mt-3 w-full text-[10px] tracking-widest uppercase font-semibold
                       text-[var(--text-dim)] hover:text-red-400 py-1 cursor-pointer transition-colors"
          >
            Clear my team
          </button>
        )}
      </div>
    </div>
  );
}
