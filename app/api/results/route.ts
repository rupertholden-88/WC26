import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

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
      {
        headers: { "X-Auth-Token": apiKey },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const results = (data.matches ?? [])
      .map((m: {
        utcDate: string;
        status: string;
        homeTeam: { name: string; shortName: string };
        awayTeam: { name: string; shortName: string };
        score: { fullTime: { home: number | null; away: number | null } };
        stage: string;
        group: string | null;
      }) => {
        if (m.status !== "FINISHED") return null;
        const home = m.homeTeam.shortName ?? m.homeTeam.name;
        const away = m.awayTeam.shortName ?? m.awayTeam.name;
        const group = m.group
          ? `Group ${m.group.replace(/^GROUP[_\s]*/i, "").trim()}`
          : m.stage?.replace(/_/g, " ") ?? "";
        return {
          utcDate: m.utcDate,
          time: toBST(m.utcDate),
          home,
          away,
          homeScore: m.score.fullTime.home,
          awayScore: m.score.fullTime.away,
          group,
          channel: getBroadcaster(m.homeTeam.name, m.awayTeam.name),
        };
      })
      .filter(Boolean)
      .sort((a: { utcDate: string }, b: { utcDate: string }) => b.utcDate.localeCompare(a.utcDate));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
