import { NextResponse } from "next/server";

export const maxDuration = 15;

const ITV_CHANNEL_ID = "UCBzDz6beXDfMtfxQdEutD_w";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: "snippet",
      channelId: ITV_CHANNEL_ID,
      type: "video",
      order: "date",
      publishedAfter: since,
      maxResults: "50",
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

    const raw = (data.items ?? []).map((item: { id: { videoId?: string; kind: string }; snippet: { title: string; channelId: string; channelTitle: string; publishedAt: string } }) => ({
      videoId: item.id.videoId,
      kind: item.id.kind,
      title: item.snippet.title,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    return NextResponse.json({ videos: [], debug: { since, total: raw.length, raw } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
