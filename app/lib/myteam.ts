// "My team" personalisation — stored team + name matching against the various
// spellings the data sources use (football-data full names, ESPN short names).

export const MY_TEAM_KEY = "wc26_my_team";

export interface Team {
  name: string;
  flag: string;
}

// All 48 WC2026 finalists.
export const TEAMS: Team[] = [
  { name: "Algeria", flag: "🇩🇿" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Bosnia-Herzegovina", flag: "🇧🇦" },
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Cape Verde", flag: "🇨🇻" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Curaçao", flag: "🇨🇼" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "DR Congo", flag: "🇨🇩" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Haiti", flag: "🇭🇹" },
  { name: "Iran", flag: "🇮🇷" },
  { name: "Iraq", flag: "🇮🇶" },
  { name: "Ivory Coast", flag: "🇨🇮" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "New Zealand", flag: "🇳🇿" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Panama", flag: "🇵🇦" },
  { name: "Paraguay", flag: "🇵🇾" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
  { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "South Africa", flag: "🇿🇦" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Tunisia", flag: "🇹🇳" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "USA", flag: "🇺🇸" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Uzbekistan", flag: "🇺🇿" },
];

// Map alternate spellings onto one canonical key (post-normalisation).
const ALIASES: Record<string, string> = {
  unitedstates: "usa",
  turkiye: "turkey",
  cotedivoire: "ivorycoast",
  czechia: "czechrepublic",
  capeverdeislands: "capeverde",
  bosniaandherzegovina: "bosniaherzegovina",
  democraticrepublicofcongo: "drcongo",
  korearepublic: "southkorea",
  irrepublicofiran: "iran",
};

export function teamKey(name: string): string {
  const k = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ALIASES[k] ?? k;
}

// Does a team name from any data source refer to the user's chosen team?
export function isTeam(dataName: string | null | undefined, myTeam: string): boolean {
  if (!dataName) return false;
  const a = teamKey(dataName);
  const b = teamKey(myTeam);
  return a === b || (b.length > 3 && a.includes(b)) || (a.length > 3 && b.includes(a));
}

export function getStoredTeam(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MY_TEAM_KEY);
}

export function setStoredTeam(name: string | null): void {
  if (name) localStorage.setItem(MY_TEAM_KEY, name);
  else localStorage.removeItem(MY_TEAM_KEY);
}
