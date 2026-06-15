"use client";

import { Fixture } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

const ITV_URL  = "https://www.itv.com/watch/fifa-world-cup-2026";
const BBC_URL  = "https://www.bbc.co.uk/iplayer/event/fifa-world-cup";

interface Props {
  data: Fixture[] | null;
  loading: boolean;
  error: string | null;
}

function ChannelBadge({ channel }: { channel: "ITV" | "BBC" }) {
  const isITV = channel === "ITV";
  const href = isITV ? ITV_URL : BBC_URL;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-[family-name:var(--font-display)] text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded
        transition-all duration-150 hover:scale-105
        ${isITV
          ? "badge-itv"
          : "badge-bbc"
        }`}
      onClick={(e) => e.stopPropagation()}
    >
      {isITV ? "ITVX" : "iPlayer"}
    </a>
  );
}

function FixtureRow({ f }: { f: Fixture }) {
  const href = f.channel === "ITV" ? ITV_URL : BBC_URL;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-glow flex items-center gap-3 sm:gap-4 bg-[#111e30] border border-[#1a2d45] rounded-xl
                 px-4 py-3.5 transition-all duration-200 no-underline group relative overflow-hidden"
    >
      {/* Left accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl
                       ${f.channel === "ITV"
                         ? "bg-gradient-to-b from-[#f5a623] via-[#c47d10] to-transparent"
                         : "bg-gradient-to-b from-[#5baee0] via-[#1a6bcc] to-transparent"}`} />

      {/* Time */}
      <div className="shrink-0 w-[52px] pl-2">
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

      {/* Channel badge */}
      <div className="shrink-0">
        <ChannelBadge channel={f.channel} />
      </div>
    </a>
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
        <div className="flex-1 h-px bg-gradient-to-r from-[#1a2d45] to-transparent" />
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
  const todayStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
  const tom = new Date(now);
  tom.setDate(now.getDate() + 1);
  const tomStr = tom.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();

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
