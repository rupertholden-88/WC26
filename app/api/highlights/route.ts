import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: "snippet",
      q: "FIFA World Cup 2026 highlights",
      type: "video",
      order: "date",
      publishedAfter: since,
      maxResults: "20",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[highlights] YouTube API error:", res.status, err);
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    // Trusted highlight channels
    const TRUSTED_CHANNELS = ["fifa", "itv sport", "fox sports", "bbc sport"];

    const EXCLUDE = [
      "react", "reaction", "preview", "press conference", "interview",
      "podcast", "prediction", "verdict", "pundit", "studio", "debate",
      "talking point", "neville", "keane", "they'll", "disappointed",
      "live stream", "streaming", "video game", "simulation", "pes", "fifa 2",
      "wakawaka", "#", "tickets", "visa",
    ];

    const videos = (data.items ?? [])
      .filter((item: { id: { videoId?: string }; snippet: { title: string; channelTitle: string } }) => {
        if (!item.id.videoId) return false;
        const title = item.snippet.title.toLowerCase();
        const channel = item.snippet.channelTitle.toLowerCase();

        // Must be from a trusted channel
        const isTrusted = TRUSTED_CHANNELS.some((c) => channel.includes(c));
        if (!isTrusted) return false;

        // Must be a match highlights package
        const isHighlight =
          title.includes("highlight") ||
          title.includes("full match") ||
          title.includes("extended highlight");

        // Must reference a match (two teams)
        const hasMatchFormat = title.includes(" v ") || title.includes(" vs ");

        // Exclude punditry/reaction/non-match clips
        const isPunditry = EXCLUDE.some((word) => title.includes(word));

        return (isHighlight && hasMatchFormat) && !isPunditry;
      })
      .map((item: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }) => {
        const title = item.snippet.title;
        const spoilerFree = title
          .replace(/\b\d+\s*[-–]\s*\d+\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        return {
          match: spoilerFree,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          videoId: item.id.videoId,
          channel: item.snippet.channelTitle,
        };
      });

    return NextResponse.json({ videos });
  } catch (e) {
    console.error("[highlights] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
