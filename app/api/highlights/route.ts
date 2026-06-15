import { NextResponse } from "next/server";

export const maxDuration = 15;

// ITV Sport uploads playlist (channel UC... -> UU...)
const ITV_UPLOADS_PLAYLIST = "UUBzDz6beXDfMtfxQdEutD_w";

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not set" }, { status: 500 });
  }

  try {
    // Fetch latest 50 uploads from ITV Sport channel via playlist
    const params = new URLSearchParams({
      part: "snippet",
      playlistId: ITV_UPLOADS_PLAYLIST,
      maxResults: "50",
      key: apiKey,
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `YouTube API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();

    const since = Date.now() - 24 * 60 * 60 * 1000;

    const JUNK = [
      "reaction", "press conference", "interview", "podcast", "prediction",
      "verdict", "pundit", "studio", "debate", "talking point", "neville",
      "keane", "they'll", "disappointed", "tickets", "visa",
      "mount rushmore", "backs ", "carry ", "one day", "can harry",
    ];

    const videos = (data.items ?? [])
      .filter((item: {
        snippet: {
          title: string;
          publishedAt: string;
          resourceId: { videoId?: string };
        }
      }) => {
        const { title, publishedAt, resourceId } = item.snippet;
        if (!resourceId.videoId) return false;
        if (new Date(publishedAt).getTime() < since) return false;
        const t = title.toLowerCase();
        if (!t.includes("highlight")) return false;
        if (!t.includes(" v ") && !t.includes(" vs ")) return false;
        if (JUNK.some((w) => t.includes(w))) return false;
        return true;
      })
      .map((item: {
        snippet: {
          title: string;
          resourceId: { videoId: string };
        }
      }) => ({
        match: item.snippet.title
          .replace(/\b\d+\s*[-–]\s*\d+\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        videoId: item.snippet.resourceId.videoId,
        channel: "ITV Sport",
      }));

    return NextResponse.json({ videos });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
