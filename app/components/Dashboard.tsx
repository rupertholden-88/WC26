"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoResult, GroupStanding, Fixture, Result, fetchVideos, fetchStandings, fetchFixtures, fetchResults } from "@/app/lib/claude";
import { getStoredTz, DEFAULT_TZ } from "@/app/lib/timezone";
import VideosTab from "./VideosTab";
import StandingsTab from "./StandingsTab";
import FixturesTab from "./FixturesTab";
import ResultsTab from "./ResultsTab";

type Tab = "videos" | "results" | "standings" | "fixtures";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "videos",    label: "Highlights", icon: "▶" },
  { id: "results",    label: "Results",    icon: "⚽" },
  { id: "standings", label: "Standings",       icon: "⊞" },
  { id: "fixtures",  label: "Fixtures",        icon: "⊟" },
];

const TAB_IDS = TABS.map(t => t.id);
const SWIPE_THRESHOLD = 50;
const PULL_THRESHOLD = 80;

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initial<T>(): DataState<T> {
  return { data: null, loading: false, error: null };
}

function tabFromUrl(): Tab {
  if (typeof window === "undefined") return "videos";
  const p = new URLSearchParams(window.location.search).get("tab") as Tab | null;
  return p && (TAB_IDS as string[]).includes(p) ? p : "videos";
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("videos");
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => { setTz(getStoredTz()); }, []);

  // Sync tab from URL on mount and on browser back/forward
  useEffect(() => {
    setTab(tabFromUrl());
    const onPop = () => setTab(tabFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigateToTab = useCallback((next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.pushState(null, "", url.toString());
  }, []);

  const [videos,   setVideos]   = useState<DataState<VideoResult[]>>(initial());
  const [standing, setStanding] = useState<DataState<GroupStanding[]>>(initial());
  const [fixtures, setFixtures] = useState<DataState<Fixture[]>>(initial());
  const [results,  setResults]  = useState<DataState<Result[]>>(initial());

  const loadVideos = useCallback(async () => {
    setVideos(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchVideos();
      setVideos({ data, loading: false, error: null });
    } catch (e) {
      setVideos({ data: null, loading: false, error: `Failed to load highlights: ${(e as Error).message}` });
    }
  }, []);

  const loadStandings = useCallback(async () => {
    setStanding(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchStandings();
      setStanding({ data, loading: false, error: null });
    } catch (e) {
      setStanding({ data: null, loading: false, error: `Failed to load standings: ${(e as Error).message}` });
    }
  }, []);

  const loadResults = useCallback(async () => {
    setResults(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchResults();
      setResults({ data, loading: false, error: null });
    } catch (e) {
      setResults({ data: null, loading: false, error: "Failed to load results" });
    }
  }, []);

  const loadFixtures = useCallback(async () => {
    setFixtures(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchFixtures();
      setFixtures({ data, loading: false, error: null });
    } catch (e) {
      setFixtures({ data: null, loading: false, error: `Failed to load fixtures: ${(e as Error).message}` });
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadVideos(), loadResults(), loadStandings(), loadFixtures()]);
  }, [loadVideos, loadResults, loadStandings, loadFixtures]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Refresh on visibility change (e.g. returning to the tab) and hourly
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") loadAll(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(loadAll, 60 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [loadAll]);

  // Touch gesture refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartScrollY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartScrollY.current = window.scrollY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartScrollY.current > 5) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setPullDistance(Math.min(dy, PULL_THRESHOLD));
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    setPullDistance(0);

    if (Math.abs(dy) > Math.abs(dx)) {
      // Vertical: pull-to-refresh
      if (dy >= PULL_THRESHOLD && touchStartScrollY.current <= 5) {
        loadAll();
      }
    } else if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      // Horizontal: navigate tabs
      const idx = TABS.findIndex(t => t.id === tab);
      if (dx < 0 && idx < TABS.length - 1) navigateToTab(TABS[idx + 1].id);
      else if (dx > 0 && idx > 0)          navigateToTab(TABS[idx - 1].id);
    }
  }, [tab, navigateToTab, loadAll]);

  const pullProgress = pullDistance / PULL_THRESHOLD;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Pull-to-refresh indicator */}
      <div
        className="flex justify-center items-end overflow-hidden transition-all duration-150"
        style={{ height: pullDistance * 0.6 }}
      >
        <svg
          className={`w-4 h-4 text-[var(--accent)] mb-1 ${pullProgress >= 1 ? "spin" : ""}`}
          style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 180}deg)` }}
          viewBox="0 0 16 16" fill="none"
        >
          <path
            d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 4.5 2.35M13.5 2.5v3h-3"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[var(--border)] mt-0">
        <nav className="flex overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => navigateToTab(id)}
              className={`relative font-[family-name:var(--font-display)] text-[12px] sm:text-[13px] font-semibold
                          tracking-[0.1em] uppercase px-3 sm:px-4 py-3 transition-colors duration-150 cursor-pointer whitespace-nowrap
                          ${tab === id
                            ? "text-[var(--accent)] tab-active"
                            : "text-[var(--text-dim)] hover:text-[var(--text-secondary)]"
                          }`}
            >
              <span className="hidden sm:inline mr-1.5 opacity-60">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="py-6" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {tab === "videos"    && <VideosTab   data={videos.data}   loading={videos.loading}   error={videos.error} />}
        {tab === "standings" && <StandingsTab data={standing.data} loading={standing.loading} error={standing.error} />}
        {tab === "results"   && <ResultsTab   data={results.data}  loading={results.loading}  error={results.error}  tz={tz} />}
        {tab === "fixtures"  && <FixturesTab  data={fixtures.data} loading={fixtures.loading} error={fixtures.error} tz={tz} />}
      </div>
    </div>
  );
}
