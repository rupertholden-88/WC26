import { NextResponse } from "next/server";

export const maxDuration = 15;

// ITV Sport YouTube channel ID (verified from @ITVSport page)
const ITV_CHANNEL_ID = "UCBzDz6beXDfMtfxQdEutD_w";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    // Search last 36 hours to catch late-night uploads
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: "snippet",
      channelId: ITV_CHANNEL_ID,
      q: "World Cup highlights",
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
      .filter((item: { id: { videoId?: string }; snippet: { title: string } }) => {
        if (!item.id.videoId) return false;
        const title = item.snippet.title.toLowerCase();

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
