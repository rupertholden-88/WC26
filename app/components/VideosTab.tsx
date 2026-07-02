"use client";

import { useState } from "react";
import { VideoResult } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: VideoResult[] | null;
  loading: boolean;
  error: string | null;
}

function VideoCard({ v }: { v: VideoResult & { channel?: string } }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden
                    card-glow transition-all duration-200 hover:-translate-y-[2px]">
      {playing ? (
        /* Embedded YouTube player */
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={v.match}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        /* Thumbnail — tap to play */
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video bg-[var(--bg-mid)] group block cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Bottom scrim so badges read over busy thumbnails */}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
          {/* Play button — glass disc, fills amber on hover */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-sm ring-1 ring-white/30
                            flex items-center justify-center shadow-2xl text-white
                            group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-[#080e1a] group-hover:ring-transparent
                            transition-all duration-200">
              <svg width="16" height="18" viewBox="0 0 12 14" fill="none" className="translate-x-[1px]">
                <path d="M1 1L11 7L1 13V1Z" fill="currentColor" />
              </svg>
            </div>
          </div>
          {/* YouTube badge */}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold
                          tracking-wider px-1.5 py-0.5 rounded uppercase">
            YouTube
          </div>
        </button>
      )}

      {/* Title row */}
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-[var(--text-primary)]
                         tracking-wide leading-tight line-clamp-2">
            {v.match}
          </p>
          <p className="text-[11px] text-[var(--text-dim)] mt-1 font-medium">
            Highlights · {v.channel ?? "ITV Sport"}
          </p>
        </div>
        {/* Open in YouTube */}
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors mt-0.5"
          title="Open in YouTube"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>
      </div>
    </div>
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
      <SectionLabel>World Cup highlights since 6pm {yestStr}</SectionLabel>
      {!data || data.length === 0 ? (
        <EmptyState message="No highlights found yet — check back after matches finish." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2 gap-4 items-start">
          {data.map((v, i) => (
            <div key={i} className="fadein" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <VideoCard v={v as VideoResult & { channel?: string }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
