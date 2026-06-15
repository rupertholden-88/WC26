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
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const JUNK = [
      "reaction", "press conference", "interview", "podcast", "prediction",
      "verdict", "pundit", "studio", "debate", "talking point", "neville",
      "keane", "they'll", "disappointed", "live stream", "streaming",
      "video game", "simulation", "pes", "tickets", "visa", "watch party",
      "watchalong", "#shorts", "short video", "edits",
    ];

    const videos = (data.items ?? [])
      .filter((item: { id: { videoId?: string }; snippet: { title: string } }) => {
        if (!item.id.videoId) return false;
        const title = item.snippet.title.toLowerCase();
        if (JUNK.some((w) => title.includes(w))) return false;
        if (!title.includes("highlight") && !title.includes("full match") && !title.includes("extended")) return false;
        return true;
      })
      .map((item: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }) => ({
        match: item.snippet.title
          .replace(/\b\d+\s*[-–]\s*\d+\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        videoId: item.id.videoId,
        channel: item.snippet.channelTitle,
      }));

    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
