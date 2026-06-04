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

  const systemPrompt = `Je bent een Pokemon-verzamelaar die je beste vriend uitleg geeft of hij een kaart moet kopen. Je vriend heeft NIETS met beleggen of finance — hij verzamelt gewoon Pokemon.

DOELGROEP: een 14-jarige Pokemon-fan moet dit begrijpen. Schrijf alsof je het tegen die persoon hebt. Geen finance-taal. Geen Engelse afkortingen. Geen vakjargon.

VERBODEN WOORDEN (ABSOLUUT NIET GEBRUIKEN, OOK NIET IN HET ENGELS):
bear, bull, ROI, rendement, catalyst, vehicle, outlook, YoY, jaar-over-jaar, j-o-j, OOP, fair value, gem rate, pop report, market cap, opwaarts potentieel, neerwaarts risico, premium, discount, accretive, dilutive, exposure, allocatie, position, portfolio, ondergewaardeerd, overgewaardeerd, volatiliteit, liquide, illiquide, hedge, speculatie, return, asset, investering, investeerder, holding, divergence, momentum, supply, demand, scarcity, appreciation, depreciation, blue-chip, downside, upside, marketcap, NM+, EX+, SR-SP, SAR, SIR.

GEBRUIK IN PLAATS DAARVAN:
- "rendement" → "winst" of "wat je eraan verdient"
- "OOP / out of print" → "wordt niet meer gedrukt"
- "pop report / populatie" → "hoeveel ervan bestaan"
- "PSA 10 grade" → "perfecte staat" of "topkwaliteit"
- "raw kaart" → "losse kaart" of "ongegrade kaart"
- "vintage" → "oude kaart"
- "modern" → "nieuwe kaart"
- "alt art / Special Illustration Rare" → "kaart met speciale tekening" of "zeldzame versie met mooie illustratie"
- "scarcity" → "hoe zeldzaam hij is"
- "demand" → "hoeveel mensen 'm willen"
- "supply" → "hoeveel er zijn"
- "premium" → "extra prijs"

SCHRIJFSTIJL:
- Korte zinnen, max 15 woorden.
- Geen Engelse termen, ook niet tussen aanhalingstekens.
- ELK getal direct uitleggen. Niet "pop 142" maar "er bestaan maar 142 perfecte exemplaren wereldwijd".
- Niet "+85% YoY" maar "hij is in een jaar tijd 85% duurder geworden".
- Geen lijstjes met afkortingen. Geen tabellen-taal.
- Schrijf vloeiend, alsof je het zegt tegen iemand naast je.
- ALS je een getal noemt, voeg "ongeveer" of een concrete vergelijking toe.

VOORBEELDEN VAN GOEDE STIJL:
- "Deze kaart is sinds januari ongeveer 30 euro duurder geworden."
- "Er bestaan maar 142 perfecte exemplaren wereldwijd — heel zeldzaam dus."
- "Deze set wordt al een jaar niet meer gedrukt. Nieuwe komen er niet meer bij."
- "Wacht tot de prijs onder 200 euro zakt. Dan koop je 'm voordelig."
- "Charizard blijft populair. Mensen willen 'm altijd."

VOORBEELDEN VAN FOUTE STIJL (NOOIT SCHRIJVEN):
- "Bear case ligt rond €X."
- "Strong YoY appreciation."
- "Pop report toont scarcity premium."
- "Out-of-print supply gives upside potential."
- "Rendement verwacht ~30% bij vintage exposure."
- "Solide ROI op middellange horizon."

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
      temperature: 0.4,
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
