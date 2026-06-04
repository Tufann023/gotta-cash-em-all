// Heuristische schatter voor PSA slab prijzen.
// PSA-data is niet via een open API beschikbaar; we benaderen het met
// multipliers gekalibreerd op publieke eBay sold listings en PSA pop reports.
//
// LET OP: dit zijn schattingen, geen werkelijke transacties. Voor specifieke
// kaarten kan de afwijking ±40% zijn. Bedoeld als richtprijs, niet als bid.

import type { Card } from "./pokemontcg";

export type SlabEstimate = {
  grade: "PSA 8" | "PSA 9" | "PSA 10";
  low: number;
  high: number;
  mid: number;
};

type Tier = "vintage_1stEd" | "vintage" | "modern_chase" | "modern_holo" | "modern_common";

function classify(card: Card): Tier {
  const year = parseInt(card.set.releaseDate.slice(0, 4), 10);
  const rarity = (card.rarity ?? "").toLowerCase();
  const isVintage = year && year < 2010;
  const is1stEd = (card.set.name || "").toLowerCase().includes("1st edition");

  if (isVintage && is1stEd) return "vintage_1stEd";
  if (isVintage) return "vintage";
  if (
    rarity.includes("secret") ||
    rarity.includes("rainbow") ||
    rarity.includes("alternate") ||
    rarity.includes("hyper") ||
    rarity.includes("special illustration") ||
    rarity.includes("illustration rare")
  )
    return "modern_chase";
  if (rarity.includes("holo") || rarity.includes("ultra") || rarity.includes("rare"))
    return "modern_holo";
  return "modern_common";
}

const MULTIPLIERS: Record<Tier, { psa8: [number, number]; psa9: [number, number]; psa10: [number, number] }> = {
  vintage_1stEd: { psa8: [4, 6], psa9: [10, 18], psa10: [40, 90] },
  vintage:       { psa8: [2.2, 3], psa9: [4.5, 7], psa10: [12, 25] },
  modern_chase:  { psa8: [1.1, 1.4], psa9: [1.6, 2.2], psa10: [3.2, 5] },
  modern_holo:   { psa8: [1.05, 1.3], psa9: [1.4, 1.9], psa10: [2.4, 3.8] },
  modern_common: { psa8: [1, 1.2], psa9: [1.2, 1.6], psa10: [1.8, 2.6] },
};

// Diminishing premium: hoe hoger de raw-prijs, hoe smaller de PSA-premium.
// Cardmarket "trendPrice" voor vintage is vaak al een mint-equivalent.
// Daarom krimpen multipliers aggressiever voor hogere raw-prijzen.
function scaleFactor(raw: number): number {
  if (raw < 50) return 0.9;
  if (raw < 200) return 0.55;
  if (raw < 500) return 0.35;
  if (raw < 1500) return 0.22;
  if (raw < 3000) return 0.12;
  return 0.07;
}

export function estimateSlabs(card: Card, rawEUR: number | null): SlabEstimate[] {
  if (!rawEUR || rawEUR <= 0) return [];
  const tier = classify(card);
  const m = MULTIPLIERS[tier];
  const f = scaleFactor(rawEUR);
  // Multiplier krimpt naar 1.0 toe als raw groeit
  const adj = (mult: number): number => 1 + (mult - 1) * f;
  const make = (
    g: SlabEstimate["grade"],
    [lo, hi]: [number, number],
  ): SlabEstimate => {
    const low = Math.round(rawEUR * adj(lo));
    const high = Math.round(rawEUR * adj(hi));
    const mid = Math.round((low + high) / 2);
    return { grade: g, low, high, mid };
  };
  return [make("PSA 8", m.psa8), make("PSA 9", m.psa9), make("PSA 10", m.psa10)];
}
