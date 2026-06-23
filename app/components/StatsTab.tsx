"use client";

import { TopScorer } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: TopScorer[] | null;
  loading: boolean;
  error: string | null;
}

function getMedalColour(rank: number): string {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-600";
  return "text-[var(--text-faint)]";
}

function getRankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default function StatsTab({ data, loading, error }: Props) {
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState message="No scorer data yet — check back once the tournament has started." />;

  let rank = 0;
  let prevGoals = -1;

  return (
    <div className="fadein">
      <SectionLabel>Top Scorers · Golden Boot</SectionLabel>

      <div className="flex flex-col gap-2">
        {data.map((s, i) => {
          if (s.goals !== prevGoals) {
            rank = i + 1;
            prevGoals = s.goals;
          }

          const isTop3 = rank <= 3;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors
                          ${isTop3
                            ? "bg-[var(--bg-card)] border-[var(--border)]"
                            : "bg-[var(--bg-finished)] border-[var(--border-dim)]"}`}
            >
              {/* Rank */}
              <div className={`shrink-0 w-7 text-center font-[family-name:var(--font-display)] font-bold text-[13px]
                               ${getMedalColour(rank)}`}>
                {rank <= 3 ? getRankLabel(rank) : rank}
              </div>

              {/* Team crest */}
              {s.teamCrest ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={s.teamCrest}
                  alt={s.team}
                  className="shrink-0 w-6 h-6 object-contain"
                />
              ) : (
                <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--bg-mid)]" />
              )}

              {/* Name + team */}
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                  {s.name}
                </p>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  {s.team}
                  {s.nationality ? ` · ${s.nationality}` : ""}
                </p>
              </div>

              {/* Stats */}
              <div className="shrink-0 flex items-center gap-4">
                <div className="text-center">
                  <p className={`font-[family-name:var(--font-display)] text-[20px] font-bold tabular-nums leading-none
                                 ${isTop3 ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                    {s.goals}
                  </p>
                  <p className="text-[9px] text-[var(--text-faint)] tracking-widest uppercase mt-0.5">Goals</p>
                </div>
                {s.assists > 0 && (
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-display)] text-[16px] font-semibold tabular-nums leading-none text-[var(--text-dim)]">
                      {s.assists}
                    </p>
                    <p className="text-[9px] text-[var(--text-faint)] tracking-widest uppercase mt-0.5">Ast</p>
                  </div>
                )}
                {s.penalties > 0 && (
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-display)] text-[13px] font-medium tabular-nums leading-none text-[var(--text-faint)]">
                      ({s.penalties})
                    </p>
                    <p className="text-[9px] text-[var(--text-faint)] tracking-widest uppercase mt-0.5">Pen</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
