"use client";

import { useState, useEffect, useCallback } from "react";
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
  { id: "results",    label: "Results",    icon: "⚽" },
  { id: "standings", label: "Standings",       icon: "⊞" },
  { id: "fixtures",  label: "Fixtures",        icon: "⊟" },
];

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initial<T>(): DataState<T> {
  return { data: null, loading: false, error: null };
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("videos");
  const [refreshing, setRefreshing] = useState(false);
  const [tz, setTz] = useState<string>(DEFAULT_TZ);

  useEffect(() => { setTz(getStoredTz()); }, []);

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
    setRefreshing(true);
    await Promise.all([loadVideos(), loadResults(), loadStandings(), loadFixtures()]);
    setRefreshing(false);
  }, [loadVideos, loadResults, loadStandings, loadFixtures]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Tab bar + Refresh */}
      <div className="border-b border-[#1a2d45] mt-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
        <nav className="flex shrink-0">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative font-[family-name:var(--font-display)] text-[12px] sm:text-[13px] font-semibold
                          tracking-[0.1em] uppercase px-3 sm:px-4 py-3 transition-colors duration-150 cursor-pointer whitespace-nowrap
                          ${tab === id
                            ? "text-[#f5a623] tab-active"
                            : "text-[#4a6a8a] hover:text-[#8aa8c8]"
                          }`}
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
          <svg
            className={`w-3 h-3 ${refreshing ? "spin" : ""}`}
            viewBox="0 0 16 16" fill="none"
          >
            <path
              d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 4.5 2.35M13.5 2.5v3h-3"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          Refresh
        </button>
        <TzSelector value={tz} onChange={setTz} />
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {tab === "videos"    && <VideosTab   data={videos.data}   loading={videos.loading}   error={videos.error} />}
        {tab === "standings" && <StandingsTab data={standing.data} loading={standing.loading} error={standing.error} />}
        {tab === "results"   && <ResultsTab   data={results.data}  loading={results.loading}  error={results.error}  tz={tz} />}
        {tab === "fixtures"  && <FixturesTab  data={fixtures.data} loading={fixtures.loading} error={fixtures.error} tz={tz} />}
      </div>
    </div>
  );
}
