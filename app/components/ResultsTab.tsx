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
          {data.map((r, i) => (
            <div
              key={i}
              className="bg-[#111e30] border border-[#1a2d45] rounded-xl px-4 py-4"
            >
              {/* Group label */}
              <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold
                             tracking-[0.12em] uppercase text-[#4a6a8a] mb-3">
                {r.group}
              </p>

              {/* Score row */}
              <div className="flex items-center justify-between gap-2">
                {/* Home */}
                <span className={`flex-1 text-right font-[family-name:var(--font-display)] text-[15px] font-bold
                                  ${r.homeScore > r.awayScore ? "text-white" : "text-[#6a8aaa]"}`}>
                  {r.home}
                </span>

                {/* Score */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1624] rounded-lg border border-[#1a2d45]">
                  <span className={`text-[20px] font-bold font-[family-name:var(--font-display)] w-5 text-center
                                    ${r.homeScore > r.awayScore ? "text-[#f5a623]" : "text-white"}`}>
                    {r.homeScore}
                  </span>
                  <span className="text-[#4a6a8a] text-[14px] font-bold">–</span>
                  <span className={`text-[20px] font-bold font-[family-name:var(--font-display)] w-5 text-center
                                    ${r.awayScore > r.homeScore ? "text-[#f5a623]" : "text-white"}`}>
                    {r.awayScore}
                  </span>
                </div>

                {/* Away */}
                <span className={`flex-1 text-left font-[family-name:var(--font-display)] text-[15px] font-bold
                                  ${r.awayScore > r.homeScore ? "text-white" : "text-[#6a8aaa]"}`}>
                  {r.away}
                </span>
              </div>

              {/* KO time */}
              <p className="text-[11px] text-[#4a6a8a] text-center mt-2">{r.time} BST</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
