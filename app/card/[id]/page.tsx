"use client";
import { useEffect, useState } from "react";
import PriceChart from "@/app/components/PriceChart";
import { useWatchlist } from "@/lib/watchlist";

type Slab = { grade: string; low: number; high: number; mid: number };
type Sig = { label: string; positive: boolean; reason: string };
type Outlook = { horizon: string; base: string; bear: string; bull: string };
type Analysis = { verdict: string; score: number; signals: Sig[]; outlook: Outlook[]; summary: string };

type PriceDetail = {
  lowPriceExPlus: number | null; lowPrice: number | null; trendPrice: number | null;
  averageSellPrice: number | null; avg1: number | null; avg7: number | null;
  avg30: number | null; updatedAt: string | null; source: string;
};

type Payload = {
  card: any;
  raw: number | null;
  prices: PriceDetail;
  history: { label: string; price: number }[];
  slabs: Slab[];
  analysis: Analysis;
};

const verdictStyle: Record<string, string> = {
  "Sterk koop": "bg-pos text-white",
  "Koop": "bg-pos/12 text-pos",
  "Neutraal": "bg-elevated text-muted",
  "Houden": "bg-pokeYellowSoft text-pokeYellowDark",
  "Vermijden": "bg-pokeRedSoft text-pokeRed",
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(/\//g, "-"));
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CardPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const { add, remove, has, hydrated } = useWatchlist();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/card/${encodeURIComponent(params.id)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "fetch failed");
        setData(json);
      } catch (e: any) { setErr(e.message); }
    })();
  }, [params.id]);

  async function runAI() {
    setAiLoading(true); setAiErr(null); setAiText(null);
    try {
      const res = await fetch(`/api/analyse`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: params.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ai call failed");
      setAiText(json.analysis);
    } catch (e: any) { setAiErr(e.message); }
    finally { setAiLoading(false); }
  }

  if (err) return <div className="text-neg">Fout: {err}</div>;
  if (!data) return <div className="text-muted">Laden…</div>;

  const { card, raw, prices, history, slabs, analysis } = data;
  const inList = hydrated && has(card.id);
  const stale = daysSince(prices.updatedAt);
  const headline = prices.lowPriceExPlus || prices.trendPrice || raw;
  const cardmarketUrl = card.cardmarket?.url;

  return (
    <div className="fade-in space-y-10">
      <a href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Terug naar zoeken
      </a>

      <div className="grid md:grid-cols-[300px_1fr] gap-10">
        <div>
          <img src={card.images.large} alt={card.name}
               className="rounded-2xl border hairline w-full shadow-card" />
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-pokeBlue mb-2">
              {card.set.name} · {card.set.series} · {card.set.releaseDate}
            </div>
            <h1 className="font-display text-4xl font-bold text-ink">{card.name}</h1>
            <div className="text-muted text-[14px] mt-2">
              #{card.number} · {card.rarity ?? "—"}{card.artist ? ` · ${card.artist}` : ""}
            </div>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-4xl font-semibold tabular-nums tracking-tight">
              {headline ? `€${headline.toFixed(2)}` : "—"}
            </div>
            <div className="text-[13px] text-muted">
              {prices.lowPriceExPlus ? "vanaf NM+ · Cardmarket" : "raw marktprijs · Cardmarket"}
            </div>
          </div>

          {stale !== null && stale > 90 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warn/10 text-warn text-[12px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              Data is {stale} dagen oud — Cardmarket-snapshot via pokemontcg.io. {cardmarketUrl && (
                <a href={cardmarketUrl} target="_blank" rel="noopener" className="underline hover:no-underline">Check live</a>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold ${verdictStyle[analysis.verdict] ?? "bg-elevated text-muted"}`}>
              {analysis.verdict}
              <span className="opacity-70 text-[11px] font-normal">score {analysis.score}</span>
            </span>

            <button
              onClick={() => inList ? remove(card.id) : add({
                id: card.id, name: card.name, setName: card.set.name,
                image: card.images.small, notedPriceEUR: headline,
              })}
              className={
                inList
                  ? "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold bg-elevated text-ink hover:bg-line transition"
                  : "btn-poke inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px]"
              }
            >
              {inList ? "✓ In watchlist" : "+ Watchlist"}
            </button>

            {cardmarketUrl && (
              <a href={cardmarketUrl} target="_blank" rel="noopener"
                 className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-muted hover:text-accent hover:bg-elevated transition">
                Cardmarket ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <PricePanel prices={prices} />

      <div className="grid md:grid-cols-2 gap-5">
        <PriceChart data={history} />
        <SlabPanel slabs={slabs} />
      </div>

      <SignalsPanel signals={analysis.signals} />
      <OutlookPanel outlook={analysis.outlook} />

      <div className="bg-surface rounded-2xl border hairline p-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Diepere AI-analyse</div>
            <div className="text-[13px] text-muted mt-1">Claude Haiku 4.5 · ~$0,01-$0,03 per analyse</div>
          </div>
          <button onClick={runAI} disabled={aiLoading}
            className="px-4 py-2.5 rounded-full bg-accent text-white text-[13px] font-semibold hover:bg-accentHover disabled:opacity-50 transition">
            {aiLoading ? "Genereren…" : aiText ? "Opnieuw genereren" : "Genereer AI-analyse"}
          </button>
        </div>
        {aiErr && <div className="text-neg text-sm">Fout: {aiErr}</div>}
        {aiText && (
          <div className="text-ink text-[14px] whitespace-pre-wrap leading-relaxed">{aiText}</div>
        )}
        {!aiText && !aiErr && (
          <div className="text-muted text-[13px]">
            Klik "Genereer AI-analyse" voor een gericht 150-200 woord oordeel met specifieke risico's en concrete actie.
          </div>
        )}
      </div>

      <div className="text-[11px] text-subtle leading-relaxed">
        Quick-analyse: {analysis.summary}
      </div>
    </div>
  );
}

function PricePanel({ prices }: { prices: PriceDetail }) {
  const points: { label: string; value: number | null; hint?: string }[] = [
    { label: "Vanaf (NM+)",        value: prices.lowPriceExPlus, hint: "Laagste vraagprijs near-mint of beter" },
    { label: "Trend",              value: prices.trendPrice,     hint: "Cardmarket's algoritmische fair value" },
    { label: "Gem. verkoop",       value: prices.averageSellPrice, hint: "Gemiddelde van recente verkopen" },
    { label: "30 dgn gemiddeld",   value: prices.avg30 },
    { label: "7 dgn gemiddeld",    value: prices.avg7 },
    { label: "Allerlaagste",       value: prices.lowPrice,       hint: "Incl. beschadigde / lagere conditie" },
  ];
  const active = points.filter((p) => p.value !== null);
  if (active.length === 0) return null;
  return (
    <div className="bg-surface rounded-2xl border hairline p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Alle prijsindicatoren · Cardmarket
        </div>
        {prices.updatedAt && (
          <div className="text-[11px] text-subtle">Snapshot {prices.updatedAt}</div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {active.map((p) => (
          <div key={p.label} className="p-3 rounded-xl bg-elevated">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5" title={p.hint}>{p.label}</div>
            <div className="text-[18px] font-semibold tabular-nums text-ink">€{p.value!.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlabPanel({ slabs }: { slabs: Slab[] }) {
  if (!slabs.length) return (
    <div className="bg-surface rounded-2xl p-5 border hairline text-sm text-muted">
      Geen prijsdata voor PSA-schatting.
    </div>
  );
  return (
    <div className="bg-surface rounded-2xl p-5 border hairline">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-4">Geschatte PSA slab prijzen · EUR</div>
      <div className="space-y-3">
        {slabs.map((s) => (
          <div key={s.grade} className="flex items-center justify-between border-b last:border-0 hairline pb-3 last:pb-0">
            <div>
              <div className="font-semibold text-ink text-[15px]">{s.grade}</div>
              <div className="text-[11px] text-subtle mt-0.5">range €{s.low} – €{s.high}</div>
            </div>
            <div className="text-[20px] font-semibold tabular-nums">€{s.mid}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-subtle mt-4 leading-relaxed">
        Schatting via raw × multiplier. Echte eBay sold data komt zodra dev account goedgekeurd is.
      </div>
    </div>
  );
}

function SignalsPanel({ signals }: { signals: Sig[] }) {
  if (!signals.length) return null;
  return (
    <div className="bg-surface rounded-2xl p-6 border hairline">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-4">Signalen</div>
      <div className="grid md:grid-cols-2 gap-3">
        {signals.map((s, i) => (
          <div key={i} className={`p-4 rounded-xl border ${s.positive ? "bg-pos/5 border-pos/25" : "bg-neg/5 border-neg/25"}`}>
            <div className={`font-semibold text-[14px] ${s.positive ? "text-pos" : "text-neg"}`}>
              {s.positive ? "✓" : "✕"} {s.label}
            </div>
            <div className="text-[13px] text-ink/85 mt-1.5 leading-snug">{s.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutlookPanel({ outlook }: { outlook: Outlook[] }) {
  return (
    <div className="bg-surface rounded-2xl p-6 border hairline">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-4">Prognose</div>
      <div className="grid grid-cols-3 gap-4">
        {outlook.map((o) => (
          <div key={o.horizon} className="p-5 rounded-xl bg-elevated">
            <div className="text-[11px] uppercase tracking-wider text-muted mb-2">{o.horizon}</div>
            <div className="text-[28px] font-semibold tabular-nums text-accent">{o.base}</div>
            <div className="text-[11px] text-muted mt-1.5 tabular-nums">bear {o.bear} · bull {o.bull}</div>
          </div>
        ))}
        <div className="p-5 rounded-xl bg-elevated">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Methode</div>
          <div className="text-[12px] text-ink/85 leading-snug">
            Base case op set-leeftijd, rariteit, IP-kracht, prijsniveau en 30-dagen trend.
          </div>
        </div>
      </div>
    </div>
  );
}
