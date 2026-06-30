// Polymarket (Gamma API) match-odds helper.
// Pulls live prediction-market prices for World Cup matches and converts them
// to home/draw/away win probabilities. Used as the primary source for the
// fixture probability bars, with ESPN bookmaker odds as a fallback.
//
// Note: this runs server-side from the deployed app (open internet on Vercel).
// Some sandboxed/dev environments block api.polymarket.com — in that case the
// fetch fails quietly and callers fall back to ESPN.

const GAMMA_BASE = "https://gamma-api.polymarket.com";

// Candidate tag slugs a World Cup match might live under. We query each and
// merge — whichever ones exist return data, the rest are ignored.
const TAG_SLUGS = ["fifa-world-cup", "world-cup", "soccer"];

export interface MatchProbs {
  homeProb: number;
  drawProb: number;
  awayProb: number;
}

interface GammaMarket {
  groupItemTitle?: string;
  outcomes?: string;       // JSON-encoded array, e.g. '["Yes","No"]'
  outcomePrices?: string;  // JSON-encoded array, e.g. '["0.46","0.54"]'
  active?: boolean;
  closed?: boolean;
}

interface GammaEvent {
  title?: string;
  slug?: string;
  markets?: GammaMarket[];
}

function normalize(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseJsonArr(s: string | undefined): string[] {
  if (!s) return [];
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}

// Pull a 3-way (team / draw / team) probability split out of one Gamma event.
// Handles both market shapes Polymarket uses:
//   1. Grouped binary markets — one Yes/No market per outcome, labelled by
//      `groupItemTitle` ("Germany" / "Draw" / "Paraguay").
//   2. A single multi-outcome market — `outcomes` is the label list.
function extractMatchProbs(
  ev: GammaEvent
): { labels: [string, string]; drawProb: number; probs: [number, number] } | null {
  const markets = (ev.markets ?? []).filter(m => m && m.active !== false && m.closed !== true);
  if (markets.length === 0) return null;

  const entries: { label: string; price: number }[] = [];

  if (markets.length >= 2 && markets.every(m => m.groupItemTitle)) {
    // Grouped binary markets: read each market's "Yes" price.
    for (const m of markets) {
      const outs = parseJsonArr(m.outcomes);
      const prices = parseJsonArr(m.outcomePrices).map(Number);
      const yesIdx = outs.findIndex(o => /^yes$/i.test(o));
      const price = yesIdx >= 0 ? prices[yesIdx] : prices[0];
      if (m.groupItemTitle && Number.isFinite(price)) {
        entries.push({ label: m.groupItemTitle, price });
      }
    }
  } else {
    // Single multi-outcome market.
    const m = markets[0];
    const outs = parseJsonArr(m.outcomes);
    const prices = parseJsonArr(m.outcomePrices).map(Number);
    for (let i = 0; i < outs.length; i++) {
      if (Number.isFinite(prices[i])) entries.push({ label: outs[i], price: prices[i] });
    }
  }

  // A match market must have exactly two teams + a draw. This also filters out
  // outright/futures markets (e.g. "World Cup winner"), which have no draw.
  if (entries.length < 3) return null;
  const drawEntry = entries.find(e => /\b(draw|tie)\b/i.test(e.label));
  const teamEntries = entries.filter(e => e !== drawEntry);
  if (!drawEntry || teamEntries.length !== 2) return null;

  const total = drawEntry.price + teamEntries[0].price + teamEntries[1].price;
  if (!(total > 0)) return null;

  const pct = (p: number) => Math.round((p / total) * 100);
  return {
    labels: [teamEntries[0].label, teamEntries[1].label],
    drawProb: pct(drawEntry.price),
    probs: [pct(teamEntries[0].price), pct(teamEntries[1].price)],
  };
}

// Returns a map keyed "normHome|normAway". Each match is inserted in both
// orderings so callers can match regardless of which side they treat as home.
export async function fetchPolymarketProbs(): Promise<Map<string, MatchProbs>> {
  const map = new Map<string, MatchProbs>();

  const eventLists = await Promise.all(
    TAG_SLUGS.map(async slug => {
      try {
        const r = await fetch(
          `${GAMMA_BASE}/events?closed=false&active=true&limit=200&tag_slug=${slug}`,
          { next: { revalidate: 300 } }
        );
        if (!r.ok) return [] as GammaEvent[];
        const data = await r.json();
        return Array.isArray(data) ? (data as GammaEvent[]) : [];
      } catch {
        return [] as GammaEvent[];
      }
    })
  );

  for (const events of eventLists) {
    for (const ev of events) {
      const r = extractMatchProbs(ev);
      if (!r) continue;
      const a = normalize(r.labels[0]);
      const b = normalize(r.labels[1]);
      if (!a || !b) continue;
      map.set(`${a}|${b}`, { homeProb: r.probs[0], drawProb: r.drawProb, awayProb: r.probs[1] });
      map.set(`${b}|${a}`, { homeProb: r.probs[1], drawProb: r.drawProb, awayProb: r.probs[0] });
    }
  }

  return map;
}
