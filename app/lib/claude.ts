// Types
export interface VideoResult {
  match: string;
  url: string;
  videoId: string;
}

export interface TeamStanding {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
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
  utcDate: string;
  home: string;
  away: string;
  group: string;
  status: "FINISHED" | "LIVE" | "UPCOMING";
  channel: "ITV" | "BBC";
  homeProb?: number;
  drawProb?: number;
  awayProb?: number;
}

export interface Result {
  time: string;
  utcDate: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  homeScorers: string[];
  awayScorers: string[];
  group: string;
  channel: "ITV" | "BBC";
  status?: "FINISHED" | "LIVE";
  clock?: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export async function fetchVideos(): Promise<VideoResult[]> {
  const data = await apiFetch<{ videos: VideoResult[] }>("/api/highlights");
  return data.videos ?? [];
}

export async function fetchStandings(): Promise<GroupStanding[]> {
  const data = await apiFetch<{ groups: GroupStanding[] }>("/api/standings");
  return data.groups ?? [];
}

export async function fetchFixtures(): Promise<Fixture[]> {
  const data = await apiFetch<{ fixtures: Fixture[] }>("/api/fixtures");
  return data.fixtures ?? [];
}

export async function fetchResults(): Promise<Result[]> {
  const data = await apiFetch<{ results: Result[] }>("/api/results");
  return data.results ?? [];
}
