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
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamsMatch(a: string, b: string): boolean {
  const an = normalize(a);
  const bn = normalize(b);
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
};

type EspnEvent = {
  id: string;
  status: { type: { completed: boolean; state: string } };
  competitions: Array<{ competitors: EspnCompetitor[] }>;
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

    const fdRes = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!fdRes.ok) {
      const err = await fdRes.text();
      return NextResponse.json({ error: `football-data.org ${fdRes.status}: ${err}` }, { status: 502 });
    }
    const fdData = await fdRes.json();
    const finished = (fdData.matches ?? []).filter((m: { status: string }) => m.status === "FINISHED");

    // Fetch ESPN scoreboard for each unique date in the window (plus one extra day for timezone edge cases)
    const dayBefore = new Date(since.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const espnDates = [...new Set([dayBefore, dateFrom, dateTo])].map(d => d.replace(/-/g, ""));
    const espnEvents: EspnEvent[] = [];
    await Promise.all(
      espnDates.map(async date => {
        const r = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}`, { cache: "no-store" }).catch(() => null);
        if (!r?.ok) return;
        const d = await r.json().catch(() => null);
        for (const e of d?.events ?? []) {
          if (e.status?.type?.completed || e.status?.type?.state === "post") {
            espnEvents.push(e);
          }
        }
      })
    );

    // Fetch ESPN summaries in parallel
    const summaryMap = new Map<string, Record<string, unknown>>();
    await Promise.all(
      espnEvents.map(async e => {
        const r = await fetch(`${ESPN_BASE}/summary?event=${e.id}`, { cache: "no-store" }).catch(() => null);
        if (!r?.ok) return;
        const s = await r.json().catch(() => null);
        if (s) summaryMap.set(e.id, s);
      })
    );

    // Match each FD result to an ESPN event, then extract scorers from keyEvents
    type Scorers = { homeScorers: string[]; awayScorers: string[] };
    const scorersMap = new Map<number, Scorers>();

    for (const m of finished) {
      const espnEvent = espnEvents.find(e => {
        const comps = e.competitions?.[0]?.competitors ?? [];
        const espnHome = comps.find((c: EspnCompetitor) => c.homeAway === "home")?.team.displayName ?? "";
        const espnAway = comps.find((c: EspnCompetitor) => c.homeAway === "away")?.team.displayName ?? "";
        return teamsMatch(m.homeTeam.name, espnHome) && teamsMatch(m.awayTeam.name, espnAway);
      });
      if (!espnEvent) continue;

      const summary = summaryMap.get(espnEvent.id);
      if (!summary) continue;

      const comps = espnEvent.competitions?.[0]?.competitors ?? [];
      // Fall back to index order if homeAway field is missing
      const homeId = comps.find((c: EspnCompetitor) => c.homeAway === "home")?.team.id ?? comps[0]?.team.id ?? "";
      const awayId = comps.find((c: EspnCompetitor) => c.homeAway === "away")?.team.id ?? comps[1]?.team.id ?? "";

      const keyEvents = summary.keyEvents as EspnKeyEvent[] | undefined;
      if (!Array.isArray(keyEvents)) continue;

      const goals = keyEvents.filter(e => e.scoringPlay);
      scorersMap.set(m.id, {
        homeScorers: goals.filter(e => e.team?.id === homeId).map(formatEspnGoal).filter(Boolean),
        awayScorers: goals.filter(e => e.team?.id === awayId).map(formatEspnGoal).filter(Boolean),
      });
    }

    const results = finished
      .map((m: {
        id: number;
        utcDate: string;
        homeTeam: { id: number; name: string; shortName: string };
        awayTeam: { id: number; name: string; shortName: string };
        score: { fullTime: { home: number | null; away: number | null } };
        stage: string;
        group: string | null;
      }) => {
        const home = m.homeTeam.shortName ?? m.homeTeam.name;
        const away = m.awayTeam.shortName ?? m.awayTeam.name;
        const group = m.group
          ? `Group ${m.group.replace(/^GROUP[_\s]*/i, "").trim()}`
          : m.stage?.replace(/_/g, " ") ?? "";
        const { homeScorers = [], awayScorers = [] } = scorersMap.get(m.id) ?? {};
        return {
          utcDate: m.utcDate,
          time: toBST(m.utcDate),
          home,
          away,
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          homeScorers,
          awayScorers,
          group,
          channel: getBroadcaster(m.homeTeam.name, m.awayTeam.name),
        };
      })
      .sort((a: { utcDate: string }, b: { utcDate: string }) => b.utcDate.localeCompare(a.utcDate));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
