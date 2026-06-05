import { NextResponse } from "next/server";
import {
  getCard, rawMarketEUR, priceHistoryEUR, priceDetail, getUsdToEur,
} from "@/lib/pokemontcg";
import { estimateSlabs } from "@/lib/psa";
import { analyseCard } from "@/lib/analysis";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const [card, usdToEur] = await Promise.all([
      getCard(params.id),
      getUsdToEur(),
    ]);
    if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
    const raw = rawMarketEUR(card, usdToEur);
    return NextResponse.json({
      card,
      raw,
      prices: priceDetail(card, usdToEur),
      history: priceHistoryEUR(card),
      slabs: estimateSlabs(card, raw),
      analysis: analyseCard(card),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "card fetch failed" }, { status: 500 });
  }
}
