import { NextResponse } from "next/server";
import { getCard, rawMarketEUR, priceHistoryEUR } from "@/lib/pokemontcg";
import { estimateSlabs } from "@/lib/psa";
import { analyseCard } from "@/lib/analysis";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const card = await getCard(params.id);
    if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
    const raw = rawMarketEUR(card);
    return NextResponse.json({
      card,
      raw,
      history: priceHistoryEUR(card),
      slabs: estimateSlabs(card, raw),
      analysis: analyseCard(card),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "card fetch failed" }, { status: 500 });
  }
}
