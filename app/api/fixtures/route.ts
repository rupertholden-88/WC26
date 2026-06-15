import { NextResponse } from "next/server";
import { getBroadcaster } from "@/app/lib/broadcaster";

export const maxDuration = 30;

const FD_BASE = "https://api.football-data.org/v4";
const WC_CODE = "WC";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function toBST(utcStr: string): string {
  const d = new Date(utcStr);
  // BST = UTC+1 in summer (tournament runs Jun-Jul)
  const bst = new Date(d.getTime() + 60 * 60 * 1000);
  const hh = String(bst.getUTCHours()).padStart(2, "0");
  const mm = String(bst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} BST`;
}

function dayLabel(utcStr: string): "today" | "tomorrow" | null {
  const matchDate = new Date(utcStr);
  const now = new Date();

  const matchDay = new Date(matchDate);
  matchDay.setUTCHours(0, 0, 0, 0);

  // Use BST offset to get "today" in UK time
  const ukNow = new Date(now.getTime() + 60 * 60 * 1000);
  const ukToday = new Date(ukNow);
  ukToday.setUTCHours(0, 0, 0, 0);

  const ukTomorrow = new Date(ukToday);
  ukTomorrow.setUTCDate(ukToday.getUTCDate() + 1);

  if (matchDay.getTime() === ukToday.getTime()) return "today";
  if (matchDay.getTime() === ukTomorrow.getTime()) return "tomorrow";
  return null;
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const now = new Date();
    const dateFrom = toDateStr(now);
    const dateTo = new Date(now);
    dateTo.setDate(dateTo.getDate() + 2);

    const res = await fetch(
      `${FD_BASE}/competitions/${WC_CODE}/matches?dateFrom=${dateFrom}&dateTo=${toDateStr(dateTo)}`,
      {
        headers: { "X-Auth-Token": apiKey },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[fixtures] football-data error:", res.status, err);
      return NextResponse.json({ error: `football-data.org ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const fixtures = (data.matches ?? [])
      .map((m: {
        utcDate: string;
        status: string;
        homeTeam: { name: string };
        awayTeam: { name: string };
        stage: string;
        group: string | null;
        matchStatus: string;
      }) => {
        const label = dayLabel(m.utcDate);
        if (!label) return null;

        const home = m.homeTeam.name;
        const away = m.awayTeam.name;
        const group = m.group
          ? `Group ${m.group.replace("GROUP_", "")}`
          : m.stage?.replace(/_/g, " ") ?? "";

        // Derive status from kick-off time (free tier doesn't provide live status)
        const kickoff = new Date(m.utcDate).getTime();
        const nowMs = Date.now();
        const minsElapsed = (nowMs - kickoff) / 60000;
        const status: "FINISHED" | "LIVE" | "UPCOMING" =
          minsElapsed > 110 ? "FINISHED"
          : minsElapsed > 0  ? "LIVE"
          : "UPCOMING";

        return {
          _utc: m.utcDate,
          date: label,
          time: toBST(m.utcDate),
          home,
          away,
          group,
          status,
          channel: getBroadcaster(home, away),
        };
      })
      .filter(Boolean);

    // Sort chronologically by UTC date (handles today/tomorrow correctly)
    fixtures.sort((a: { _utc: string }, b: { _utc: string }) => a._utc.localeCompare(b._utc));

    const clean = fixtures.map(({ _utc, ...rest }: { _utc: string; [key: string]: unknown }) => rest);
    return NextResponse.json({ fixtures: clean });
  } catch (e) {
    console.error("[fixtures] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
