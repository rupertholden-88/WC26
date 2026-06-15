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

    const TRUSTED = ["fifa", "itv sport", "fox sports", "bbc sport"];
    const JUNK = [
      "reaction", "press conference", "interview", "podcast", "prediction",
      "verdict", "pundit", "studio", "debate", "talking point", "neville",
      "keane", "they'll", "disappointed", "live stream", "streaming",
      "video game", "simulation", "pes", "tickets", "visa", "carry england",
      "backs japan", "one day", "watch party", "watchalong",
    ];

    const raw = (data.items ?? []).map((item: { id: { videoId?: string }; snippet: { title: string; channelTitle: string; publishedAt: string } }) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      trusted: TRUSTED.some(c => item.snippet.channelTitle.toLowerCase().includes(c)),
      hasHighlight: item.snippet.title.toLowerCase().includes("highlight") || item.snippet.title.toLowerCase().includes("full match") || item.snippet.title.toLowerCase().includes("extended"),
      isJunk: JUNK.some(w => item.snippet.title.toLowerCase().includes(w)),
    }));

    const videos = raw
      .filter((item: { videoId?: string; trusted: boolean; hasHighlight: boolean; isJunk: boolean }) =>
        item.videoId && item.trusted && item.hasHighlight && !item.isJunk
      )
      .map((item: { videoId: string; title: string; channel: string }) => ({
        match: item.title.replace(/\b\d+\s*[-–]\s*\d+\b/g, "").replace(/\s{2,}/g, " ").trim(),
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        videoId: item.videoId,
        channel: item.channel,
      }));

    return NextResponse.json({ videos, debug: { since, raw } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
