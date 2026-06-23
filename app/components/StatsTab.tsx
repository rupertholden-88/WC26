"use client";

import { useRef, useState, useCallback } from "react";
import { TopScorer } from "@/app/lib/claude";
import { Spinner, ErrorState, EmptyState, SectionLabel } from "./ui";

interface Props {
  data: TopScorer[] | null;
  loading: boolean;
  error: string | null;
}

interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: string;
}

async function fetchWikiSummary(name: string): Promise<WikiSummary | null> {
  try {
    // Try direct lookup first (works when name matches article title)
    const direct = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
      { headers: { Accept: "application/json" } }
    );
    if (direct.ok) {
      const d = await direct.json();
      if (d.type !== "disambiguation" && d.extract) {
        return { title: d.title, extract: d.extract, thumbnail: d.thumbnail?.source };
      }
    }

    // Fall back to search API
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + " footballer")}&format=json&origin=*&srlimit=1`
    );
    const sd = await search.json();
    const title = sd.query?.search?.[0]?.title;
    if (!title) return null;

    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!summary.ok) return null;
    const d = await summary.json();
    return { title: d.title, extract: d.extract ?? "", thumbnail: d.thumbnail?.source };
  } catch {
    return null;
  }
}

function PlayerModal({
  player,
  wiki,
  wikiLoading,
  onClose,
}: {
  player: string;
  wiki: WikiSummary | null;
  wikiLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {wikiLoading ? (
          <div className="p-10 flex flex-col items-center gap-3 text-[var(--text-dim)]">
            <div className="spin w-6 h-6 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full" />
            <p className="text-[11px] tracking-widest uppercase">Loading…</p>
          </div>
        ) : wiki ? (
          <>
            {wiki.thumbnail && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={wiki.thumbnail}
                alt={wiki.title}
                className="w-full h-52 object-cover object-top rounded-t-2xl"
              />
            )}
            <div className="p-5">
              <h2 className="font-[family-name:var(--font-display)] text-[17px] font-bold text-[var(--text-primary)] mb-3 leading-tight">
                {wiki.title}
              </h2>
              <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                {wiki.extract}
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full py-2.5 rounded-xl bg-[var(--bg-mid)] border border-[var(--border)]
                           text-[var(--text-dim)] text-[11px] font-bold tracking-[0.18em] uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[var(--text-dim)] text-sm mb-1">{player}</p>
            <p className="text-[var(--text-faint)] text-xs">No Wikipedia article found.</p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-[var(--bg-mid)] border border-[var(--border)]
                         text-[var(--text-dim)] text-[11px] font-bold tracking-[0.18em] uppercase cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
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

const LONG_PRESS_MS = 550;

export default function StatsTab({ data, loading, error }: Props) {
  const [modalPlayer, setModalPlayer] = useState<string | null>(null);
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [wikiLoading, setWikiLoading] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const openModal = useCallback(async (name: string) => {
    setModalPlayer(name);
    setWiki(null);
    setWikiLoading(true);
    const result = await fetchWikiSummary(name);
    setWiki(result);
    setWikiLoading(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalPlayer(null);
    setWiki(null);
  }, []);

  const startPress = useCallback((name: string) => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openModal(name);
    }, LONG_PRESS_MS);
  }, [openModal]);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState message="No scorer data yet — check back once the tournament has started." />;

  let rank = 0;
  let prevGoals = -1;

  return (
    <div className="fadein">
      <SectionLabel>Top Scorers · Golden Boot</SectionLabel>
      <p className="text-[11px] text-[var(--text-faint)] mb-4">Long-press any player for their Wikipedia bio.</p>

      <div className="flex flex-col gap-2">
        {data.map((s, i) => {
          if (s.goals !== prevGoals) {
            rank = i + 1;
            prevGoals = s.goals;
          }

          const isTop3 = rank <= 3;
          const wikiUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(s.name)}&go=Go`;

          return (
            <a
              key={i}
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors no-underline
                          hover:border-[var(--accent)] group select-none
                          ${isTop3
                            ? "bg-[var(--bg-card)] border-[var(--border)]"
                            : "bg-[var(--bg-finished)] border-[var(--border-dim)]"}`}
              onMouseDown={() => startPress(s.name)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(s.name)}
              onTouchEnd={e => {
                cancelPress();
                if (didLongPress.current) e.preventDefault();
              }}
              onTouchMove={cancelPress}
              onClick={e => {
                if (didLongPress.current) {
                  e.preventDefault();
                  didLongPress.current = false;
                }
              }}
            >
              {/* Rank */}
              <div className={`shrink-0 w-7 text-center font-[family-name:var(--font-display)] font-bold text-[13px]
                               ${getMedalColour(rank)}`}>
                {rank <= 3 ? getRankLabel(rank) : rank}
              </div>

              {/* Team crest */}
              {s.teamCrest ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.teamCrest} alt={s.team} className="shrink-0 w-6 h-6 object-contain" />
              ) : (
                <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--bg-mid)]" />
              )}

              {/* Name + team */}
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] text-[14px] font-semibold text-[var(--text-primary)] leading-tight truncate group-hover:text-[var(--accent)] transition-colors">
                  {s.name}
                </p>
                <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
                  {s.team}{s.nationality ? ` · ${s.nationality}` : ""}
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
            </a>
          );
        })}
      </div>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          wiki={wiki}
          wikiLoading={wikiLoading}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
