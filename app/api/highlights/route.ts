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
      q: "ITV Sport HIGHLIGHTS World Cup 2026",
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
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    // Return raw debug info so we can see what YouTube is actually returning
    const raw = (data.items ?? []).map((item: {
      id: { videoId?: string };
      snippet: { title: string; channelTitle: string; publishedAt: string };
    }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

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
        if (!channel.includes("itv sport")) return false;
        const isHighlight =
          title.includes("highlight") ||
          title.includes("full match") ||
          title.includes("match in 30") ||
          title.includes("extended");
        const hasMatchFormat = title.includes(" v ") || title.includes(" vs ");
        const isPunditry = EXCLUDE.some((word) => title.includes(word));
        return (isHighlight || hasMatchFormat) && !isPunditry;
      })
      .map((item: { id: { videoId: string }; snippet: { title: string } }) => {
        const title = item.snippet.title;
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

    return NextResponse.json({ videos, debug: { since, totalRaw: raw.length, raw } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
