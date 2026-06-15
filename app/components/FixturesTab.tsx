"use client";

import { Fixture } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: Fixture[] | null;
  loading: boolean;
  error: string | null;
}

function ChannelBadge({ channel }: { channel: "ITV" | "BBC" }) {
  const isITV = channel === "ITV";
  return (
    <span
      className={`font-[family-name:var(--font-display)] text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded
        ${isITV
          ? "text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/25"
          : "text-[#5baee0] bg-[#5baee0]/10 border border-[#5baee0]/25"
        }`}
    >
      {channel}
    </span>
  );
}

function FixtureRow({ f }: { f: Fixture }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-[#111e30] border border-[#1a2d45] rounded-xl
                    px-4 py-3.5 hover:border-[#1e3050] transition-colors duration-200">
      {/* Time */}
      <div className="shrink-0 w-[52px]">
        <span className="font-[family-name:var(--font-display)] text-[13px] font-medium text-[#4a6a8a] tabular-nums">
          {f.time}
        </span>
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-display)] text-[16px] sm:text-[17px] font-semibold text-white tracking-wide leading-tight">
          {f.home}
          <span className="text-[#2a4060] font-medium text-[14px] mx-2">v</span>
          {f.away}
        </p>
        <p className="text-[11px] text-[#4a6a8a] mt-0.5 font-medium">{f.group}</p>
      </div>

      {/* Channel + divider */}
      <div className="shrink-0">
        <ChannelBadge channel={f.channel} />
      </div>
    </div>
  );
}

function DaySection({ label, fixtures }: { label: string; fixtures: Fixture[] }) {
  if (fixtures.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-[0.22em] text-[#4a6a8a] uppercase">
          {label}
        </p>
        <div className="flex-1 h-px bg-[#1a2d45]" />
        <span className="font-[family-name:var(--font-display)] text-[10px] text-[#2a4060] tabular-nums">
          {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {fixtures.map((f, i) => <FixtureRow key={i} f={f} />)}
      </div>
    </div>
  );
}

export default function FixturesTab({ data, loading, error }: Props) {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tom = new Date(now);
  tom.setDate(now.getDate() + 1);
  const tomStr = tom.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState message="No fixtures found — try refreshing." />;

  const todayFixtures = data.filter((f) => f.date === "today");
  const tomorrowFixtures = data.filter((f) => f.date === "tomorrow");

  return (
    <div className="fadein">
      <SectionLabel>Fixtures · BBC &amp; ITV</SectionLabel>
      <DaySection label={`Today · ${todayStr}`} fixtures={todayFixtures} />
      <DaySection label={`Tomorrow · ${tomStr}`} fixtures={tomorrowFixtures} />
    </div>
  );
}
