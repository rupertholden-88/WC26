"use client";

import { useState, useEffect } from "react";
import { TIMEZONES, getStoredTz, setStoredTz } from "@/app/lib/timezone";

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

export default function TzSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = TIMEZONES.find(t => t.value === value) ?? TIMEZONES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-[11px] font-semibold
                   tracking-[0.12em] uppercase text-[#4a6a8a] hover:text-[#f5a623] transition-colors duration-150
                   bg-[#111e30] border border-[#1a2d45] hover:border-[#f5a623]/30 rounded-lg px-2.5 py-1.5"
      >
        <span>🕐</span>
        <span>{current.abbr}</span>
        <span className="text-[#2a4060]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-[#111e30] border border-[#1a2d45] rounded-xl
                        shadow-2xl min-w-[200px] overflow-hidden">
          {TIMEZONES.map(tz => (
            <button
              key={tz.value}
              onClick={() => {
                onChange(tz.value);
                setStoredTz(tz.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-colors duration-100
                          font-[family-name:var(--font-display)] tracking-wide
                          ${tz.value === value
                            ? "bg-[#1a2d45] text-[#f5a623]"
                            : "text-[#8aa8c8] hover:bg-[#0d1624] hover:text-white"}`}
            >
              {tz.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
