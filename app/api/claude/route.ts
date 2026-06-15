import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

type Message = {
  role: "user" | "assistant";
  content: string | object[];
};

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const messages: Message[] = [{ role: "user", content: prompt }];
  let finalText = "";

  try {
    for (let i = 0; i < 10; i++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Anthropic API error: ${err}` }, { status: 502 });
      }

      const data = await res.json();

      const textBlocks = data.content.filter((b: { type: string }) => b.type === "text");
      if (textBlocks.length > 0) {
        finalText = textBlocks.map((b: { text: string }) => b.text).join("\n");
      }

      if (data.stop_reason === "end_turn") break;

      if (data.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: data.content });
        const toolResults = data.content
          .filter((b: { type: string }) => b.type === "tool_use")
          .map((b: { id: string }) => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: "Search completed.",
          }));
        messages.push({ role: "user", content: toolResults });
      } else {
        break;
      }
    }

    return NextResponse.json({ text: finalText });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
