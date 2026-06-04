import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCard, rawMarketEUR, priceHistoryEUR, priceDetail } from "@/lib/pokemontcg";
import { estimateSlabs } from "@/lib/psa";
import { analyseCard } from "@/lib/analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

// JSON-schema dat Claude moet volgen
export type AIAnalysis = {
  verdict: "Sterke koop" | "Koop" | "Houden" | "Vermijden" | "Verkopen";
  confidence: "Hoog" | "Midden" | "Laag";
  oneliner: string;
  summary: string;
  forecasts: {
    horizon: string;
    bearEUR: number;
    baseEUR: number;
    bullEUR: number;
    rationale: string;
  }[];
  catalysts: { title: string; description: string }[];
  risks: { title: string; description: string }[];
  strategy: {
    buyBelowEUR: number | null;
    sellAboveEUR: number | null;
    bestVehicle: string;
    rationale: string;
  };
  comparables: { name: string; reason: string }[];
  keyFigure: { label: string; value: string };
};

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY niet gezet. Voeg toe aan Vercel project settings." },
      { status: 500 },
    );
  }

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const raw = rawMarketEUR(card);
  const history = priceHistoryEUR(card);
  const slabs = estimateSlabs(card, raw);
  const rules = analyseCard(card);
  const prices = priceDetail(card);

  const client = new Anthropic({ apiKey });

  const systemPrompt = `Je bent een ervaren Pokemon TCG investeringsanalist.
Je antwoordt UITSLUITEND met geldig JSON dat het schema exact volgt. Geen markdown, geen toelichting buiten JSON. Alle teksten in het Nederlands. Bedragen in EUR (gehele getallen).

Schema:
{
  "verdict": "Sterke koop" | "Koop" | "Houden" | "Vermijden" | "Verkopen",
  "confidence": "Hoog" | "Midden" | "Laag",
  "oneliner": "string — 1 directe zin (max 110 tekens) met kern van advies",
  "summary": "string — 2 tot 3 zinnen executive summary met cijfers",
  "forecasts": [
    { "horizon": "3 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "string — 1-2 zinnen waarom" },
    { "horizon": "5 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "string" },
    { "horizon": "10 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "string" }
  ],
  "catalysts": [
    { "title": "string — korte titel (max 40 tekens)", "description": "string — concrete reden (max 140 tekens)" }
  ],
  "risks": [
    { "title": "string", "description": "string" }
  ],
  "strategy": {
    "buyBelowEUR": number | null,
    "sellAboveEUR": number | null,
    "bestVehicle": "string — bv. 'PSA 10', 'PSA 9 als instap', 'Raw NM bewaren', 'Sealed pack'",
    "rationale": "string — 1-2 zinnen waarom"
  },
  "comparables": [
    { "name": "string — vergelijkbare kaart", "reason": "string — waarom relevant" }
  ],
  "keyFigure": { "label": "string — bv. 'YoY groei' of 'PSA 10 pop'", "value": "string — bv. '+85%' of '~10.500'" }
}

Regels:
- 3 forecasts (3/5/10 jaar). Base scenario weight 60%, bear 20%, bull 20%.
- 2 tot 4 catalysts (positieve drivers).
- 2 tot 4 risks (negatieve drivers).
- 2 tot 4 comparables.
- buyBelowEUR ≤ huidige raw prijs (kans). sellAboveEUR > base 3jr forecast.
- Wees specifiek met cijfers (populaties, pull rates, % stijgingen, vergelijkbare verkopen).
- Verdict logica: Sterke koop = duidelijk ondergewaardeerd; Koop = solide opwaarts; Houden = stabiel; Vermijden = nu niet kopen; Verkopen = top bereikt.`;

  const userPrompt =
`Analyseer deze Pokemon kaart voor een investeerder.

KAART:
- Naam: ${card.name}
- Set: ${card.set.name} (${card.set.series})
- Release: ${card.set.releaseDate}
- Nummer: ${card.number}
- Rariteit: ${card.rarity ?? "?"}
- Artist: ${card.artist ?? "?"}

PRIJSDATA NU:
- Raw EUR (primary, ${prices.primarySource}): €${raw ?? "?"}
- TCGPlayer market: €${prices.tcg.market ?? "?"} (geüpdatet ${prices.tcg.updatedAt ?? "?"})
- Cardmarket trend: €${prices.cm.trendPrice ?? "?"} (geüpdatet ${prices.cm.updatedAt ?? "?"})
- Vanaf NM+ (CM): €${prices.cm.lowPriceExPlus ?? "?"}
- 30-dgn gemiddelde (CM): €${prices.cm.avg30 ?? "?"}

PSA SCHATTINGEN (heuristiek, EUR):
${slabs.map((s) => `- ${s.grade}: €${s.mid} (range €${s.low}-€${s.high})`).join("\n") || "- onbekend"}

REGEL-VERDICT (quick scorer): ${rules.verdict} (score ${rules.score})
POSITIEVE SIGNALEN: ${rules.signals.filter((s) => s.positive).map((s) => s.label).join("; ") || "geen"}
NEGATIEVE SIGNALEN: ${rules.signals.filter((s) => !s.positive).map((s) => s.label).join("; ") || "geen"}

PRIJSVERLOOP RECENT: ${history.map((h) => `${h.label}=€${h.price.toFixed(2)}`).join(", ") || "onvoldoende data"}

CONTEXT 2026: Pokemon TCG markt groeit ~38% j-o-j. 10 miljard kaarten gedrukt FY 25-26. 30-jarig jubileum feb 2026. Vintage en OOP-sets sterkste prestatie. Modern in-print zwakt af door reprints.

Geef de investeringsanalyse in het JSON-schema. Begin direct met '{' — geen tekst ervoor.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
        { role: "assistant", content: "{" },
      ],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const jsonStr = "{" + text;
    // Trim eventuele tekst na laatste }
    const lastBrace = jsonStr.lastIndexOf("}");
    const cleaned = lastBrace > 0 ? jsonStr.slice(0, lastBrace + 1) : jsonStr;

    let analysis: AIAnalysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json(
        { error: "Claude returned malformed JSON", raw: cleaned.slice(0, 500) },
        { status: 500 },
      );
    }

    return NextResponse.json({ analysis });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "claude call failed" },
      { status: 500 },
    );
  }
}
