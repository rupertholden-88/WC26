"use client";

import { BracketRound, BracketMatch } from "@/app/lib/claude";
import { isTeam } from "@/app/lib/myteam";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: BracketRound[] | null;
  loading: boolean;
  error: string | null;
  myTeam?: string | null;
}

function TeamRow({
  name,
  crest,
  score,
  isWinner,
  isMine,
  align,
}: {
  name: string | null;
  crest: string | null;
  score: number | null;
  isWinner: boolean;
  isMine: boolean;
  align: "left" | "right";
}) {
  const nameEl = (
    <span
      className={`font-[family-name:var(--font-display)] text-[15px] font-bold leading-tight truncate
                  ${isWinner ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}
    >
      {isMine && <span className="text-[var(--accent)] text-[10px] mr-1 align-middle">★</span>}
      {name ?? "TBD"}
    </span>
  );

  const crestEl = crest ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={crest} alt="" className="shrink-0 w-6 h-6 object-contain" />
  ) : (
    <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--bg-mid)]" />
  );

  const scoreEl = (
    <div
      className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg
                  score-digit text-[20px] font-bold font-[family-name:var(--font-display)]
                  ${isWinner
                    ? "bg-[var(--accent)] text-[#080e1a]"
                    : score !== null
                      ? "bg-[var(--bg-mid)] text-[var(--text-primary)] border border-[var(--border)]"
                      : "bg-transparent"
                  }`}
    >
      {score !== null ? score : ""}
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {crestEl}
      <span className="flex-1 min-w-0">{nameEl}</span>
      {scoreEl}
    </div>
  );
}

function MatchCard({ m, myTeam }: { m: BracketMatch; myTeam?: string | null }) {
  const isLive = m.status === "LIVE";
  const isFinished = m.status === "FINISHED";
  const isPens = m.duration === "PENALTY_SHOOTOUT";
  const homeIsMine = !!myTeam && isTeam(m.home, myTeam);
  const awayIsMine = !!myTeam && isTeam(m.away, myTeam);
  const involvesMine = homeIsMine || awayIsMine;

  // API stores cumulative (match goals + pen goals) in fullTime for shootout matches.
  // Subtract penalties to recover the actual match score.
  const homeMatchScore =
    isPens && m.homeScore !== null && m.homePens !== null
      ? m.homeScore - m.homePens
      : m.homeScore;
  const awayMatchScore =
    isPens && m.awayScore !== null && m.awayPens !== null
      ? m.awayScore - m.awayPens
      : m.awayScore;

  const stripeInline = isLive
    ? undefined
    : isFinished
      ? { background: "linear-gradient(to bottom, var(--green), var(--green-mid), transparent)" }
      : { background: "linear-gradient(to bottom, var(--text-faint), transparent)" };
  const stripeClass = isLive ? "bg-gradient-to-b from-orange-400 via-orange-700 to-transparent" : "";

  const cardClass = isLive
    ? "bg-[var(--bg-live)] border-[var(--border-live)]"
    : "bg-[var(--bg-card)] border-[var(--border)]";

  const winnerName =
    m.winner === "HOME" ? (m.home ?? "Home") : m.winner === "AWAY" ? (m.away ?? "Away") : null;

  const penSuffix =
    isPens && m.homePens !== null && m.awayPens !== null
      ? ` (${m.homePens}–${m.awayPens} pens)`
      : isPens
        ? " (pens)"
        : "";

  return (
    <div className={`result-card border rounded-xl px-4 py-3 relative overflow-hidden ${cardClass} ${involvesMine ? "my-team-glow" : ""}`}>
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${stripeClass}`}
        style={stripeInline}
      />

      <div className="pl-2 flex flex-col gap-2">
        <TeamRow
          name={m.home}
          crest={m.homeCrest}
          score={homeMatchScore}
          isWinner={m.winner === "HOME"}
          isMine={homeIsMine}
          align="left"
        />
        <div className="h-px bg-[var(--border-dim)] mx-8" />
        <TeamRow
          name={m.away}
          crest={m.awayCrest}
          score={awayMatchScore}
          isWinner={m.winner === "AWAY"}
          isMine={awayIsMine}
          align="left"
        />
      </div>

      <p className="text-[10px] text-center mt-3 tracking-widest pl-2">
        {isLive ? (
          <span className="text-orange-400 font-semibold">● LIVE</span>
        ) : isFinished ? (
          <span className="text-[var(--text-dim)]">
            {winnerName
              ? winnerName.toUpperCase() + " WIN" + penSuffix
              : "FINISHED"}
          </span>
        ) : (
          <span className="text-[var(--text-dim)]">
            {m.displayDate} · {m.displayTime}
          </span>
        )}
      </p>
    </div>
  );
}

export default function BracketTab({ data, loading, error, myTeam }: Props) {
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) {
    return <EmptyState message="Knockout bracket not yet available — check back when the group stage finishes." />;
  }

  return (
    <div className="fadein flex flex-col gap-8">
      {data.map(round => (
        <div key={round.stage}>
          <SectionLabel>{round.label}</SectionLabel>
          <div className="flex flex-col gap-3">
            {(round.matches as BracketMatch[]).map((m, i) => (
              <MatchCard key={i} m={m} myTeam={myTeam} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
