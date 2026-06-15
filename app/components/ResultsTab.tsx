"use client";

import { Result } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: Result[] | null;
  loading: boolean;
  error: string | null;
}

export default function ResultsTab({ data, loading, error }: Props) {
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="fadein">
      <SectionLabel>Results · last 24 hours</SectionLabel>
      {!data || data.length === 0 ? (
        <EmptyState message="No results yet — check back after matches finish." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r, i) => {
            const isDraw = r.homeScore === r.awayScore;
            return (
              <div
                key={i}
                className="result-card bg-[#111e30] border border-[#1a2d45] rounded-xl px-4 py-4 relative overflow-hidden"
              >
                {/* Green left accent stripe */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#3d9e68] via-[#2d7a4f] to-transparent rounded-l-xl" />

                {/* Group + channel row */}
                <div className="flex items-center justify-between mb-3 pl-2">
                  <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold
                                 tracking-[0.16em] uppercase text-[#4a6a8a]">
                    {r.group}
                  </p>
                  <span className={`text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded
                                    ${r.channel === "ITV" ? "badge-itv" : "badge-bbc"}`}>
                    {r.channel}
                  </span>
                </div>

                {/* Score row */}
                <div className="flex items-center justify-between gap-3 pl-2">
                  {/* Home */}
                  <span className={`flex-1 text-right font-[family-name:var(--font-display)] text-[16px] font-bold leading-tight
                                    ${!isDraw && r.homeScore > r.awayScore ? "text-white" : "text-[#6a8aaa]"}`}>
                    {r.home}
                  </span>

                  {/* Score box */}
                  <div className="flex items-center gap-px shrink-0">
                    <div className={`w-9 h-9 flex items-center justify-center rounded-l-lg
                                     score-digit text-[20px] font-bold font-[family-name:var(--font-display)]
                                     ${!isDraw && r.homeScore > r.awayScore
                                       ? "bg-[#f5a623] text-[#080e1a]"
                                       : "bg-[#0d1624] text-white border border-[#1a2d45]"}`}>
                      {r.homeScore}
                    </div>
                    <div className="w-5 h-9 flex items-center justify-center bg-[#0d1624] border-y border-[#1a2d45]">
                      <span className="text-[#4a6a8a] text-[11px] font-bold">–</span>
                    </div>
                    <div className={`w-9 h-9 flex items-center justify-center rounded-r-lg
                                     score-digit text-[20px] font-bold font-[family-name:var(--font-display)]
                                     ${!isDraw && r.awayScore > r.homeScore
                                       ? "bg-[#f5a623] text-[#080e1a]"
                                       : "bg-[#0d1624] text-white border border-[#1a2d45]"}`}>
                      {r.awayScore}
                    </div>
                  </div>

                  {/* Away */}
                  <span className={`flex-1 text-left font-[family-name:var(--font-display)] text-[16px] font-bold leading-tight
                                    ${!isDraw && r.awayScore > r.homeScore ? "text-white" : "text-[#6a8aaa]"}`}>
                    {r.away}
                  </span>
                </div>

                {/* KO time */}
                <p className="text-[10px] text-[#4a6a8a] text-center mt-3 tracking-widest">
                  {isDraw ? "DRAW" : r.homeScore > r.awayScore ? r.home.toUpperCase() + " WIN" : r.away.toUpperCase() + " WIN"}
                  <span className="mx-2 text-[#1a2d45]">·</span>
                  {r.time} BST
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
