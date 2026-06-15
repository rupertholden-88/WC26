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

    // football-data.org has a bug where Group H is split into "Atlantic Division" and "Central Division"
    // Merge any non-letter groups into Group H
    const letterGroups: Record<string, { group: string; teams: { name: string; played: number; won: number; drawn: number; lost: number; gd: number; pts: number }[] }> = {};
    const orphanTeams: { name: string; played: number; won: number; drawn: number; lost: number; gd: number; pts: number }[] = [];

    for (const g of groups) {
      if (/^[A-L]$/.test(g.group)) {
        letterGroups[g.group] = g;
      } else {
        // Non-standard group name — collect orphan teams to merge into H
        orphanTeams.push(...g.teams);
      }
    }

    // Merge orphans into Group H
    if (orphanTeams.length > 0) {
      if (!letterGroups["H"]) letterGroups["H"] = { group: "H", teams: [] };
      const existing = letterGroups["H"].teams.map((t: { name: string }) => t.name);
      for (const t of orphanTeams) {
        if (!existing.includes(t.name)) letterGroups["H"].teams.push(t);
      }
      // Sort Group H by points desc, then GD desc
      letterGroups["H"].teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd);
    }

    const validGroups = Object.values(letterGroups)
      .sort((a, b) => a.group.localeCompare(b.group));

    return NextResponse.json({ groups: validGroups });
  } catch (e) {
    console.error("[standings] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Suppress unused import warning
void getBroadcaster;
