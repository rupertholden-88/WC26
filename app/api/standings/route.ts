import { NextResponse } from "next/server";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

// Hardcoded group structure — all 48 teams in their correct groups
// Used to seed missing teams when the API hasn't populated them yet
const GROUP_SEEDS: Record<string, string[]> = {
  A: ["Mexico", "South Korea", "Czechia", "South Africa"],
  B: ["Switzerland", "Canada", "Qatar", "Bosnia-Herzegovina"],
  C: ["Scotland", "Morocco", "Brazil", "Haiti"],
  D: ["United States", "Australia", "Turkey", "Paraguay"],
  E: ["Germany", "Ivory Coast", "Ecuador", "Curaçao"],
  F: ["Sweden", "Japan", "Netherlands", "Tunisia"],
  G: ["Egypt", "Belgium", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde Islands", "Saudi Arabia", "Uruguay"],
  I: ["France", "Iraq", "Norway", "Senegal"],
  J: ["Algeria", "Argentina", "Jordan", "Austria"],
  K: ["Congo DR", "Colombia", "Portugal", "Uzbekistan"],
  L: ["England", "Ghana", "Croatia", "Panama"],
};

type Team = { name: string; played: number; won: number; drawn: number; lost: number; gf: number; gd: number; pts: number };

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${FD_BASE}/competitions/${WC_CODE}/standings`, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const totalStandings = data.standings?.filter((s: { type: string }) => s.type === "TOTAL") ?? [];

    // Build a map of team name -> live stats from API
    const liveTeams: Record<string, Team> = {};
    for (const standing of totalStandings) {
      for (const row of standing.table ?? []) {
        const name = row.team.name as string;
        liveTeams[name] = {
          name,
          played: row.playedGames,
          won: row.won,
          drawn: row.draw,
          lost: row.lost,
          gf: row.goalsFor,
          gd: row.goalDifference,
          pts: row.points,
        };
      }
    }

    // Also try normalised names (Cape Verde Islands vs Cape Verde)
    const nameAliases: Record<string, string> = {
      "Cape Verde": "Cape Verde Islands",
      "Bosnia and Herzegovina": "Bosnia-Herzegovina",
      "DR Congo": "Congo DR",
      "Türkiye": "Turkey",
      "Korea Republic": "South Korea",
      "USA": "United States",
      "Ivory Coast": "Ivory Coast",
      "Côte d'Ivoire": "Ivory Coast",
    };

    // Build final groups using seeds, overlaying live data
    const groups = Object.entries(GROUP_SEEDS).map(([groupLetter, seedTeams]) => {
      const teams: Team[] = seedTeams.map((seedName) => {
        // Try exact match first, then alias
        const liveKey = Object.keys(liveTeams).find(k =>
          k === seedName ||
          k === nameAliases[seedName] ||
          nameAliases[k] === seedName ||
          k.toLowerCase() === seedName.toLowerCase()
        );
        if (liveKey && liveTeams[liveKey]) {
          return { ...liveTeams[liveKey], name: seedName };
        }
        // Not in API yet — return zeroed entry
        return { name: seedName, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, gd: 0, pts: 0 };
      });

      // Sort by pts desc, then gd desc
      teams.sort((a, b) => b.pts - a.pts || b.gd - a.gd);

      return { group: groupLetter, teams };
    });

    return NextResponse.json({ groups });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
