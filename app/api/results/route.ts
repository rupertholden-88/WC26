import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

function toBST(utcStr: string): string {
  const d = new Date(utcStr);
  const bst = new Date(d.getTime() + 60 * 60 * 1000);
  const hh = String(bst.getUTCHours()).padStart(2, "0");
  const mm = String(bst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const NAME_ALIASES: Record<string, string> = {
  "south korea": "korea republic",
  "republic of korea": "korea republic",
  "usa": "united states",
  "us": "united states",
  "dr congo": "congo dr",
  "democratic republic of congo": "congo dr",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "türkiye": "turkey",
  "cape verde": "cape verde islands",
  "bosnia and herzegovina": "bosnia-herzegovina",
  "bosnia & herzegovina": "bosnia-herzegovina",
};

function norm(name: string): string {
  const lower = name.toLowerCase().trim();
  return NAME_ALIASES[lower] ?? lower;
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

    // Fetch football-data.org match list
    const res = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED`,
      { headers: { "X-Auth-Token": apiKey }, cache: "no-store" }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }
    const data = await res.json();
    const finished = (data.matches ?? []).filter((m: { status: string }) => m.status === "FINISHED");

    // Fetch ESPN scoreboard for each date to get event IDs
    const espnDates = [...new Set([dateFrom, dateTo])].map(d => d.replace(/-/g, ""));
    type EspnEvent = { id: string; date: string; competitions: Array<{ competitors: Array<{ homeAway: string; team: { displayName: string } }> }> };
    const espnEvents: EspnEvent[] = [];
    await Promise.all(espnDates.map(async date => {
      const r = await fetch(`${ESPN}/scoreboard?dates=${date}`, { cache: "no-store" }).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json().catch(() => null);
      for (const e of d?.events ?? []) {
        if (e.status?.type?.completed) espnEvents.push(e);
      }
    }));

    // Fetch individual ESPN summaries in parallel for scoring plays
    const summaries = await Promise.all(
      espnEvents.map(e =>
        fetch(`${ESPN}/summary?event=${e.id}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    // Build scorer map keyed by "homeNorm|awayNorm"
    const scorerMap: Record<string, { home: string[]; away: string[] }> = {};
    for (let i = 0; i < espnEvents.length; i++) {
      const event = espnEvents[i];
      const summary = summaries[i];
      if (!summary) continue;
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const homeComp = comp.competitors?.find(c => c.homeAway === "home");
      const awayComp = comp.competitors?.find(c => c.homeAway === "away");
      if (!homeComp || !awayComp) continue;

      const homeNorm = norm(homeComp.team.displayName);
      const awayNorm = norm(awayComp.team.displayName);
      const key = `${homeNorm}|${awayNorm}`;
      const entry = { home: [] as string[], away: [] as string[] };

      for (const play of summary.scoringPlays ?? []) {
        const playerName = play.athletesInvolved?.[0]?.displayName ?? "";
        if (!playerName) continue;
        const lastName = playerName.split(" ").pop() ?? playerName;
        const minute = play.clock?.value != null ? Math.floor(play.clock.value / 60) : "?";
        const suffix = play.type?.text?.toLowerCase().includes("own") ? " (OG)"
          : play.type?.text?.toLowerCase().includes("penalty") ? " (P)" : "";
        const formatted = `${lastName} ${minute}'${suffix}`;
        const teamNorm = norm(play.team?.displayName ?? "");
        if (teamNorm === homeNorm) entry.home.push(formatted);
        else if (teamNorm === awayNorm) entry.away.push(formatted);
      }

      scorerMap[key] = entry;
    }

    const results = finished
      .map((m: {
        utcDate: string;
        homeTeam: { name: string; shortName: string };
        awayTeam: { name: string; shortName: string };
        score: { fullTime: { home: number | null; away: number | null } };
        stage: string;
        group: string | null;
      }) => {
        const home = m.homeTeam.shortName ?? m.homeTeam.name;
        const away = m.awayTeam.shortName ?? m.awayTeam.name;
        const group = m.group
          ? `Group ${m.group.replace(/^GROUP[_\s]*/i, "").trim()}`
          : m.stage?.replace(/_/g, " ") ?? "";
        const key = `${norm(m.homeTeam.name)}|${norm(m.awayTeam.name)}`;
        const scorers = scorerMap[key] ?? { home: [], away: [] };
        return {
          utcDate: m.utcDate,
          time: toBST(m.utcDate),
          home,
          away,
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          homeScorers: scorers.home,
          awayScorers: scorers.away,
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
