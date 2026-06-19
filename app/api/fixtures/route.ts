import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

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
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamsMatch(a: string, b: string): boolean {
  const an = normalize(a);
  const bn = normalize(b);
  return an === bn || (an.length > 3 && bn.includes(an)) || (bn.length > 3 && an.includes(bn));
}

type EspnCompetitor = {
  homeAway: "home" | "away";
  team: { displayName: string };
};

type EspnOdds = {
  homeTeamOdds?: { current?: { winPercentage?: number } };
  awayTeamOdds?: { current?: { winPercentage?: number } };
  drawOdds?: { current?: { winPercentage?: number } };
};

function toProb(v: number | undefined): number {
  if (v == null) return 0;
  return Math.round(v <= 1 ? v * 100 : v);
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

    // Fetch FD fixtures and ESPN scoreboard in parallel
    const espnDates = [...new Set([dateFrom, toDateStr(dateTo)])].map(d => d.replace(/-/g, ""));

    const [fdRes, ...espnResults] = await Promise.all([
      fetch(
        `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${toDateStr(dateTo)}`,
        { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 300 } }
      ),
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

    // Build probability map from ESPN odds
    type Probs = { homeProb: number; drawProb: number; awayProb: number };
    const probMap = new Map<string, Probs>();

    // Collect upcoming event IDs to try predictor endpoint as fallback
    const upcomingEvents: Array<{ id: string; homeAway: EspnCompetitor[] }> = [];

    for (const espnData of espnResults) {
      for (const e of espnData?.events ?? []) {
        const comp = e.competitions?.[0];
        const comps: EspnCompetitor[] = comp?.competitors ?? [];
        const espnHome = comps.find((c: EspnCompetitor) => c.homeAway === "home")?.team.displayName ?? comps[0]?.team.displayName ?? "";
        const espnAway = comps.find((c: EspnCompetitor) => c.homeAway === "away")?.team.displayName ?? comps[1]?.team.displayName ?? "";
        const key = espnHome && espnAway ? `${normalize(espnHome)}|${normalize(espnAway)}` : null;

        // Try scoreboard-embedded odds first
        const odds: EspnOdds = comp?.odds?.[0];
        if (odds) {
          const homeProb = toProb(odds.homeTeamOdds?.current?.winPercentage);
          const awayProb = toProb(odds.awayTeamOdds?.current?.winPercentage);
          const drawProb = toProb(odds.drawOdds?.current?.winPercentage);
          if ((homeProb || awayProb) && key) {
            probMap.set(key, { homeProb, drawProb, awayProb });
            continue;
          }
        }

        // Queue upcoming events for predictor fallback
        const isUpcoming = !e.status?.type?.completed && e.status?.type?.state !== "post";
        if (isUpcoming && key) {
          upcomingEvents.push({ id: e.id, homeAway: comps });
        }
      }
    }

    // Try ESPN summary pickcenter + core predictor for events without scoreboard odds
    let _debugFirst: Record<string, unknown> | null = null;
    await Promise.all(
      upcomingEvents.map(async ({ id, homeAway }, idx) => {
        const comps = homeAway;
        const espnHome = comps.find(c => c.homeAway === "home")?.team.displayName ?? comps[0]?.team.displayName ?? "";
        const espnAway = comps.find(c => c.homeAway === "away")?.team.displayName ?? comps[1]?.team.displayName ?? "";
        if (!espnHome || !espnAway) return;
        const key = `${normalize(espnHome)}|${normalize(espnAway)}`;

        // Try summary pickcenter
        const sr = await fetch(`${ESPN_BASE}/summary?event=${id}`, { cache: "no-store" }).catch(() => null);
        const summary = sr?.ok ? await sr.json().catch(() => null) : null;

        // Try core API predictor
        const predUrl = `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/events/${id}/competitions/${id}/predictor`;
        const pr = await fetch(predUrl, { cache: "no-store" }).catch(() => null);
        const pred = pr?.ok ? await pr.json().catch(() => null) : null;

        if (idx === 0) {
          _debugFirst = {
            id,
            summaryKeys: summary ? Object.keys(summary) : null,
            pickcenter: summary?.pickcenter?.[0] ?? null,
            predictor: pred,
            predictorStatus: pr?.status ?? null,
          };
        }

        // Extract from summary pickcenter
        const pc = (summary?.pickcenter as Array<Record<string, unknown>> | undefined)?.[0];
        const pcHome = pc?.homeTeamOdds as Record<string, Record<string, number>> | undefined;
        const pcAway = pc?.awayTeamOdds as Record<string, Record<string, number>> | undefined;
        const pcDraw = pc?.drawOdds as Record<string, Record<string, number>> | undefined;
        const predHome = pred?.homeTeam as Record<string, number> | undefined;
        const predAway = pred?.awayTeam as Record<string, number> | undefined;

        const homeProb = toProb(pcHome?.current?.winPercentage ?? predHome?.teamChancePct ?? predHome?.gameProjection);
        const awayProb = toProb(pcAway?.current?.winPercentage ?? predAway?.teamChancePct ?? predAway?.gameProjection);
        if (!homeProb && !awayProb) return;

        const drawRaw = toProb(pcDraw?.current?.winPercentage ?? (pred?.tieChancePct as number | undefined));
        const drawProb = drawRaw || Math.max(0, 100 - homeProb - awayProb);
        probMap.set(key, { homeProb, drawProb, awayProb });
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

        const home = m.homeTeam.name;
        const away = m.awayTeam.name;
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

        // Find matching ESPN odds by team name
        const espnKey = [...probMap.keys()].find(k => {
          const [h, a] = k.split("|");
          return teamsMatch(home, h) && teamsMatch(away, a);
        });
        const probs = espnKey ? probMap.get(espnKey) : undefined;

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
    return NextResponse.json({ fixtures: clean, _debug: _debugFirst });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
