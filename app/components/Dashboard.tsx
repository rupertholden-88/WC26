"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoResult, GroupStanding, Fixture, Result, fetchVideos, fetchStandings, fetchFixtures, fetchResults } from "@/app/lib/claude";
import { getStoredTz, DEFAULT_TZ } from "@/app/lib/timezone";
import TzSelector from "./TzSelector";
import VideosTab from "./VideosTab";
import StandingsTab from "./StandingsTab";
import FixturesTab from "./FixturesTab";
import ResultsTab from "./ResultsTab";

type Tab = "videos" | "results" | "standings" | "fixtures";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "videos",    label: "Highlights", icon: "▶" },
  { id: "results",   label: "Results",    icon: "⚽" },
  { id: "standings", label: "Standings",  icon: "⊞" },
  { id: "fixtures",  label: "Fixtures",   icon: "⊟" },
];

const TAB_IDS = TABS.map(t => t.id);
const SWIPE_THRESHOLD = 60;
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
  const [refreshing, setRefreshing] = useState(false);
  const [tz, setTz] = useState<string>(DEFAULT_TZ);

  // Swipe animation state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeTarget, setSwipeTarget] = useState<Tab | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartScrollY = useRef(0);
  const gestureType = useRef<"none" | "horizontal" | "vertical">("none");

  useEffect(() => { setTz(getStoredTz()); }, []);

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
    try { setVideos({ data: await fetchVideos(), loading: false, error: null }); }
    catch (e) { setVideos({ data: null, loading: false, error: `Failed to load highlights: ${(e as Error).message}` }); }
  }, []);

  const loadStandings = useCallback(async () => {
    setStanding(s => ({ ...s, loading: true, error: null }));
    try { setStanding({ data: await fetchStandings(), loading: false, error: null }); }
    catch (e) { setStanding({ data: null, loading: false, error: `Failed to load standings: ${(e as Error).message}` }); }
  }, []);

  const loadResults = useCallback(async () => {
    setResults(s => ({ ...s, loading: true, error: null }));
    try { setResults({ data: await fetchResults(), loading: false, error: null }); }
    catch (e) { setResults({ data: null, loading: false, error: "Failed to load results" }); }
  }, []);

  const loadFixtures = useCallback(async () => {
    setFixtures(s => ({ ...s, loading: true, error: null }));
    try { setFixtures({ data: await fetchFixtures(), loading: false, error: null }); }
    catch (e) { setFixtures({ data: null, loading: false, error: `Failed to load fixtures: ${(e as Error).message}` }); }
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadVideos(), loadResults(), loadStandings(), loadFixtures()]);
    setRefreshing(false);
  }, [loadVideos, loadResults, loadStandings, loadFixtures]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartScrollY.current = window.scrollY;
    gestureType.current = "none";
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock gesture direction after 8px of movement
    if (gestureType.current === "none") {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        gestureType.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      }
      return;
    }

    if (gestureType.current === "vertical") {
      if (touchStartScrollY.current <= 5 && dy > 0) {
        setPullDistance(Math.min(dy, PULL_THRESHOLD));
      }
      return;
    }

    // Horizontal swipe: update offset and target
    const idx = TABS.findIndex(t => t.id === tab);
    const atStart = idx === 0 && dx > 0;
    const atEnd   = idx === TABS.length - 1 && dx < 0;
    // Rubber-band at edges
    const offset = (atStart || atEnd) ? dx * 0.15 : dx;
    setSwipeOffset(offset);

    const targetIdx = dx < 0 ? idx + 1 : idx - 1;
    if (targetIdx >= 0 && targetIdx < TABS.length) {
      setSwipeTarget(TABS[targetIdx].id);
    }
  }, [tab]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    if (gestureType.current === "vertical") {
      setPullDistance(0);
      if (dy >= PULL_THRESHOLD && touchStartScrollY.current <= 5) loadAll();
      return;
    }

    if (gestureType.current === "horizontal" && Math.abs(dx) >= SWIPE_THRESHOLD && swipeTarget) {
      // Animate to completion
      const w = contentRef.current?.offsetWidth ?? window.innerWidth;
      setTransitioning(true);
      setSwipeOffset(dx < 0 ? -w : w);
      setTimeout(() => {
        navigateToTab(swipeTarget);
        setSwipeOffset(0);
        setSwipeTarget(null);
        setTransitioning(false);
      }, 280);
    } else {
      // Snap back
      setTransitioning(true);
      setSwipeOffset(0);
      setTimeout(() => {
        setSwipeTarget(null);
        setTransitioning(false);
      }, 280);
    }

    setPullDistance(0);
  }, [swipeTarget, navigateToTab, loadAll]);

  const containerWidth = contentRef.current?.offsetWidth ?? (typeof window !== "undefined" ? window.innerWidth : 375);
  const progress = Math.min(Math.abs(swipeOffset) / containerWidth, 1);
  const pullProgress = pullDistance / PULL_THRESHOLD;

  function renderTab(id: Tab) {
    switch (id) {
      case "videos":    return <VideosTab    data={videos.data}   loading={videos.loading}   error={videos.error} />;
      case "standings": return <StandingsTab data={standing.data} loading={standing.loading} error={standing.error} />;
      case "results":   return <ResultsTab   data={results.data}  loading={results.loading}  error={results.error}  tz={tz} />;
      case "fixtures":  return <FixturesTab  data={fixtures.data} loading={fixtures.loading} error={fixtures.error} tz={tz} />;
    }
  }

  const transition = transitioning ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.28s ease" : "none";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Pull-to-refresh indicator */}
      <div
        className="flex justify-center items-end overflow-hidden"
        style={{ height: pullDistance * 0.55, transition: pullDistance === 0 ? "height 0.2s ease" : "none" }}
      >
        <svg
          className={`w-4 h-4 text-[#f5a623] mb-1 ${pullProgress >= 1 ? "spin" : ""}`}
          style={{
            opacity: pullProgress,
            transform: `rotate(${pullProgress * 180}deg)`,
            transition: "opacity 0.1s, transform 0.1s",
          }}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 4.5 2.35M13.5 2.5v3h-3"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Tab bar + Refresh */}
      <div className="border-b border-[#1a2d45]">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <nav className="flex shrink-0">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => navigateToTab(id)}
                className={`relative font-[family-name:var(--font-display)] text-[12px] sm:text-[13px] font-semibold
                            tracking-[0.1em] uppercase px-3 sm:px-4 py-3 transition-colors duration-150 cursor-pointer whitespace-nowrap
                            ${tab === id ? "text-[#f5a623] tab-active" : "text-[#4a6a8a] hover:text-[#8aa8c8]"}`}
              >
                <span className="hidden sm:inline mr-1.5 opacity-60">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[11px] font-semibold
                       tracking-[0.12em] uppercase text-[#4a6a8a] hover:text-[#f5a623] bg-[#111e30]
                       border border-[#1a2d45] hover:border-[#f5a623]/30 rounded-lg px-3 py-2
                       transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            <svg className={`w-3 h-3 ${refreshing ? "spin" : ""}`} viewBox="0 0 16 16" fill="none">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 4.5 2.35M13.5 2.5v3h-3"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh
          </button>
          <TzSelector value={tz} onChange={setTz} />
        </div>
      </div>

      {/* Content — swipeable */}
      <div
        ref={contentRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current tab */}
        <div
          style={{
            transform: `translateX(${swipeOffset}px)`,
            opacity: 1 - progress * 0.4,
            transition,
            willChange: "transform, opacity",
          }}
          className="py-6"
        >
          {renderTab(tab)}
        </div>

        {/* Incoming tab — slides in from the opposite side */}
        {swipeTarget && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateX(${(swipeOffset < 0 ? containerWidth : -containerWidth) + swipeOffset}px)`,
              opacity: progress * 0.9 + 0.1,
              transition,
              willChange: "transform, opacity",
            }}
            className="py-6"
          >
            {renderTab(swipeTarget)}
          </div>
        )}
      </div>
    </div>
  );
}
