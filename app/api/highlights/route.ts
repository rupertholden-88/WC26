import { NextResponse } from "next/server";

export const maxDuration = 15;

// ITV Sport YouTube channel ID
const ITV_CHANNEL_ID = "UCOgMjN3GvKRSPvkMaRFKFEA";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    // Search ITV Sport channel for WC2026 highlights uploaded in last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: "snippet",
      channelId: ITV_CHANNEL_ID,
      q: "World Cup 2026 highlights",
      type: "video",
      order: "date",
      publishedAfter: since,
      maxResults: "10",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`,
      { next: { revalidate: 900 } } // cache 15 mins
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[highlights] YouTube API error:", res.status, err);
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const videos = (data.items ?? [])
      .filter((item: { id: { videoId?: string }; snippet: { title: string } }) => {
        const title = item.snippet.title.toLowerCase();
        // Filter to highlights/match videos, skip news/previews
        return (
          item.id.videoId &&
          (title.includes("highlight") ||
            title.includes("extended") ||
            title.includes("full match") ||
            title.includes("goals") ||
            title.includes(" v ") ||
            title.includes(" vs "))
        );
      })
      .map((item: { id: { videoId: string }; snippet: { title: string; description: string } }) => {
        const title = item.snippet.title;
        // Strip score patterns like "3-1", "2-0" etc from title for spoiler-free display
        const spoilerFree = title
          .replace(/\b\d+[-–]\d+\b/g, "")   // "3-1" -> ""
          .replace(/\s{2,}/g, " ")
          .trim();

        return {
          match: spoilerFree,
          originalTitle: title,
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
