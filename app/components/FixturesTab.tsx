"use client";

import { Fixture } from "@/app/lib/claude";
import { formatInTz, getTzAbbr } from "@/app/lib/timezone";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

const ITV_URL  = "https://www.itv.com/watch";
const BBC_URL  = "https://www.bbc.co.uk/iplayer/event/fifa-world-cup";

interface Props {
  data: Fixture[] | null;
  loading: boolean;
  error: string | null;
  tz: string;
}

function ITVXLogo() {
  return (
    <svg height="18" viewBox="0 0 54 22" role="img" aria-label="ITVX" className="block">
      <defs>
        <linearGradient id="itvx-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d78" />
          <stop offset="30%" stopColor="#ff8a00" />
          <stop offset="55%" stopColor="#ffd400" />
          <stop offset="78%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#2da8ff" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="54" height="22" rx="5" fill="url(#itvx-grad)" />
      <text x="27" y="16" textAnchor="middle" fontFamily="var(--font-display), sans-serif"
            fontSize="13" fontWeight="700" letterSpacing="0.5" fill="#ffffff">ITVX</text>
    </svg>
  );
}

function IPlayerLogo() {
  return (
    <svg height="18" viewBox="0 0 86 22" role="img" aria-label="BBC iPlayer" className="block">
      <defs>
        <linearGradient id="iplayer-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff4e98" />
          <stop offset="100%" stopColor="#00b9d4" />
        </linearGradient>
      </defs>
      {/* play glyph */}
      <path d="M3 3 L19 11 L3 19 Z" fill="url(#iplayer-grad)" strokeLinejoin="round" />
      <text x="24" y="16" fontFamily="var(--font-display), sans-serif"
            fontSize="13" fontWeight="700" letterSpacing="0.3" fill="currentColor">iPlayer</text>
    </svg>
  );
}

function ChannelBadge({ channel }: { channel: "ITV" | "BBC" }) {
  const isITV = channel === "ITV";
  const href = isITV ? ITV_URL : BBC_URL;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={isITV ? "Watch on ITVX" : "Watch on BBC iPlayer"}
      className="shrink-0 inline-flex items-center text-[var(--text-primary)]
                 transition-transform duration-150 hover:scale-105"
      onClick={(e) => e.stopPropagation()}
    >
      {isITV ? <ITVXLogo /> : <IPlayerLogo />}
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
  return <span className="w-2 h-2 rounded-full bg-[var(--green)] shrink-0" title="Upcoming" />;
}

function FixtureRow({ f, tz }: { f: Fixture; tz: string }) {
  const displayTime = f.utcDate ? formatInTz(f.utcDate, tz) : f.time;
  const href = f.channel === "ITV" ? ITV_URL : BBC_URL;

  const stripeColour =
    f.status === "FINISHED" ? "bg-gradient-to-b from-red-600 via-red-900 to-transparent"
    : f.status === "LIVE"   ? "bg-gradient-to-b from-orange-400 via-orange-700 to-transparent"
    :                         "";

  const cardBg =
    f.status === "FINISHED" ? "bg-[var(--bg-finished)] border-[var(--border-dim)]"
    : f.status === "LIVE"   ? "bg-[var(--bg-live)] border-[var(--border-live)]"
    :                         "bg-[var(--bg-card)] border-[var(--border)]";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`card-glow flex items-center gap-3 sm:gap-4 border rounded-xl
                 px-4 py-3.5 transition-all duration-200 no-underline group relative overflow-hidden
                 ${cardBg}`}
    >
      {/* Left accent stripe — status colour */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${stripeColour}`}
        style={!stripeColour ? { background: "linear-gradient(to bottom, var(--green), var(--green-mid), transparent)" } : undefined}
      />

      {/* Status dot + Time */}
      <div className="shrink-0 w-[60px] pl-2 flex items-center gap-2">
        <StatusDot status={f.status} />
        <span className={`font-[family-name:var(--font-display)] text-[13px] font-medium tabular-nums
                          ${f.status === "FINISHED" ? "text-red-600 line-through decoration-red-800"
                            : f.status === "LIVE" ? "text-orange-400"
                            : "text-[var(--text-dim)]"}`}>
          {displayTime}
        </span>
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <p className={`font-[family-name:var(--font-display)] text-[16px] sm:text-[17px] font-semibold tracking-wide leading-tight
                       ${f.status === "FINISHED" ? "text-[var(--text-dim)]" : "text-[var(--text-primary)]"}`}>
          {f.home}
          <span className="text-[var(--text-faint)] font-medium text-[14px] mx-2">v</span>
          {f.away}
        </p>
        <p className="text-[11px] text-[var(--text-dim)] mt-0.5 font-medium">
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

function DaySection({ label, fixtures, tz }: { label: string; fixtures: Fixture[]; tz: string }) {
  if (fixtures.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-[0.22em] text-[var(--text-dim)] uppercase">
          {label}
        </p>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, var(--border), transparent)" }} />
        <span className="font-[family-name:var(--font-display)] text-[10px] text-[var(--text-faint)] tabular-nums">
          {fixtures.length} match{fixtures.length !== 1 ? "es" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {fixtures.map((f, i) => <FixtureRow key={i} f={f} tz={tz} />)}
      </div>
    </div>
  );
}

export default function FixturesTab({ data, loading, error, tz }: Props) {
  const tzAbbr = getTzAbbr(tz);
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
      <SectionLabel>Fixtures · BBC &amp; ITV · {tzAbbr}</SectionLabel>
      <DaySection label={`Today · ${todayStr}`} fixtures={todayFixtures} tz={tz} />
      <DaySection label={`Tomorrow · ${tomStr}`} fixtures={tomorrowFixtures} tz={tz} />
    </div>
  );
}
