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

// Slimme zoekfunctie die multi-token queries opbouwt.
// Voorbeelden:
//   "charizard"            → name:charizard*
//   "charizard 151"        → name:charizard* AND (set:151 OR number:151)
//   "umbreon evolving"     → name:umbreon* AND set.name:*evolving*
//   "mega charizard x"     → name:"mega charizard x*"  (long name, geen set hint)
export async function searchCards(q: string, pageSize = 30): Promise<Card[]> {
  const query = q.trim();
  if (!query) return [];

  const tokens = query.split(/\s+/);
  const queries: string[] = [];

  // Altijd: pure name search met volledige query
  queries.push(`name:"${query}*"`);

  if (tokens.length >= 2) {
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    const allButLast = tokens.slice(0, -1).join(" ");
    const allButFirst = tokens.slice(1).join(" ");

    // Set hint achteraan: "charizard 151"
    queries.push(`name:"${allButLast}*" (set.name:"*${last}*" OR set.id:"*${last}*" OR number:"${last}")`);
    queries.push(`name:"${first}*" (set.name:"*${allButFirst}*" OR set.id:"*${allButFirst}*")`);

    // Set hint vooraan: "evolving skies umbreon"
    queries.push(`name:"${last}*" set.name:"*${allButLast}*"`);
  }

  // Numeric only? Probeer set search
  if (/^\d+$/.test(query)) {
    queries.push(`set.name:"*${query}*"`);
    queries.push(`set.id:"*${query}*"`);
  }

  // Run alle queries parallel
  const results = await Promise.all(queries.map((q) => runQuery(q, pageSize)));

  // Dedupe op id, behoud volgorde van eerste hit
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

  // Rank: kaarten waar naam EN set match scoren beter
  const lower = query.toLowerCase();
  const queryTokens = tokens.map((t) => t.toLowerCase());
  merged.sort((a, b) => {
    const score = (c: Card) => {
      const n = c.name.toLowerCase();
      const s = (c.set.name || "").toLowerCase();
      const id = c.set.id.toLowerCase();
      let sc = 0;
      // exact prefix match op naam = sterk signaal
      if (n.startsWith(lower)) sc += 50;
      // alle tokens komen voor in name of set
      for (const t of queryTokens) {
        if (n.includes(t)) sc += 10;
        if (s.includes(t)) sc += 8;
        if (id.includes(t)) sc += 6;
        if (c.number === t) sc += 15;
      }
      // Nieuwer = iets hoger
      const year = parseInt(c.set.releaseDate?.slice(0, 4) || "2000", 10);
      sc += (year - 2000) * 0.1;
      return sc;
    };
    return score(b) - score(a);
  });

  return merged.slice(0, pageSize);
}

export async function getCard(id: string): Promise<Card | null> {
  const url = `${BASE}/cards/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: headers(), next: { revalidate: 600 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pokemontcg getCard failed: ${res.status}`);
  const json = await res.json();
  return json.data as Card;
}

// Helper: get the most-relevant raw market price in EUR
export function rawMarketEUR(card: Card): number | null {
  const cm = card.cardmarket?.prices;
  if (cm) {
    return cm.trendPrice ?? cm.averageSellPrice ?? cm.avg30 ?? null;
  }
  const tcg = card.tcgplayer?.prices;
  if (tcg) {
    const variant = tcg.holofoil ?? tcg.reverseHolofoil ?? tcg.normal;
    if (variant?.market) return variant.market * 0.92; // crude USD→EUR
  }
  return null;
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
