import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCard, rawMarketEUR, priceHistoryEUR } from "@/lib/pokemontcg";
import { estimateSlabs } from "@/lib/psa";
import { analyseCard } from "@/lib/analysis";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY niet gezet. Voeg toe aan .env.local of Vercel project settings." },
      { status: 500 },
    );
  }

  const card = await getCard(id);
  if (!card) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const raw = rawMarketEUR(card);
  const history = priceHistoryEUR(card);
  const slabs = estimateSlabs(card, raw);
  const rules = analyseCard(card);

  const client = new Anthropic({ apiKey });

  const prompt =
    `Je bent een ervaren TCG-investerings-analist. Schrijf een korte, kritische analyse ` +
    `(150-200 woorden) over deze Pokemon kaart voor een investeerder. Schrijf in het Nederlands.\n\n` +
    `Kaart: ${card.name}\n` +
    `Set: ${card.set.name} (${card.set.series}, ${card.set.releaseDate})\n` +
    `Rariteit: ${card.rarity ?? "?"}\n` +
    `Nummer: ${card.number}\n` +
    `Artist: ${card.artist ?? "?"}\n` +
    `Huidige raw prijs (EUR): ${raw ?? "onbekend"}\n` +
    `Geschatte PSA 10 prijs (EUR): ${slabs.find((s) => s.grade === "PSA 10")?.mid ?? "n/a"}\n` +
    `30-dagen prijsverloop: ${history.map((h) => `${h.label}=€${h.price.toFixed(2)}`).join(", ")}\n` +
    `Regel-verdict: ${rules.verdict} (score ${rules.score})\n` +
    `Positieve signalen: ${rules.signals.filter((s) => s.positive).map((s) => s.label).join("; ") || "geen"}\n` +
    `Negatieve signalen: ${rules.signals.filter((s) => !s.positive).map((s) => s.label).join("; ") || "geen"}\n\n` +
    `Structuur: \n` +
    `1) Eén zin verdict (sterk koop / koop / neutraal / houden / vermijden) met onderbouwing.\n` +
    `2) Twee specifieke risico's voor déze kaart.\n` +
    `3) Eén zin prognose 3-5 jaar.\n` +
    `4) Eén concrete actie (kopen / wachten op X / verkopen).\n` +
    `Wees direct en specifiek. Geen disclaimers, geen "raadpleeg een adviseur".`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    return NextResponse.json({ analysis: text });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "claude call failed" },
      { status: 500 },
    );
  }
}
