import { NextResponse } from "next/server";
import { searchCards, rawMarketEUR, getUsdToEur } from "@/lib/pokemontcg";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ data: [], total: 0 });

  try {
    const [cards, usdToEur] = await Promise.all([
      searchCards(q),
      getUsdToEur(),
    ]);
    const slim = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity,
      setName: c.set.name,
      setId: c.set.id,
      setReleaseDate: c.set.releaseDate,
      image: c.images.small,
      priceEUR: rawMarketEUR(c, usdToEur),
      year: parseInt(c.set.releaseDate?.slice(0, 4) || "0", 10),
    }));
    return NextResponse.json({ data: slim, total: slim.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "search failed" }, { status: 500 });
  }
}
