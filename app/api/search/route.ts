import { NextResponse } from "next/server";
import { searchCards, rawMarketEUR } from "@/lib/pokemontcg";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ data: [] });

  try {
    const cards = await searchCards(q, 30);
    const slim = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity,
      setName: c.set.name,
      setReleaseDate: c.set.releaseDate,
      image: c.images.small,
      priceEUR: rawMarketEUR(c),
    }));
    return NextResponse.json({ data: slim });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "search failed" }, { status: 500 });
  }
}
