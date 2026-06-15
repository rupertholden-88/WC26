import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

export const maxDuration = 30;

// football-data.org: WC = World Cup competition code, free tier
const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${FD_BASE}/competitions/${WC_CODE}/standings`, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 300 }, // cache 5 mins
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[standings] football-data error:", res.status, err);
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    // Transform to our GroupStanding format
    // football-data returns standings array with type TOTAL/HOME/AWAY
    const totalStandings = data.standings?.filter((s: { type: string }) => s.type === "TOTAL") ?? [];

    const groups = totalStandings.map((standing: {
      group: string;
      table: Array<{
        position: number;
        team: { name: string };
        playedGames: number;
        won: number;
        draw: number;
        lost: number;
        goalDifference: number;
        points: number;
      }>;
    }) => ({
      group: (standing.group ?? "?").replace(/^GROUP[_\s]*/i, "").trim(),
      teams: standing.table.map((row) => ({
        name: row.team.name,
        played: row.playedGames,
        won: row.won,
        drawn: row.draw,
        lost: row.lost,
        gd: row.goalDifference,
        pts: row.points,
      })),
    }));

    // Sort groups A-L
    groups.sort((a: { group: string }, b: { group: string }) => a.group.localeCompare(b.group));

    return NextResponse.json({ groups });
  } catch (e) {
    console.error("[standings] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Suppress unused import warning
void getBroadcaster;
