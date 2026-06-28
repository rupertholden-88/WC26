import { NextResponse } from "next/server";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

const STAGE_ORDER = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE_PLAY_OFF",
  "FINAL",
];

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE_PLAY_OFF: "3rd Place Play-off",
  FINAL: "Final",
};

function toBST(utcStr: string): string {
  const d = new Date(utcStr);
  const bst = new Date(d.getTime() + 60 * 60 * 1000);
  return `${String(bst.getUTCHours()).padStart(2, "0")}:${String(bst.getUTCMinutes()).padStart(2, "0")} BST`;
}

function toDisplayDate(utcStr: string): string {
  return new Date(utcStr).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London",
  });
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/matches`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 300 } }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    type MatchMap = Record<string, object[]>;
    const rounds: MatchMap = {};

    for (const m of (data.matches ?? []) as Array<Record<string, unknown>>) {
      const stage = m.stage as string;
      if (!STAGE_ORDER.includes(stage)) continue;

      const homeTeam = m.homeTeam as Record<string, unknown> | null;
      const awayTeam = m.awayTeam as Record<string, unknown> | null;
      const score = m.score as Record<string, unknown> | null;
      const fullTime = score?.fullTime as Record<string, number | null> | null;
      const winner = score?.winner as string | null;

      const utcDate = m.utcDate as string;
      const minsElapsed = (Date.now() - new Date(utcDate).getTime()) / 60000;
      const status =
        minsElapsed > 110 ? "FINISHED" : minsElapsed > 0 ? "LIVE" : "UPCOMING";

      if (!rounds[stage]) rounds[stage] = [];
      rounds[stage].push({
        utcDate,
        displayDate: toDisplayDate(utcDate),
        displayTime: toBST(utcDate),
        home: (homeTeam?.name as string) ?? null,
        away: (awayTeam?.name as string) ?? null,
        homeCrest: (homeTeam?.crest as string) ?? null,
        awayCrest: (awayTeam?.crest as string) ?? null,
        homeScore: fullTime?.home ?? null,
        awayScore: fullTime?.away ?? null,
        winner: winner === "HOME_TEAM" ? "HOME" : winner === "AWAY_TEAM" ? "AWAY" : null,
        status,
      });
    }

    for (const stage of Object.keys(rounds)) {
      (rounds[stage] as Array<Record<string, unknown>>).sort(
        (a, b) => (a.utcDate as string).localeCompare(b.utcDate as string)
      );
    }

    const bracket = STAGE_ORDER
      .filter(s => rounds[s])
      .map(s => ({ stage: s, label: STAGE_LABELS[s], matches: rounds[s] }));

    return NextResponse.json({ bracket });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
