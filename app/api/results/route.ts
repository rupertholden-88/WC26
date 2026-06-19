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

    // Fetch ESPN scoreboard for each date
    const espnDates = [...new Set([dateFrom, dateTo])].map(d => d.replace(/-/g, ""));
    type EspnEvent = { id: string; date: string; competitions: Array<{ competitors: Array<{ homeAway: string; team: { displayName: string } }> }> };
    const espnEvents: EspnEvent[] = [];
    const espnRaw: unknown[] = [];

    await Promise.all(espnDates.map(async date => {
      const url = `${ESPN}/scoreboard?dates=${date}`;
      const r = await fetch(url, { cache: "no-store" }).catch(() => null);
      if (!r) { espnRaw.push({ date, error: "fetch failed" }); return; }
      const d = await r.json().catch(() => null);
      espnRaw.push({ date, status: r.status, eventCount: d?.events?.length ?? 0 });
      for (const e of d?.events ?? []) {
        if (e.status?.type?.completed) espnEvents.push(e);
      }
    }));

    const summaries = await Promise.all(
      espnEvents.map(e =>
        fetch(`${ESPN}/summary?event=${e.id}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    const firstSummary = summaries[0];

    return NextResponse.json({
      _debug: {
        espnDates,
        espnRaw,
        espnEventsFound: espnEvents.length,
        firstEventTeams: espnEvents[0]?.competitions?.[0]?.competitors?.map(c => c.team.displayName),
        firstSummaryKeys: firstSummary ? Object.keys(firstSummary) : null,
        firstScoringPlays: firstSummary?.scoringPlays?.slice(0, 2) ?? null,
      },
      results: finished.map((m: { utcDate: string; homeTeam: { name: string; shortName: string }; awayTeam: { name: string; shortName: string }; score: { fullTime: { home: number | null; away: number | null } }; stage: string; group: string | null }) => ({
        utcDate: m.utcDate,
        time: toBST(m.utcDate),
        home: m.homeTeam.shortName ?? m.homeTeam.name,
        away: m.awayTeam.shortName ?? m.awayTeam.name,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        homeScorers: [],
        awayScorers: [],
        group: m.group ? `Group ${m.group.replace(/^GROUP[_\s]*/i, "").trim()}` : m.stage?.replace(/_/g, " ") ?? "",
        channel: getBroadcaster(m.homeTeam.name, m.awayTeam.name),
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
