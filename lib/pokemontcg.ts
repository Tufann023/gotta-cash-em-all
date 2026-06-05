// pokemontcg.io API wrapper

const BASE = "https://api.pokemontcg.io/v2";

export type Card = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  hp?: string;
  types?: string[];
  images: { small: string; large: string };
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
    images: { symbol: string; logo: string };
    total?: number;
    printedTotal?: number;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices?: Record<
      string,
      { low?: number; mid?: number; high?: number; market?: number; directLow?: number }
    >;
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices?: {
      averageSellPrice?: number;
      lowPrice?: number;
      lowPriceExPlus?: number;
      trendPrice?: number;
      avg1?: number;
      avg7?: number;
      avg30?: number;
      avg365?: number;
      suggestedPrice?: number;
      reverseHoloTrend?: number;
      reverseHoloAvg1?: number;
      reverseHoloAvg7?: number;
      reverseHoloAvg30?: number;
    };
  };
};

function headers(): HeadersInit {
  const h: HeadersInit = { Accept: "application/json" };
  const key = process.env.POKEMONTCG_API_KEY;
  if (key) h["X-Api-Key"] = key;
  return h;
}

async function runQuery(qParam: string, pageSize: number): Promise<Card[]> {
  const url = `${BASE}/cards?q=${encodeURIComponent(qParam)}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
  const res = await fetch(url, { headers: headers(), next: { revalidate: 600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data as Card[]) ?? [];
}

// Slimme zoekfunctie die multi-token queries opbouwt en parallel uitvoert.
// Geeft tot ~250 unieke resultaten terug (dedupe + ranking).
// Frontend handelt verdere pagination/filtering af.
export async function searchCards(q: string): Promise<Card[]> {
  const query = q.trim();
  if (!query) return [];

  const tokens = query.split(/\s+/);
  // pokemontcg.io max pageSize = 250. Eerste query is de breedste, krijgt max.
  // Sub-queries (met set-hint) zijn nauwer, daar volstaat 100.
  const queries: { q: string; size: number }[] = [];

  queries.push({ q: `name:"${query}*"`, size: 250 });

  if (tokens.length >= 2) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    const allButLast = tokens.slice(0, -1).join(" ");
    const allButFirst = tokens.slice(1).join(" ");

    queries.push({ q: `name:"${allButLast}*" (set.name:"*${last}*" OR set.id:"*${last}*" OR number:"${last}")`, size: 100 });
    queries.push({ q: `name:"${first}*" (set.name:"*${allButFirst}*" OR set.id:"*${allButFirst}*")`, size: 100 });
    queries.push({ q: `name:"${last}*" set.name:"*${allButLast}*"`, size: 100 });
  }

  if (/^\d+$/.test(query)) {
    queries.push({ q: `set.name:"*${query}*"`, size: 250 });
    queries.push({ q: `set.id:"*${query}*"`, size: 250 });
  }

  const results = await Promise.all(queries.map(({ q, size }) => runQuery(q, size)));

  const seen = new Set<string>();
  const merged: Card[] = [];
  for (const list of results) {
    for (const card of list) {
      if (!seen.has(card.id)) {
        seen.add(card.id);
        merged.push(card);
      }
    }
  }

  // Ranking
  const lower = query.toLowerCase();
  const queryTokens = tokens.map((t) => t.toLowerCase());
  merged.sort((a, b) => {
    const score = (c: Card) => {
      const n = c.name.toLowerCase();
      const s = (c.set.name || "").toLowerCase();
      const id = c.set.id.toLowerCase();
      let sc = 0;
      if (n.startsWith(lower)) sc += 50;
      for (const t of queryTokens) {
        if (n.includes(t)) sc += 10;
        if (s.includes(t)) sc += 8;
        if (id.includes(t)) sc += 6;
        if (c.number === t) sc += 15;
      }
      const year = parseInt(c.set.releaseDate?.slice(0, 4) || "2000", 10);
      sc += (year - 2000) * 0.1;
      return sc;
    };
    return score(b) - score(a);
  });

  return merged;
}

export async function getCard(id: string): Promise<Card | null> {
  const url = `${BASE}/cards/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: headers(), next: { revalidate: 600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pokemontcg getCard failed: ${res.status}`);
  const json = await res.json();
  return json.data as Card;
}

// USD → EUR conversie: live koers via Frankfurter (gratis, geen key, 24u cache).
// Fallback bij storing = 0.92 (Q2 2026 gemiddelde).
const FX_FALLBACK = 0.92;
const STALE_DAYS = 30; // Cardmarket wordt boven deze drempel als stale beschouwd

export async function getUsdToEur(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR",
      { next: { revalidate: 86400 } }, // 24 uur cache (Next.js edge)
    );
    if (!res.ok) return FX_FALLBACK;
    const json = await res.json();
    const rate = json?.rates?.EUR;
    return typeof rate === "number" && rate > 0 ? rate : FX_FALLBACK;
  } catch {
    return FX_FALLBACK;
  }
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(/\//g, "-"));
  return isNaN(d.getTime()) ? null : d;
}

function daysOld(d: Date | null): number {
  if (!d) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

type TcgVariant = { low?: number; mid?: number; high?: number; market?: number; directLow?: number };
function tcgVariantPrice(card: Card): TcgVariant | null {
  const tcg = card.tcgplayer?.prices;
  if (!tcg) return null;
  return (tcg.holofoil ?? tcg.reverseHolofoil ?? tcg.normal ?? null) as TcgVariant | null;
}

// Helper: meest actuele EU-markprijs in EUR.
// Bron-prioriteit (voor EU-kopers het meest relevant):
//   1) Cardmarket trendPrice als data <30 dagen vers is (EU-markt = direct relevant).
//   2) TCGPlayer market price × live USD/EUR koers (alleen US-prijs, maar wel up-to-date).
//   3) Stale Cardmarket als last resort.
// pokemontcg.io's Cardmarket-snapshot is voor stabiele kaarten vaak maanden oud,
// daarom valt 'ie voor die kaarten terug op TCGPlayer (dat dagelijks ververst wordt).
export function rawMarketEUR(card: Card, usdToEur: number = FX_FALLBACK): number | null {
  const cm = card.cardmarket?.prices;
  const cmDate = parseDate(card.cardmarket?.updatedAt);
  const fresh = daysOld(cmDate) <= STALE_DAYS;
  if (cm && fresh) {
    const candidate = cm.trendPrice || cm.averageSellPrice || cm.avg30;
    if (candidate && candidate > 0) return candidate;
  }
  const tcgVar = tcgVariantPrice(card);
  if (tcgVar?.market && tcgVar.market > 0) {
    return +(tcgVar.market * usdToEur).toFixed(2);
  }
  if (cm) {
    const candidate = cm.trendPrice || cm.averageSellPrice || cm.avg30;
    if (candidate && candidate > 0) return candidate;
  }
  return null;
}

export type PriceDetail = {
  // Headline
  primaryEUR: number | null;
  primarySource: "tcgplayer" | "cardmarket" | "none";
  primaryUpdatedAt: string | null;
  primaryStale: boolean;
  // Cardmarket data points (kunnen stale zijn)
  cm: {
    lowPriceExPlus: number | null;
    lowPrice: number | null;
    trendPrice: number | null;
    averageSellPrice: number | null;
    avg30: number | null;
    avg7: number | null;
    avg1: number | null;
    updatedAt: string | null;
    daysOld: number | null;
    stale: boolean;
  };
  // TCGPlayer data (in EUR omgezet)
  tcg: {
    low: number | null;
    mid: number | null;
    high: number | null;
    market: number | null;
    directLow: number | null;
    updatedAt: string | null;
    daysOld: number | null;
    variantName: string | null;
    rateUsedUsdEur: number;
  };
};

export function priceDetail(card: Card, usdToEur: number = FX_FALLBACK): PriceDetail {
  const cmDate = parseDate(card.cardmarket?.updatedAt);
  const cmDaysOld = cmDate ? Math.floor(daysOld(cmDate)) : null;
  const cmStale = cmDaysOld !== null ? cmDaysOld > STALE_DAYS : true;
  const p = card.cardmarket?.prices;

  const tcgVar = tcgVariantPrice(card);
  const tcgDate = parseDate(card.tcgplayer?.updatedAt);
  const tcgDaysOld = tcgDate ? Math.floor(daysOld(tcgDate)) : null;
  const variantName = card.tcgplayer?.prices
    ? Object.keys(card.tcgplayer.prices)[0] ?? null
    : null;

  const usd = (v: number | undefined): number | null =>
    v && v > 0 ? +(v * usdToEur).toFixed(2) : null;

  // Bepaal primary — Cardmarket-eerst als die vers is (EU-markt)
  let primaryEUR: number | null = null;
  let primarySource: PriceDetail["primarySource"] = "none";
  let primaryUpdatedAt: string | null = null;
  let primaryStale = false;

  const cmCandidate = p?.trendPrice || p?.averageSellPrice || p?.avg30 || null;
  if (cmCandidate && !cmStale) {
    primaryEUR = cmCandidate;
    primarySource = "cardmarket";
    primaryUpdatedAt = card.cardmarket?.updatedAt ?? null;
    primaryStale = false;
  } else if (tcgVar?.market && tcgVar.market > 0) {
    primaryEUR = +(tcgVar.market * usdToEur).toFixed(2);
    primarySource = "tcgplayer";
    primaryUpdatedAt = card.tcgplayer?.updatedAt ?? null;
    primaryStale = (tcgDaysOld ?? 0) > STALE_DAYS;
  } else if (cmCandidate) {
    // Last resort: stale Cardmarket
    primaryEUR = cmCandidate;
    primarySource = "cardmarket";
    primaryUpdatedAt = card.cardmarket?.updatedAt ?? null;
    primaryStale = true;
  }

  return {
    primaryEUR,
    primarySource,
    primaryUpdatedAt,
    primaryStale,
    cm: {
      lowPriceExPlus: p?.lowPriceExPlus || null,
      lowPrice: p?.lowPrice || null,
      trendPrice: p?.trendPrice || null,
      averageSellPrice: p?.averageSellPrice || null,
      avg30: p?.avg30 || null,
      avg7: p?.avg7 || null,
      avg1: p?.avg1 || null,
      updatedAt: card.cardmarket?.updatedAt ?? null,
      daysOld: cmDaysOld,
      stale: cmStale,
    },
    tcg: {
      low: usd(tcgVar?.low),
      mid: usd(tcgVar?.mid),
      high: usd(tcgVar?.high),
      market: usd(tcgVar?.market),
      directLow: usd((tcgVar as any)?.directLow),
      updatedAt: card.tcgplayer?.updatedAt ?? null,
      daysOld: tcgDaysOld,
      variantName,
      rateUsedUsdEur: usdToEur,
    },
  };
}

export function priceHistoryEUR(card: Card): { label: string; price: number }[] {
  const cm = card.cardmarket?.prices;
  if (!cm) return [];
  const series: { label: string; price: number }[] = [];
  if (cm.avg30) series.push({ label: "30 dgn", price: cm.avg30 });
  if (cm.avg7) series.push({ label: "7 dgn", price: cm.avg7 });
  if (cm.avg1) series.push({ label: "1 dag", price: cm.avg1 });
  const today = cm.trendPrice ?? cm.averageSellPrice;
  if (today) series.push({ label: "nu", price: today });
  return series;
}
