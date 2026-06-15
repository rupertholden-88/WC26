"use client";

import { VideoResult } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: VideoResult[] | null;
  loading: boolean;
  error: string | null;
}

function PlayIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <path d="M1 1L11 7L1 13V1Z" fill="currentColor" />
    </svg>
  );
}

export default function VideosTab({ data, loading, error }: Props) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="fadein">
      <SectionLabel>Highlights since 6pm {yestStr}</SectionLabel>

      {!data || data.length === 0 ? (
        <EmptyState message="No ITV highlights found yet for matches since 6pm yesterday. Check back later." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((v, i) => (
            <a
              key={i}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-[#111e30] border border-[#1a2d45] rounded-xl px-4 py-4 
                         hover:border-[#f5a623] hover:bg-[#141f32] transition-all duration-200 no-underline"
            >
              {/* Play button */}
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#f5a623] flex items-center justify-center
                              text-[#080e1a] group-hover:scale-110 transition-transform duration-200 ml-0.5">
                <PlayIcon />
              </div>

              {/* Match info */}
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-[17px] font-semibold text-white 
                               tracking-wide leading-tight truncate">
                  {v.match}
                </p>
                <p className="text-xs text-[#4a6a8a] mt-0.5 font-medium">
                  {v.group} · Highlights · ITV Sport
                </p>
              </div>

              {/* Arrow */}
              <svg
                className="shrink-0 w-4 h-4 text-[#1a2d45] group-hover:text-[#f5a623] transition-colors duration-200 group-hover:translate-x-0.5 transition-transform"
                fill="none" viewBox="0 0 16 16"
              >
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
