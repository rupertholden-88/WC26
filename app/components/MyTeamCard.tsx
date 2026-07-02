"use client";

import { useEffect, useMemo, useState } from "react";
import { BracketRound, BracketMatch, Result } from "@/app/lib/claude";
import { TEAMS, isTeam } from "@/app/lib/myteam";
import { getBroadcaster } from "@/app/lib/broadcaster";
import { formatInTz, getTzAbbr } from "@/app/lib/timezone";

interface Props {
  team: string;
  bracket: BracketRound[] | null;
  results: Result[] | null;
  tz: string;
  onChange: () => void;
}

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function Crest({ url }: { url: string | null }) {
  return url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url} alt="" className="shrink-0 w-5 h-5 object-contain" />
  ) : (
    <div className="shrink-0 w-5 h-5 rounded-full bg-[var(--bg-mid)]" />
  );
}

// Pinned "my team" card: next match with a live countdown, live score while
// the team is playing, or elimination/progression status.
export default function MyTeamCard({ team, bracket, results, tz, onChange }: Props) {
  const flag = TEAMS.find(t => t.name === team)?.flag ?? "⚽";

  const matches = useMemo(() => {
    const list: { m: BracketMatch; round: string }[] = [];
    for (const r of bracket ?? []) {
      for (const m of r.matches) {
        if (isTeam(m.home, team) || isTeam(m.away, team)) list.push({ m, round: r.label });
      }
    }
    return list.sort((a, b) => a.m.utcDate.localeCompare(b.m.utcDate));
  }, [bracket, team]);

  const next = matches.find(x => x.m.status !== "FINISHED");
  const last = [...matches].reverse().find(x => x.m.status === "FINISHED");

  const liveResult = (results ?? []).find(
    r => r.status === "LIVE" && (isTeam(r.home, team) || isTeam(r.away, team))
  );

  const kickoffMs = next ? new Date(next.m.utcDate).getTime() : 0;
  const isUpcoming = !!next && next.m.status === "UPCOMING" && !liveResult;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isUpcoming) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isUpcoming, kickoffMs]);

  let body: React.ReactNode;

  if (liveResult) {
    body = (
      <div className="flex items-center justify-center gap-2.5">
        <span className="pulse-dot text-orange-400 text-[8px]">●</span>
        <span className="font-[family-name:var(--font-display)] text-[10px] font-bold tracking-[0.16em] text-orange-400 uppercase">
          Live{liveResult.clock ? ` ${liveResult.clock}` : ""}
        </span>
        <span className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--text-primary)]">
          {liveResult.home}
        </span>
        <span className="flex items-center gap-1 font-[family-name:var(--font-display)] text-[18px] font-bold score-digit">
          <span key={`h${liveResult.homeScore}`} className="score-pop text-[var(--accent)]">{liveResult.homeScore}</span>
          <span className="text-[var(--text-dim)]">–</span>
          <span key={`a${liveResult.awayScore}`} className="score-pop text-[var(--accent)]">{liveResult.awayScore}</span>
        </span>
        <span className="font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--text-primary)]">
          {liveResult.away}
        </span>
      </div>
    );
  } else if (next) {
    const { m, round } = next;
    const channel = m.home && m.away ? getBroadcaster(m.home, m.away) : null;
    body = (
      <>
        <div className="flex items-center justify-center gap-2 min-w-0">
          <Crest url={m.homeCrest} />
          <span className={`font-[family-name:var(--font-display)] text-[15px] font-bold truncate
                            ${isTeam(m.home, team) ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
            {m.home ?? "TBD"}
          </span>
          <span className="text-[var(--text-dim)] text-[11px] font-semibold">vs</span>
          <span className={`font-[family-name:var(--font-display)] text-[15px] font-bold truncate
                            ${isTeam(m.away, team) ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
            {m.away ?? "TBD"}
          </span>
          <Crest url={m.awayCrest} />
        </div>

        <p className="text-center font-[family-name:var(--font-display)] text-[22px] font-bold text-[var(--accent)] score-digit mt-1 leading-tight">
          {kickoffMs - now <= 0 ? "KICK-OFF!" : countdown(kickoffMs - now)}
        </p>

        <p className="text-[10px] text-[var(--text-dim)] text-center tracking-widest uppercase mt-1 flex items-center justify-center gap-2">
          <span>{round}</span>
          <span className="text-[var(--border)]">·</span>
          <span>{m.displayDate} · {formatInTz(m.utcDate, tz)} {getTzAbbr(tz)}</span>
          {channel && (
            <span className={`badge-${channel.toLowerCase()} px-1.5 py-0.5 rounded text-[9px] font-bold tracking-normal`}>
              {channel}
            </span>
          )}
        </p>
      </>
    );
  } else if (last) {
    const lm = last.m;
    const mineSide = isTeam(lm.home, team) ? "HOME" : "AWAY";
    const won = lm.winner === mineSide;

    // The round after the one just played, if the bracket knows it yet
    const roundIdx = (bracket ?? []).findIndex(r => r.label === last.round);
    const nextRound = roundIdx >= 0 ? bracket?.[roundIdx + 1]?.label : undefined;

    // Recover the real match score for shootout games (fullTime is cumulative)
    const wasPens = lm.duration === "PENALTY_SHOOTOUT" && lm.homePens !== null && lm.awayPens !== null;
    const homeGoals = wasPens ? (lm.homeScore ?? 0) - (lm.homePens ?? 0) : lm.homeScore;
    const awayGoals = wasPens ? (lm.awayScore ?? 0) - (lm.awayPens ?? 0) : lm.awayScore;
    const scoreline = `${lm.home} ${homeGoals}–${awayGoals} ${lm.away}${wasPens ? ` · ${lm.homePens}–${lm.awayPens} pens` : ""}`;

    body = won ? (
      <div className="flex flex-col items-center gap-1 py-0.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--green)] text-[#080e1a] text-[11px] font-bold leading-none">✓</span>
          <span className="font-[family-name:var(--font-display)] text-[16px] font-bold tracking-wide uppercase text-[var(--green)]">
            Through to the {nextRound ?? "next round"}
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-dim)] tracking-[0.16em] uppercase">
          Won {scoreline} · opponent TBD
        </p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1 py-0.5">
        <span className="font-[family-name:var(--font-display)] text-[16px] font-bold tracking-wide uppercase text-[var(--text-secondary)]">
          Knocked out · {last.round}
        </span>
        <p className="text-[10px] text-[var(--text-dim)] tracking-[0.16em] uppercase">
          {scoreline}
        </p>
      </div>
    );
  } else {
    body = (
      <p className="text-center text-[12px] text-[var(--text-dim)] italic py-1">
        No knockout matches found for {team}.
      </p>
    );
  }

  return (
    <div className="border rounded-xl px-4 py-3 bg-[var(--bg-card)] border-[var(--border)] my-team-glow relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold tracking-[0.22em] text-[var(--text-dim)] uppercase">
          <span className="mr-1.5">{flag}</span>My team · {team}
        </p>
        <button
          onClick={onChange}
          className="text-[8px] tracking-[0.14em] uppercase font-semibold text-[var(--text-faint)]
                     hover:text-[var(--accent)] border border-[var(--border-dim)] hover:border-[var(--accent)]
                     rounded-full px-2 py-[3px] cursor-pointer transition-colors"
        >
          Change
        </button>
      </div>
      {body}
    </div>
  );
}
