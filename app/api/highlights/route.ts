import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  try {
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    const prompt = `Search YouTube right now for FIFA World Cup 2026 match highlight videos uploaded in the last 24 hours.

Return ONLY a JSON array with no markdown, no explanation, just raw JSON like this:
[
  {"title": "HIGHLIGHTS - Team A v Team B | FIFA World Cup 2026", "videoId": "xxxxxxxxxxx"},
  {"title": "Highlights | Team C 2-1 Team D | FIFA World Cup 2026™", "videoId": "yyyyyyyyyyy"}
]

Today is ${today}. Only include actual match highlight videos (not punditry, reactions, previews, interviews or live streams). Include the real YouTube video ID for each. If you cannot find any, return an empty array [].`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[highlights] Gemini error:", res.status, err);
      return NextResponse.json({ error: `Gemini API ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    // Strip any markdown fences
    const clean = text.replace(/```json|```/g, "").trim();

    let items: { title: string; videoId: string }[] = [];
    try {
      items = JSON.parse(clean);
    } catch {
      console.error("[highlights] Failed to parse Gemini response:", clean);
      return NextResponse.json({ error: "Failed to parse Gemini response", raw: clean }, { status: 500 });
    }

    const videos = items
      .filter((item) => item.videoId && item.title)
      .map((item) => ({
        match: item.title
          .replace(/\b\d+[-–]\d+\b/g, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        videoId: item.videoId,
      }));

    return NextResponse.json({ videos });
  } catch (e) {
    console.error("[highlights] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
