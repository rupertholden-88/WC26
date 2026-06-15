import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    // Search last 36 hours to catch late-night uploads
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    // Search by keyword across YouTube — more robust than channel ID
    // ITV Sport LIVE uploads with "HIGHLIGHTS" in title and "FIFA" or "World Cup"
    const params = new URLSearchParams({
      part: "snippet",
      q: "ITV Sport HIGHLIGHTS World Cup 2026",
      type: "video",
      order: "date",
      publishedAfter: since,
      maxResults: "20",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate: 900 } }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[highlights] YouTube API error:", res.status, err);
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const EXCLUDE = [
      "react", "reaction", "preview", "press conference", "interview",
      "podcast", "prediction", "verdict", "pundit", "studio", "debate",
      "talking point", "neville", "keane", "they'll", "disappointed",
    ];

    const videos = (data.items ?? [])
      .filter((item: { id: { videoId?: string }; snippet: { title: string; channelTitle: string } }) => {
        if (!item.id.videoId) return false;
        const title = item.snippet.title.toLowerCase();
        const channel = item.snippet.channelTitle.toLowerCase();

        // Must be from ITV Sport
        if (!channel.includes("itv sport")) return false;

        // Must be a match highlights package
        const isHighlight =
          title.includes("highlight") ||
          title.includes("full match") ||
          title.includes("match in 30") ||
          title.includes("extended");

        // Must reference a match (two teams)
        const hasMatchFormat = title.includes(" v ") || title.includes(" vs ");

        // Exclude punditry/reaction clips
        const isPunditry = EXCLUDE.some((word) => title.includes(word));

        return (isHighlight || hasMatchFormat) && !isPunditry;
      })
      .map((item: { id: { videoId: string }; snippet: { title: string } }) => {
        const title = item.snippet.title;
        // Strip scorelines for spoiler-free display e.g. "3-1", "2–0"
        const spoilerFree = title
          .replace(/\b\d+\s*[-–]\s*\d+\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        return {
          match: spoilerFree,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          videoId: item.id.videoId,
        };
      });

    return NextResponse.json({ videos });
  } catch (e) {
    console.error("[highlights] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
