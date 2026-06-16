"use client";

import { TIMEZONES, setStoredTz } from "@/app/lib/timezone";

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

export default function TzSelector({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        setStoredTz(e.target.value);
      }}
      className="font-[family-name:var(--font-display)] text-[11px] font-semibold
                 tracking-[0.1em] uppercase text-[var(--text-dim)] bg-[var(--bg-card)]
                 border border-[var(--border)] rounded-lg px-2 py-1.5 cursor-pointer
                 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]
                 transition-colors duration-150 appearance-none"
      style={{ backgroundImage: "none" }}
    >
      {TIMEZONES.map(tz => (
        <option key={tz.value} value={tz.value} className="bg-[var(--bg-card)] text-[var(--text-primary)] normal-case">
          {tz.abbr} · {tz.label.split(" ")[0]}
        </option>
      ))}
    </select>
  );
}
