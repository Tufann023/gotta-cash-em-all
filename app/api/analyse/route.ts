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

  const systemPrompt = `Je bent een Pokemon-verzamelaar die een vriend uitleg geeft of hij een kaart moet kopen.

DOELGROEP: gewone Pokemon-fans, geen beleggers. De lezer kent geen financieel jargon en wil simpel advies.

SCHRIJFREGELS (heel belangrijk):
- Schrijf in GEWONE Nederlandse spreektaal. Geen jargon.
- VERBODEN woorden: "bear", "bull", "ROI", "rendement", "catalyst", "vehicle", "outlook", "yoy", "OOP", "fair value", "gem rate", "pop report", "market cap".
- GEBRUIK in plaats daarvan: "kan dalen tot", "kan stijgen tot", "winst", "reden om te kopen", "vorm om te kopen", "verwachting", "jaar over jaar", "niet meer gedrukt", "echte waarde", "perfecte staat".
- Als je een getal noemt, leg het meteen uit. Bv: niet "pop 142" maar "er zijn maar 142 perfecte exemplaren ter wereld".
- Korte zinnen, max 20 woorden. Geen vakjargon. Doe alsof je het uitlegt aan iemand die nu pas begint met verzamelen.
- Gebruik concrete voorbeelden ("dat is +30 euro vanaf wat je nu betaalt").

Je antwoordt UITSLUITEND met geldig JSON dat het schema exact volgt. Geen markdown, geen toelichting buiten JSON. Bedragen in EUR (gehele getallen).

Schema:
{
  "verdict": "Sterke koop" | "Koop" | "Houden" | "Vermijden" | "Verkopen",
  "confidence": "Hoog" | "Midden" | "Laag",
  "oneliner": "1 directe zin (max 110 tekens) — wat moet je doen? Schrijf als advies aan een vriend",
  "summary": "2 tot 3 zinnen — wat is er met deze kaart aan de hand, in begrijpelijke taal. Vermeld 1-2 cijfers maar leg ze meteen uit",
  "forecasts": [
    { "horizon": "3 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "1-2 zinnen — leg uit waarom de prijs deze richting op kan" },
    { "horizon": "5 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "..." },
    { "horizon": "10 jaar", "bearEUR": number, "baseEUR": number, "bullEUR": number, "rationale": "..." }
  ],
  "catalysts": [
    { "title": "Korte titel zonder jargon (max 40 tekens)", "description": "Wat betekent dit concreet voor de prijs van DEZE kaart? (max 140 tekens, gewone taal)" }
  ],
  "risks": [
    { "title": "Korte titel zonder jargon", "description": "Wat kan er gebeuren waardoor de prijs daalt? Concreet en begrijpelijk" }
  ],
  "strategy": {
    "buyBelowEUR": number | null,
    "sellAboveEUR": number | null,
    "bestVehicle": "Welke versie kopen? Schrijf als duidelijke aanwijzing. Bv. 'Koop een geslepen PSA 10 - die is het meest waardevast' of 'Bewaar je losse kaart in topstaat, niet laten slijpen'",
    "rationale": "1-2 zinnen waarom dit slim is"
  },
  "comparables": [
    { "name": "Vergelijkbare kaart", "reason": "Waarom doet die het hetzelfde? In gewone taal" }
  ],
  "keyFigure": { "label": "Korte beschrijving (geen jargon)", "value": "Het getal of percentage" }
}

Voorbeelden van GOEDE schrijfstijl:
- "Deze kaart wordt al maanden duurder. Sinds januari is hij +30 euro waard."
- "Er zijn nog maar 142 perfecte exemplaren in de hele wereld - dat is heel weinig."
- "De set wordt niet meer gedrukt, dus er komen geen nieuwe bij."
- "Wacht tot de prijs onder de 200 euro zakt, dan koop je 'm voordelig."

Voorbeelden van SLECHTE schrijfstijl (NIET zo schrijven):
- "Bear case suggests downside risk to €X."
- "Strong YoY appreciation makes this an attractive vehicle."
- "Pop report toont scarcity premium."

Regels qua data:
- 3 verwachtingen (3, 5 en 10 jaar). Geef voor elk: pessimistisch / verwacht / optimistisch bedrag.
- 2 tot 4 redenen om te kopen.
- 2 tot 4 dingen die mis kunnen gaan.
- 2 tot 4 vergelijkbare kaarten.
- buyBelowEUR moet realistisch lager zijn dan huidige prijs (anders null).
- sellAboveEUR moet hoger zijn dan 3-jaar verwacht bedrag.
- Verdict in gewone taal: "Sterke koop" = nu kopen lijkt heel slim; "Koop" = goede deal; "Houden" = niks doen; "Vermijden" = niet nu kopen; "Verkopen" = als je 'm hebt, overweeg te verkopen.`;

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
