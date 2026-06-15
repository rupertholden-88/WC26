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
                 tracking-[0.1em] uppercase text-[#4a6a8a] bg-[#111e30]
                 border border-[#1a2d45] rounded-lg px-2 py-1.5 cursor-pointer
                 hover:border-[#f5a623]/40 hover:text-[#f5a623]
                 transition-colors duration-150 appearance-none"
      style={{ backgroundImage: "none" }}
    >
      {TIMEZONES.map(tz => (
        <option key={tz.value} value={tz.value} className="bg-[#111e30] text-white normal-case">
          {tz.abbr} · {tz.label.split(" ")[0]}
        </option>
      ))}
    </select>
  );
}
