"use client";

import { BracketRound, BracketMatch } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: BracketRound[] | null;
  loading: boolean;
  error: string | null;
}

function TeamRow({
  name,
  crest,
  score,
  isWinner,
  align,
}: {
  name: string | null;
  crest: string | null;
  score: number | null;
  isWinner: boolean;
  align: "left" | "right";
}) {
  const nameEl = (
    <span
      className={`font-[family-name:var(--font-display)] text-[15px] font-bold leading-tight truncate
                  ${isWinner ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}
    >
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

function MatchCard({ m }: { m: BracketMatch }) {
  const isLive = m.status === "LIVE";
  const isFinished = m.status === "FINISHED";

  const stripeInline = isLive
    ? undefined
    : isFinished
      ? { background: "linear-gradient(to bottom, var(--green), var(--green-mid), transparent)" }
      : { background: "linear-gradient(to bottom, var(--text-faint), transparent)" };
  const stripeClass = isLive ? "bg-gradient-to-b from-orange-400 via-orange-700 to-transparent" : "";

  const cardClass = isLive
    ? "bg-[var(--bg-live)] border-[var(--border-live)]"
    : "bg-[var(--bg-card)] border-[var(--border)]";

  return (
    <div className={`result-card border rounded-xl px-4 py-3 relative overflow-hidden ${cardClass}`}>
      {/* Left accent stripe */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${stripeClass}`}
        style={stripeInline}
      />

      <div className="pl-2 flex flex-col gap-2">
        <TeamRow
          name={m.home}
          crest={m.homeCrest}
          score={m.homeScore}
          isWinner={m.winner === "HOME"}
          align="left"
        />
        <div className="h-px bg-[var(--border-dim)] mx-8" />
        <TeamRow
          name={m.away}
          crest={m.awayCrest}
          score={m.awayScore}
          isWinner={m.winner === "AWAY"}
          align="left"
        />
      </div>

      <p className="text-[10px] text-center mt-3 tracking-widest pl-2">
        {isLive ? (
          <span className="text-orange-400 font-semibold">● LIVE</span>
        ) : isFinished ? (
          <span className="text-[var(--text-dim)]">
            {m.winner === "HOME" ? (m.home ?? "Home").toUpperCase() + " WIN"
              : m.winner === "AWAY" ? (m.away ?? "Away").toUpperCase() + " WIN"
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

export default function BracketTab({ data, loading, error }: Props) {
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
              <MatchCard key={i} m={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
