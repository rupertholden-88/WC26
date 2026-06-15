// Supported timezones for the dashboard
export const TIMEZONES = [
  { label: "London (BST)",       value: "Europe/London",            abbr: "BST" },
  { label: "Brisbane (AEST)",    value: "Australia/Brisbane",       abbr: "AEST" },
  { label: "Curitiba (BRT)",     value: "America/Sao_Paulo",        abbr: "BRT" },
  { label: "New York (EDT)",     value: "America/New_York",         abbr: "EDT" },
  { label: "Los Angeles (PDT)", value: "America/Los_Angeles",      abbr: "PDT" },
  { label: "Paris (CEST)",       value: "Europe/Paris",             abbr: "CEST" },
  { label: "Dubai (GST)",        value: "Asia/Dubai",               abbr: "GST" },
  { label: "Sydney (AEST)",      value: "Australia/Sydney",         abbr: "AEST" },
  { label: "UTC",                value: "UTC",                      abbr: "UTC" },
];

export const DEFAULT_TZ = "Europe/London";
export const TZ_STORAGE_KEY = "wc26_timezone";

export function formatInTz(utcStr: string, tz: string): string {
  return new Date(utcStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
}

export function getStoredTz(): string {
  if (typeof window === "undefined") return DEFAULT_TZ;
  return localStorage.getItem(TZ_STORAGE_KEY) ?? DEFAULT_TZ;
}

export function setStoredTz(tz: string): void {
  localStorage.setItem(TZ_STORAGE_KEY, tz);
}

export function getTzAbbr(tz: string): string {
  return TIMEZONES.find(t => t.value === tz)?.abbr ?? tz;
}
