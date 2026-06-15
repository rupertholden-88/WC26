"use client";

import { Fixture } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

const ITV_URL  = "https://www.itv.com/watch/collections/fifa-world-cup-2026-full-matches/5rPEhNmtGkk6sKm8ocw3wN";
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

function StatusDot({ status }: { status: Fixture["status"] }) {
  if (status === "FINISHED") {
    return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Finished" />;
  }
  if (status === "LIVE") {
    return <span className="pulse-dot w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Live now" />;
  }
  return <span className="w-2 h-2 rounded-full bg-[#3d9e68] shrink-0" title="Upcoming" />;
}

function FixtureRow({ f }: { f: Fixture }) {
  const href = f.channel === "ITV" ? ITV_URL : BBC_URL;

  const stripeColour =
    f.status === "FINISHED" ? "bg-gradient-to-b from-red-600 via-red-900 to-transparent"
    : f.status === "LIVE"   ? "bg-gradient-to-b from-orange-400 via-orange-700 to-transparent"
    :                         "bg-gradient-to-b from-[#3d9e68] via-[#2d7a4f] to-transparent";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`card-glow flex items-center gap-3 sm:gap-4 border rounded-xl
                 px-4 py-3.5 transition-all duration-200 no-underline group relative overflow-hidden
                 ${f.status === "FINISHED"
                   ? "bg-[#0e1520] border-[#1a2030]"
                   : f.status === "LIVE"
                   ? "bg-[#131a20] border-[#2a3520]"
                   : "bg-[#111e30] border-[#1a2d45]"}`}
    >
      {/* Left accent stripe — status colour */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${stripeColour}`} />

      {/* Status dot + Time */}
      <div className="shrink-0 w-[60px] pl-2 flex items-center gap-2">
        <StatusDot status={f.status} />
        <span className={`font-[family-name:var(--font-display)] text-[13px] font-medium tabular-nums
                          ${f.status === "FINISHED" ? "text-red-600 line-through decoration-red-800"
                            : f.status === "LIVE" ? "text-orange-400"
                            : "text-[#4a6a8a]"}`}>
          {f.time}
        </span>
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <p className={`font-[family-name:var(--font-display)] text-[16px] sm:text-[17px] font-semibold tracking-wide leading-tight
                       ${f.status === "FINISHED" ? "text-[#4a6a8a]" : "text-white"}`}>
          {f.home}
          <span className="text-[#2a4060] font-medium text-[14px] mx-2">v</span>
          {f.away}
        </p>
        <p className="text-[11px] text-[#4a6a8a] mt-0.5 font-medium">
          {f.group}
          {f.status === "LIVE" && <span className="ml-2 text-orange-400 font-semibold tracking-widest uppercase text-[9px]">● Live</span>}
          {f.status === "FINISHED" && <span className="ml-2 text-red-600 font-semibold tracking-widest uppercase text-[9px]">FT</span>}
        </p>
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
