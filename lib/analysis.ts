// Regel-gebaseerde quick-analyse. Geen AI nodig.
// Geeft per kaart een score, een verdict en een korte prognose.

import type { Card } from "./pokemontcg";
import { rawMarketEUR, priceHistoryEUR } from "./pokemontcg";

export type Verdict = "Sterk koop" | "Koop" | "Neutraal" | "Houden" | "Vermijden";

export type Analysis = {
  verdict: Verdict;
  score: number; // -100..100
  signals: { label: string; positive: boolean; reason: string }[];
  outlook: {
    horizon: "3 jaar" | "5 jaar";
    base: string; // bv "+40%"
    bear: string;
    bull: string;
  }[];
  summary: string;
};

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${Math.round(n)}%`;
}

export function analyseCard(card: Card): Analysis {
  const signals: Analysis["signals"] = [];
  let score = 0;

  // 1) Set-leeftijd
  const year = parseInt(card.set.releaseDate.slice(0, 4) || "2024", 10);
  const age = new Date().getFullYear() - year;
  if (age >= 20) {
    score += 30;
    signals.push({ label: "Vintage", positive: true,
      reason: "Set is ≥20 jaar oud — historisch laagste pop-groei, sterkste vraag." });
  } else if (age >= 5) {
    score += 15;
    signals.push({ label: "Out-of-print kandidaat", positive: true,
      reason: `Set uit ${year} is waarschijnlijk OOP — supply stabiel of dalend.` });
  } else if (age <= 1) {
    score -= 15;
    signals.push({ label: "Nog in print", positive: false,
      reason: "Set is recent gelanceerd; reprints zijn waarschijnlijk." });
  }

  // 2) Rariteit
  const rarity = (card.rarity ?? "").toLowerCase();
  if (
    rarity.includes("secret") ||
    rarity.includes("rainbow") ||
    rarity.includes("alternate") ||
    rarity.includes("special illustration") ||
    rarity.includes("illustration rare")
  ) {
    score += 20;
    signals.push({ label: "Chase-rariteit", positive: true,
      reason: `Rariteit "${card.rarity}" is een geliefde chase-categorie.` });
  } else if (rarity.includes("common") || rarity.includes("uncommon")) {
    score -= 25;
    signals.push({ label: "Lage rariteit", positive: false,
      reason: "Commons/Uncommons hebben minimale collector-waarde." });
  }

  // 3) Iconisch karakter
  const iconic = ["charizard", "pikachu", "mewtwo", "lugia", "umbreon",
                  "rayquaza", "gengar", "mew", "eevee", "snorlax"];
  const nameLower = card.name.toLowerCase();
  const hit = iconic.find((c) => nameLower.includes(c));
  if (hit) {
    score += 15;
    signals.push({ label: `${hit[0].toUpperCase()}${hit.slice(1)}-IP`, positive: true,
      reason: "Iconisch Pokemon — premium boven generieke characters." });
  }

  // 4) Prijsniveau
  const raw = rawMarketEUR(card);
  if (raw) {
    if (raw < 5) {
      score -= 10;
      signals.push({ label: "Lage prijs", positive: false,
        reason: "Onder €5 zijn fees relatief te hoog voor rendement." });
    } else if (raw > 200) {
      score += 10;
      signals.push({ label: "Premium prijspunt", positive: true,
        reason: "Boven €200 is liquide markt; transactiekosten relatief laag." });
    }
  } else {
    signals.push({ label: "Beperkte prijsdata", positive: false,
      reason: "Geen recente marketprice — illiquide of recent gelanceerd." });
  }

  // 5) Trend (uit avg30 vs trendPrice)
  const hist = priceHistoryEUR(card);
  if (hist.length >= 2) {
    const start = hist[0].price;
    const end = hist[hist.length - 1].price;
    const change = ((end - start) / start) * 100;
    if (change > 5) {
      score += 10;
      signals.push({ label: "Stijgende trend (30d)", positive: true,
        reason: `Prijs is ${pct(change)} bewogen in de laatste 30 dagen.` });
    } else if (change < -5) {
      score -= 10;
      signals.push({ label: "Dalende trend (30d)", positive: false,
        reason: `Prijs is ${pct(change)} bewogen in de laatste 30 dagen.` });
    }
  }

  // Verdict
  let verdict: Verdict;
  if (score >= 40) verdict = "Sterk koop";
  else if (score >= 15) verdict = "Koop";
  else if (score > -15) verdict = "Neutraal";
  else if (score > -35) verdict = "Houden";
  else verdict = "Vermijden";

  // Prognose op basis van categorie
  let base3 = 15, bear3 = -5, bull3 = 40, base5 = 30, bear5 = -10, bull5 = 75;
  if (age >= 20 && hit) { base3 = 35; bear3 = 10; bull3 = 70; base5 = 70; bear5 = 25; bull5 = 130; }
  else if (age >= 20) { base3 = 25; bear3 = 5; bull3 = 50; base5 = 55; bear5 = 20; bull5 = 110; }
  else if (rarity.includes("secret") || rarity.includes("illustration")) {
    base3 = 25; bear3 = -10; bull3 = 60; base5 = 50; bear5 = -15; bull5 = 110;
  }
  if (age <= 1) { base3 = -5; bear3 = -25; bull3 = 25; base5 = 5; bear5 = -35; bull5 = 60; }

  const outlook: Analysis["outlook"] = [
    { horizon: "3 jaar", base: pct(base3), bear: pct(bear3), bull: pct(bull3) },
    { horizon: "5 jaar", base: pct(base5), bear: pct(bear5), bull: pct(bull5) },
  ];

  // Samenvatting
  const positives = signals.filter((s) => s.positive).length;
  const negatives = signals.filter((s) => !s.positive).length;
  const yearLabel = year ? ` uit ${year}` : "";
  const summary =
    `${card.name}${yearLabel} (${card.rarity ?? "—"}) krijgt verdict ` +
    `"${verdict}" op basis van ${positives} positieve en ${negatives} negatieve signalen. ` +
    `Geprojecteerd base-case rendement: ${pct(base3)} op 3 jaar, ${pct(base5)} op 5 jaar. ` +
    "Dit is een regel-gebaseerde indicatie — gebruik 'Diepere AI-analyse' voor genuanceerd oordeel.";

  return { verdict, score, signals, outlook, summary };
}
