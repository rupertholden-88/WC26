export interface VideoResult {
  match: string;
  group: string;
  url: string;
}

export interface TeamStanding {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  pts: number;
}

export interface GroupStanding {
  group: string;
  teams: TeamStanding[];
}

export interface Fixture {
  date: "today" | "tomorrow";
  time: string;
  home: string;
  away: string;
  group: string;
  channel: "ITV" | "BBC";
}

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`API route error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text ?? "";
}

function parseJSONArray<T>(text: string): T[] | null {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      return JSON.parse(clean.slice(start, end + 1)) as T[];
    }
  } catch {}
  return null;
}

function formatDate(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "long" })} ${d.getFullYear()}`;
}

export async function fetchVideos(): Promise<VideoResult[]> {
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yestStr = yest.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const prompt = `Search YouTube for ITV Sport highlights videos of FIFA World Cup 2026 matches uploaded in the last 24 hours (since 6pm on ${yestStr}).

Return ONLY a JSON array. Each object: { "match": "Team A v Team B", "group": "Group X", "url": "https://www.youtube.com/watch?v=..." }

Rules:
- Only ITV Sport YouTube channel (@ITVSport) uploads
- Only highlights/full match videos, not individual goal clips
- Do NOT include scorelines in the "match" field — team names only
- Return [] if none found
- Return raw JSON only, no markdown fences`;

  const text = await callClaude(prompt);
  return parseJSONArray<VideoResult>(text) ?? [];
}

export async function fetchStandings(): Promise<GroupStanding[]> {
  const todayStr = formatDate(new Date());

  const prompt = `Search for "FIFA World Cup 2026 group standings" and get the current standings for all 12 groups (A through L) as of ${todayStr}.

Search Wikipedia group pages or FIFA.com for accurate data.

You MUST return a JSON array in EXACTLY this format:

[
  {
    "group": "A",
    "teams": [
      { "name": "Mexico", "played": 1, "won": 1, "drawn": 0, "lost": 0, "gd": 2, "pts": 3 },
      { "name": "South Africa", "played": 1, "won": 0, "drawn": 0, "lost": 1, "gd": -2, "pts": 0 },
      { "name": "South Korea", "played": 0, "won": 0, "drawn": 0, "lost": 0, "gd": 0, "pts": 0 },
      { "name": "Czechia", "played": 0, "won": 0, "drawn": 0, "lost": 0, "gd": 0, "pts": 0 }
    ]
  }
]

Rules:
- All 12 groups A through L
- Exactly 4 teams per group ordered by current position
- Use real data from your search
- Return ONLY the JSON array, nothing else, no markdown`;

  const text = await callClaude(prompt);
  return parseJSONArray<GroupStanding>(text) ?? [];
}

export async function fetchFixtures(): Promise<Fixture[]> {
  const now = new Date();
  const todayStr = formatDate(now);
  const tom = new Date(now);
  tom.setDate(now.getDate() + 1);
  const tomStr = formatDate(tom);

  const prompt = `Search for FIFA World Cup 2026 fixtures on ${todayStr} and ${tomStr}, and which UK channel (BBC or ITV) each match is on.

All 104 matches are split between BBC and ITV. Search sportsmole.co.uk or similar for the UK TV schedule.

Return ONLY a JSON array:
[
  { "date": "today", "time": "21:00 BST", "home": "Belgium", "away": "Egypt", "group": "Group G", "channel": "ITV" }
]

Rules:
- "date" must be exactly "today" or "tomorrow"
- Include ALL matches for both days, times in BST
- "channel" must be exactly "ITV" or "BBC"
- Return raw JSON array only, no markdown`;

  const text = await callClaude(prompt);
  return parseJSONArray<Fixture>(text) ?? [];
}
