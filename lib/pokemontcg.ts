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
      { low: number; mid: number; high: number; market: number; directLow?: number }
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

// Helper: get the most-relevant raw market price in EUR.
// Voorkeur: lowPriceExPlus (laagste vraagprijs voor NM+/EX+ conditie) — meest
// actiebaar; valt terug op trendPrice (Cardmarket's fair value).
export function rawMarketEUR(card: Card): number | null {
  const cm = card.cardmarket?.prices;
  if (cm) {
    const candidate = cm.trendPrice || cm.averageSellPrice || cm.avg30;
    return candidate && candidate > 0 ? candidate : null;
  }
  const tcg = card.tcgplayer?.prices;
  if (tcg) {
    const variant = tcg.holofoil ?? tcg.reverseHolofoil ?? tcg.normal;
    if (variant?.market) return variant.market * 0.92;
  }
  return null;
}

export type PriceDetail = {
  lowPriceExPlus: number | null;  // vanaf-prijs NM+
  lowPrice: number | null;        // laagste asking (incl. beschadigd)
  trendPrice: number | null;      // Cardmarket fair value
  averageSellPrice: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  updatedAt: string | null;
  source: "cardmarket" | "tcgplayer" | "none";
};

export function priceDetail(card: Card): PriceDetail {
  const cm = card.cardmarket;
  const p = cm?.prices;
  if (p && (p.trendPrice || p.averageSellPrice || p.lowPrice)) {
    return {
      lowPriceExPlus: (p as any).lowPriceExPlus || null,
      lowPrice: p.lowPrice || null,
      trendPrice: p.trendPrice || null,
      averageSellPrice: p.averageSellPrice || null,
      avg1: p.avg1 || null,
      avg7: p.avg7 || null,
      avg30: p.avg30 || null,
      updatedAt: cm?.updatedAt || null,
      source: "cardmarket",
    };
  }
  const tcg = card.tcgplayer;
  const tp = tcg?.prices;
  if (tp) {
    const v = tp.holofoil ?? tp.reverseHolofoil ?? tp.normal;
    if (v) {
      const rate = 0.92;
      return {
        lowPriceExPlus: v.low ? +(v.low * rate).toFixed(2) : null,
        lowPrice: v.low ? +(v.low * rate).toFixed(2) : null,
        trendPrice: v.market ? +(v.market * rate).toFixed(2) : null,
        averageSellPrice: v.mid ? +(v.mid * rate).toFixed(2) : null,
        avg1: null, avg7: null, avg30: null,
        updatedAt: tcg?.updatedAt || null,
        source: "tcgplayer",
      };
    }
  }
  return {
    lowPriceExPlus: null, lowPrice: null, trendPrice: null,
    averageSellPrice: null, avg1: null, avg7: null, avg30: null,
    updatedAt: null, source: "none",
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
