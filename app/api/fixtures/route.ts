import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";
import { fetchPolymarketProbs } from "@/app/lib/polymarket";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function toBST(utcStr: string): string {
  const d = new Date(utcStr);
  const bst = new Date(d.getTime() + 60 * 60 * 1000);
  const hh = String(bst.getUTCHours()).padStart(2, "0");
  const mm = String(bst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} BST`;
}

function dayLabel(utcStr: string): "today" | "tomorrow" | null {
  const matchDate = new Date(utcStr);
  const now = new Date();

  const matchDay = new Date(matchDate);
  matchDay.setUTCHours(0, 0, 0, 0);

  const ukNow = new Date(now.getTime() + 60 * 60 * 1000);
  const ukToday = new Date(ukNow);
  ukToday.setUTCHours(0, 0, 0, 0);

  const ukTomorrow = new Date(ukToday);
  ukTomorrow.setUTCDate(ukToday.getUTCDate() + 1);

  if (matchDay.getTime() === ukToday.getTime()) return "today";
  if (matchDay.getTime() === ukTomorrow.getTime()) return "tomorrow";
  return null;
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

function mlToImplied(ml: number): number {
  return ml > 0 ? 100 / (ml + 100) : Math.abs(ml) / (Math.abs(ml) + 100);
}

function mlToProbs(homeML: number, drawML: number, awayML: number) {
  const rh = mlToImplied(homeML);
  const rd = mlToImplied(drawML);
  const ra = mlToImplied(awayML);
  const total = rh + rd + ra;
  return {
    homeProb: Math.round((rh / total) * 100),
    drawProb: Math.round((rd / total) * 100),
    awayProb: Math.round((ra / total) * 100),
  };
}

type EspnCompetitor = {
  homeAway: "home" | "away";
  team: { displayName: string };
};

type Probs = { homeProb: number; drawProb: number; awayProb: number };

// Find a probability entry for a fixture in a "normHome|normAway"-keyed map,
// using fuzzy team-name matching.
function lookupProbs(map: Map<string, Probs>, home: string, away: string): Probs | undefined {
  const key = [...map.keys()].find(k => {
    const [h, a] = k.split("|");
    return teamsMatch(home, h) && teamsMatch(away, a);
  });
  return key ? map.get(key) : undefined;
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const now = new Date();
    const dateFrom = toDateStr(now);
    const dateTo = new Date(now);
    dateTo.setDate(dateTo.getDate() + 2);

    const dayMid = new Date(now);
    dayMid.setDate(dayMid.getDate() + 1);
    const espnDates = [...new Set([dateFrom, toDateStr(dayMid), toDateStr(dateTo)])].map(d => d.replace(/-/g, ""));

    const [fdRes, pmProbMap, ...espnResults] = await Promise.all([
      fetch(
        `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${toDateStr(dateTo)}`,
        { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 300 } }
      ),
      // Primary odds source: Polymarket prediction-market prices.
      fetchPolymarketProbs().catch(() => new Map<string, { homeProb: number; drawProb: number; awayProb: number }>()),
      ...espnDates.map(date =>
        fetch(`${ESPN_BASE}/scoreboard?dates=${date}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ),
    ]);

    if (!fdRes.ok) {
      const err = await fdRes.text();
      return NextResponse.json({ error: `football-data.org ${fdRes.status}: ${err}` }, { status: 502 });
    }
    const data = await fdRes.json();

    // Collect upcoming ESPN events for summary/pickcenter fetching
    type EspnEventRef = { id: string; homeKey: string; awayKey: string };
    const upcomingEvents: EspnEventRef[] = [];

    for (const espnData of espnResults) {
      for (const e of espnData?.events ?? []) {
        const comp = e.competitions?.[0];
        const comps: EspnCompetitor[] = comp?.competitors ?? [];
        const espnHome = comps.find((c: EspnCompetitor) => c.homeAway === "home")?.team.displayName ?? comps[0]?.team.displayName ?? "";
        const espnAway = comps.find((c: EspnCompetitor) => c.homeAway === "away")?.team.displayName ?? comps[1]?.team.displayName ?? "";
        if (!espnHome || !espnAway) continue;

        const isUpcoming = !e.status?.type?.completed && e.status?.type?.state !== "post";
        if (isUpcoming) {
          upcomingEvents.push({ id: e.id, homeKey: normalize(espnHome), awayKey: normalize(espnAway) });
        }
      }
    }

    // Fetch ESPN summaries in parallel to extract pickcenter moneyline odds
    // (fallback source when Polymarket has no market for a fixture).
    const probMap = new Map<string, Probs>();

    await Promise.all(
      upcomingEvents.map(async ({ id, homeKey, awayKey }) => {
        const sr = await fetch(`${ESPN_BASE}/summary?event=${id}`, { cache: "no-store" }).catch(() => null);
        const summary = sr?.ok ? await sr.json().catch(() => null) : null;
        if (!summary) return;

        const pc = (summary.pickcenter as Array<Record<string, unknown>> | undefined)?.[0];
        if (!pc) return;

        const homeML = (pc.homeTeamOdds as Record<string, number> | undefined)?.moneyLine;
        const awayML = (pc.awayTeamOdds as Record<string, number> | undefined)?.moneyLine;
        const drawML = (pc.drawOdds as Record<string, number> | undefined)?.moneyLine;
        if (homeML == null || awayML == null || drawML == null) return;

        probMap.set(`${homeKey}|${awayKey}`, mlToProbs(homeML, drawML, awayML));
      })
    );

    const fixtures = (data.matches ?? [])
      .map((m: {
        utcDate: string;
        status: string;
        homeTeam: { name: string };
        awayTeam: { name: string };
        stage: string;
        group: string | null;
      }) => {
        const label = dayLabel(m.utcDate);
        if (!label) return null;

        const home = m.homeTeam?.name;
        const away = m.awayTeam?.name;
        if (!home || !away) return null;
        const group = m.group
          ? `Group ${m.group.replace("GROUP_", "")}`
          : m.stage?.replace(/_/g, " ") ?? "";

        const kickoff = new Date(m.utcDate).getTime();
        const nowMs = Date.now();
        const minsElapsed = (nowMs - kickoff) / 60000;
        const status: "FINISHED" | "LIVE" | "UPCOMING" =
          minsElapsed > 110 ? "FINISHED"
          : minsElapsed > 0  ? "LIVE"
          : "UPCOMING";

        // Prefer Polymarket prediction-market prices; fall back to ESPN odds.
        const probs = lookupProbs(pmProbMap, home, away) ?? lookupProbs(probMap, home, away);

        return {
          _utc: m.utcDate,
          date: label,
          time: toBST(m.utcDate),
          utcDate: m.utcDate,
          home,
          away,
          group,
          status,
          channel: getBroadcaster(home, away),
          ...(probs && status === "UPCOMING" ? probs : {}),
        };
      })
      .filter(Boolean);

    fixtures.sort((a: { _utc: string }, b: { _utc: string }) => a._utc.localeCompare(b._utc));
    const clean = fixtures.map(({ _utc: _ignored, ...rest }: { _utc: string; [key: string]: unknown }) => rest);
    return NextResponse.json({ fixtures: clean });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
