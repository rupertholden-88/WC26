"use client";

import { Result } from "@/app/lib/claude";
import { formatInTz, getTzAbbr } from "@/app/lib/timezone";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: Result[] | null;
  loading: boolean;
  error: string | null;
  tz: string;
}

export default function ResultsTab({ data, loading, error, tz }: Props) {
  const tzAbbr = getTzAbbr(tz);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="fadein">
      <SectionLabel>Results · last 24 hours · {tzAbbr}</SectionLabel>
      {!data || data.length === 0 ? (
        <EmptyState message="No results yet — check back after matches finish." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r, i) => {
            const isLive = r.status === "LIVE";
            const isDraw = r.homeScore === r.awayScore;
            const hasScorers = r.homeScorers?.length > 0 || r.awayScorers?.length > 0;

            const stripeStyle = isLive
              ? "bg-gradient-to-b from-orange-400 via-orange-700 to-transparent"
              : undefined;
            const stripeInline = isLive
              ? undefined
              : { background: "linear-gradient(to bottom, var(--green), var(--green-mid), transparent)" };

            const cardClass = isLive
              ? "bg-[var(--bg-live)] border-[var(--border-live)]"
              : "bg-[var(--bg-card)] border-[var(--border)]";

            return (
              <div
                key={i}
                className={`result-card border rounded-xl px-4 py-4 relative overflow-hidden ${cardClass}`}
              >
                {/* Left accent stripe */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${stripeStyle ?? ""}`}
                  style={stripeInline}
                />

                {/* Group row */}
                <div className="flex items-center justify-between mb-3 pl-2">
                  <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold
                                 tracking-[0.16em] uppercase text-[var(--text-dim)]">
                    {r.group}
                  </p>
                  {isLive && (
                    <span className="text-orange-400 font-semibold tracking-widest uppercase text-[9px] font-[family-name:var(--font-display)]">
                      ● Live{r.clock ? ` · ${r.clock}` : ""}
                    </span>
                  )}
                </div>

                {/* Score row */}
                <div className="flex items-center justify-between gap-3 pl-2">
                  <span className={`flex-1 text-right font-[family-name:var(--font-display)] text-[16px] font-bold leading-tight
                                    ${!isDraw && r.homeScore > r.awayScore ? "text-[var(--text-primary)]" : "text-[var(--text-dim)]"}`}>
                    {r.home}
                  </span>

                  <div className="flex items-center gap-px shrink-0">
                    <div className={`w-9 h-9 flex items-center justify-center rounded-l-lg
                                     score-digit text-[20px] font-bold font-[family-name:var(--font-display)]
                                     ${!isDraw && r.homeScore > r.awayScore
                                       ? "bg-[var(--accent)] text-[#080e1a]"
                                       : "bg-[var(--bg-mid)] text-[var(--text-primary)] border border-[var(--border)]"}` }>
                      {r.homeScore}
                    </div>
                    <div className="w-5 h-9 flex items-center justify-center bg-[var(--bg-mid)] border-y border-[var(--border)]">
                      <span className="text-[var(--text-dim)] text-[11px] font-bold">–</span>
                    </div>
                    <div className={`w-9 h-9 flex items-center justify-center rounded-r-lg
                                     score-digit text-[20px] font-bold font-[family-name:var(--font-display)]
                                     ${!isDraw && r.awayScore > r.homeScore
                                       ? "bg-[var(--accent)] text-[#080e1a]"
                                       : "bg-[var(--bg-mid)] text-[var(--text-primary)] border border-[var(--border)]"}` }>
                      {r.awayScore}
                    </div>
                  </div>

                  <span className={`flex-1 text-left font-[family-name:var(--font-display)] text-[16px] font-bold leading-tight
                                    ${!isDraw && r.awayScore > r.homeScore ? "text-[var(--text-primary)]" : "text-[var(--text-dim)]"}`}>
                    {r.away}
                  </span>
                </div>

                {/* Scorers */}
                {hasScorers && (
                  <div className="flex items-start gap-3 pl-2 mt-3">
                    <div className="flex-1 flex flex-col items-end gap-1">
                      {r.homeScorers.map((s, j) => (
                        <span key={j} className="text-[11px] font-[family-name:var(--font-display)] text-[var(--text-dim)]">{s}</span>
                      ))}
                    </div>
                    <div className="w-[94px] shrink-0" />
                    <div className="flex-1 flex flex-col items-start gap-1">
                      {r.awayScorers.map((s, j) => (
                        <span key={j} className="text-[11px] font-[family-name:var(--font-display)] text-[var(--text-dim)]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <p className="text-[10px] text-[var(--text-dim)] text-center mt-3 tracking-widest">
                  {isLive ? (
                    <span className="text-orange-400">
                      ● LIVE{r.clock ? ` · ${r.clock}` : ""}
                    </span>
                  ) : (
                    <>
                      {isDraw ? "DRAW" : r.homeScore > r.awayScore ? r.home.toUpperCase() + " WIN" : r.away.toUpperCase() + " WIN"}
                      <span className="mx-2 text-[var(--border)]">·</span>
                      {r.utcDate ? formatInTz(r.utcDate, tz) : r.time} {tzAbbr}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
