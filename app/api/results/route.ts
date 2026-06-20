import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

function toBST(utcStr: string): string {
  const d = new Date(utcStr);
  const bst = new Date(d.getTime() + 60 * 60 * 1000);
  const hh = String(bst.getUTCHours()).padStart(2, "0");
  const mm = String(bst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalize(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const ALIASES: Record<string, string> = { turkiye: "turkey" };
function canonical(s: string): string { return ALIASES[s] ?? s; }

function teamsMatch(a: string, b: string): boolean {
  const an = canonical(normalize(a));
  const bn = canonical(normalize(b));
  return an === bn || (an.length > 3 && bn.includes(an)) || (bn.length > 3 && an.includes(bn));
}

type EspnKeyEvent = {
  scoringPlay: boolean;
  text?: string;
  team: { id: string };
  clock: { displayValue: string };
  participants: Array<{
    type: { id: string; text: string };
    athlete: { displayName: string; shortName: string };
  }>;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  team: { id: string; displayName: string };
  score?: string;
};

type EspnEvent = {
  id: string;
  date: string;
  status: {
    displayClock?: string;
    type: { completed: boolean; state: string };
  };
  competitions: Array<{ competitors: EspnCompetitor[] }>;
};

type FdMatch = {
  id: number;
  utcDate: string;
  homeTeam: { id: number; name: string; shortName: string };
  awayTeam: { id: number; name: string; shortName: string };
  score: { fullTime: { home: number | null; away: number | null } };
  stage: string;
  group: string | null;
  status: string;
};

function formatEspnGoal(ev: EspnKeyEvent): string {
  // ESPN uses various type IDs — try known ones, fall back to first non-assist participant
  const scorer =
    ev.participants?.find(p =>
      p.type?.id === "scorer" ||
      p.type?.id === "goalScorer" ||
      p.type?.text?.toLowerCase().includes("scor")
    ) ??
    ev.participants?.find(p => !p.type?.text?.toLowerCase().includes("assist")) ??
    ev.participants?.[0];

  let name =
    scorer?.athlete?.shortName?.split(" ").pop() ??
    scorer?.athlete?.displayName?.split(" ").pop() ??
    "";

  // Last resort: pull name from event text (e.g. "Messi 45'" or "Goal: Messi")
  if (!name && ev.text) {
    const m = ev.text.match(/^([A-Z][^\d(]+)/);
    if (m) name = m[1].trim().split(" ").pop() ?? "";
  }

  if (!name) return "";

  const raw = ev.clock?.displayValue ?? "";
  const min = raw.includes(":") ? raw.split(":")[0] + "'" : raw;
  const isOG = ev.participants?.some(
    p => p.type?.id === "ownGoalScorer" || p.type?.text?.toLowerCase().includes("own goal")
  );
  return `${name} ${min}${isOG ? " (OG)" : ""}`.trim();
}

function espnClock(e: EspnEvent): string {
  const raw = e.status?.displayClock ?? "";
  return raw.includes(":") ? raw.split(":")[0] + "'" : raw;
}

function fdGroup(m: FdMatch): string {
  return m.group
    ? `Group ${m.group.replace(/^GROUP[_\s]*/i, "").trim()}`
    : m.stage?.replace(/_/g, " ") ?? "";
}

function extractScorers(
  espnEvent: EspnEvent,
  summaryMap: Map<string, Record<string, unknown>>
): { homeScorers: string[]; awayScorers: string[] } {
  const summary = summaryMap.get(espnEvent.id);
  if (!summary) return { homeScorers: [], awayScorers: [] };
  const comps = espnEvent.competitions?.[0]?.competitors ?? [];
  const homeId = comps.find(c => c.homeAway === "home")?.team.id ?? comps[0]?.team.id ?? "";
  const awayId = comps.find(c => c.homeAway === "away")?.team.id ?? comps[1]?.team.id ?? "";
  const keyEvents = summary.keyEvents as EspnKeyEvent[] | undefined;
  if (!Array.isArray(keyEvents)) return { homeScorers: [], awayScorers: [] };
  const goals = keyEvents.filter(ev => ev.scoringPlay);
  return {
    homeScorers: goals.filter(ev => ev.team?.id === homeId).map(formatEspnGoal).filter(Boolean),
    awayScorers: goals.filter(ev => ev.team?.id === awayId).map(formatEspnGoal).filter(Boolean),
  };
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateFrom = since.toISOString().split("T")[0];
    const dateTo = now.toISOString().split("T")[0];

    // Fetch all FD matches in window (finished + live)
    const fdRes = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!fdRes.ok) {
      const err = await fdRes.text();
      return NextResponse.json({ error: `football-data.org ${fdRes.status}: ${err}` }, { status: 502 });
    }
    const fdData = await fdRes.json();
    const allFdMatches: FdMatch[] = fdData.matches ?? [];
    const fdFinished = allFdMatches.filter(m => m.status === "FINISHED");
    const fdLive = allFdMatches.filter(m => m.status === "IN_PLAY" || m.status === "PAUSED");

    // Fetch ESPN scoreboard for each unique date in the window
    const dayBefore = new Date(since.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const espnDates = [...new Set([dayBefore, dateFrom, dateTo])].map(d => d.replace(/-/g, ""));
    const completedEspnEvents: EspnEvent[] = [];
    const liveEspnEvents: EspnEvent[] = [];

    await Promise.all(
      espnDates.map(async date => {
        const r = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}`, { cache: "no-store" }).catch(() => null);
        if (!r?.ok) return;
        const d = await r.json().catch(() => null);
        for (const e of d?.events ?? []) {
          if (e.status?.type?.completed || e.status?.type?.state === "post") {
            completedEspnEvents.push(e);
          } else if (e.status?.type?.state === "in") {
            liveEspnEvents.push(e);
          }
        }
      })
    );

    // Fetch ESPN summaries for all events in parallel
    const summaryMap = new Map<string, Record<string, unknown>>();
    await Promise.all(
      [...completedEspnEvents, ...liveEspnEvents].map(async e => {
        const r = await fetch(`${ESPN_BASE}/summary?event=${e.id}`, { cache: "no-store" }).catch(() => null);
        if (!r?.ok) return;
        const s = await r.json().catch(() => null);
        if (s) summaryMap.set(e.id, s);
      })
    );

    // Build finished results
    const finishedResults = fdFinished.map(m => {
      const espnEvent = completedEspnEvents.find(e => {
        const comps = e.competitions?.[0]?.competitors ?? [];
        const eh = comps.find((c: EspnCompetitor) => c.homeAway === "home")?.team.displayName ?? "";
        const ea = comps.find((c: EspnCompetitor) => c.homeAway === "away")?.team.displayName ?? "";
        return teamsMatch(m.homeTeam.name, eh) && teamsMatch(m.awayTeam.name, ea);
      });
      const { homeScorers = [], awayScorers = [] } = espnEvent
        ? extractScorers(espnEvent, summaryMap)
        : {};
      return {
        utcDate: m.utcDate,
        time: toBST(m.utcDate),
        home: m.homeTeam.shortName ?? m.homeTeam.name,
        away: m.awayTeam.shortName ?? m.awayTeam.name,
        homeScore: m.score.fullTime.home ?? 0,
        awayScore: m.score.fullTime.away ?? 0,
        homeScorers,
        awayScorers,
        group: fdGroup(m),
        channel: getBroadcaster(m.homeTeam.name, m.awayTeam.name),
        status: "FINISHED" as const,
      };
    }).sort((a, b) => b.utcDate.localeCompare(a.utcDate));

    // Build live results from ESPN data (use FD for names/group when matched)
    const liveResults = liveEspnEvents.map(e => {
      const comps = e.competitions?.[0]?.competitors ?? [];
      const homeComp = comps.find(c => c.homeAway === "home") ?? comps[0];
      const awayComp = comps.find(c => c.homeAway === "away") ?? comps[1];
      const espnHome = homeComp?.team.displayName ?? "";
      const espnAway = awayComp?.team.displayName ?? "";

      const fdMatch = fdLive.find(m =>
        teamsMatch(m.homeTeam.name, espnHome) && teamsMatch(m.awayTeam.name, espnAway)
      );

      const { homeScorers, awayScorers } = extractScorers(e, summaryMap);
      return {
        utcDate: fdMatch?.utcDate ?? e.date ?? "",
        time: toBST(fdMatch?.utcDate ?? e.date ?? ""),
        home: fdMatch?.homeTeam.shortName ?? fdMatch?.homeTeam.name ?? espnHome,
        away: fdMatch?.awayTeam.shortName ?? fdMatch?.awayTeam.name ?? espnAway,
        homeScore: parseInt(homeComp?.score ?? "0") || 0,
        awayScore: parseInt(awayComp?.score ?? "0") || 0,
        homeScorers,
        awayScorers,
        group: fdMatch ? fdGroup(fdMatch) : "",
        channel: getBroadcaster(fdMatch?.homeTeam.name ?? espnHome, fdMatch?.awayTeam.name ?? espnAway),
        status: "LIVE" as const,
        clock: espnClock(e),
      };
    });

    return NextResponse.json({ results: [...liveResults, ...finishedResults] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
