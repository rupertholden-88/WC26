import { NextResponse } from "next/server";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

type FdScorer = {
  player: {
    name: string;
    firstName: string;
    lastName: string;
    nationality: string;
  };
  team: {
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number;
};

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/scorers?limit=20`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const scorers = (data.scorers ?? [] as FdScorer[]).map((s: FdScorer) => ({
      name: s.player.name,
      nationality: s.player.nationality,
      team: s.team.shortName ?? s.team.name,
      teamCrest: s.team.crest,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      penalties: s.penalties ?? 0,
      playedMatches: s.playedMatches ?? 0,
    }));

    return NextResponse.json({ scorers });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
