"use client";

import { VideoResult } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: VideoResult[] | null;
  loading: boolean;
  error: string | null;
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
      <SectionLabel>World Cup highlights since 6pm {yestStr}</SectionLabel>

      {!data || data.length === 0 ? (
        <EmptyState message="No highlights found yet — check back after matches finish." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((v, i) => (
            <a
              key={i}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-[#111e30] border border-[#1a2d45] rounded-xl overflow-hidden
                         hover:border-[#f5a623] transition-all duration-200 no-underline"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#0d1624]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                  alt=""
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-200"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#f5a623] flex items-center justify-center
                                  shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <svg width="14" height="16" viewBox="0 0 12 14" fill="none">
                      <path d="M1 1L11 7L1 13V1Z" fill="#080e1a" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Match title */}
              <div className="px-4 py-3">
                <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-white
                               tracking-wide leading-tight line-clamp-2">
                  {v.match}
                </p>
                <p className="text-[11px] text-[#4a6a8a] mt-1 font-medium">
                  Highlights · {(v as VideoResult & { channel?: string }).channel ?? "YouTube"}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
