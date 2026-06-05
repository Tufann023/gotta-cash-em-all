"use client";
import { useEffect, useState } from "react";
import PriceChart from "@/app/components/PriceChart";
import InvestmentAnalysis from "@/app/components/InvestmentAnalysis";
import AddToWallet from "@/app/components/AddToWallet";
import { CardDetailSkeleton } from "@/app/components/Skeleton";
import { useWatchlist } from "@/lib/watchlist";

type Slab = { grade: string; low: number; high: number; mid: number };
type Sig = { label: string; positive: boolean; reason: string };
type Outlook = { horizon: string; base: string; bear: string; bull: string };
type Analysis = { verdict: string; score: number; signals: Sig[]; outlook: Outlook[]; summary: string };

type PriceDetail = {
  primaryEUR: number | null;
  primarySource: "tcgplayer" | "cardmarket" | "none";
  primaryUpdatedAt: string | null;
  primaryStale: boolean;
  cm: {
    lowPriceExPlus: number | null; lowPrice: number | null; trendPrice: number | null;
    averageSellPrice: number | null; avg30: number | null; avg7: number | null; avg1: number | null;
    updatedAt: string | null; daysOld: number | null; stale: boolean;
  };
  tcg: {
    low: number | null; mid: number | null; high: number | null;
    market: number | null; directLow: number | null;
    updatedAt: string | null; daysOld: number | null; variantName: string | null;
    rateUsedUsdEur: number;
  };
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
  "Koop": "bg-posBg text-pos",
  "Neutraal": "bg-bg2 text-ink3",
  "Houden": "bg-[#FFF4CC] text-[#8a6600]",
  "Vermijden": "bg-negBg text-neg",
};

function sourceLabel(s: string): string {
  if (s === "tcgplayer") return "TCGPlayer (US)";
  if (s === "cardmarket") return "Cardmarket (EU)";
  return "—";
}

function freshLabel(days: number | null): { text: string; tone: "fresh" | "ok" | "stale" } {
  if (days === null) return { text: "Onbekend", tone: "stale" };
  if (days <= 7) return { text: `${days} dag${days === 1 ? "" : "en"} oud`, tone: "fresh" };
  if (days <= 60) return { text: `${days} dagen oud`, tone: "ok" };
  return { text: `${days} dagen oud`, tone: "stale" };
}

export default function CardPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
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

  if (err) return <div className="text-neg max-w-page mx-auto px-7 py-10">Fout: {err}</div>;
  if (!data) return <CardDetailSkeleton />;

  const { card, raw, prices, history, slabs, analysis } = data;
  const inList = hydrated && has(card.id);
  const headline = prices.primaryEUR ?? raw;
  const headlineSource = prices.primarySource;
  const cardmarketUrl = card.cardmarket?.url;
  const tcgplayerUrl = card.tcgplayer?.url;

  return (
    <div className="fade-in space-y-10 max-w-page mx-auto px-7 py-10">
      <a href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink2 hover:text-accent transition">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        Terug naar zoeken
      </a>

      <div className="grid md:grid-cols-[300px_1fr] gap-10">
        <div>
          <img src={card.images.large} alt={card.name}
               className="rounded-md border w-full shadow-sm" />
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase  text-pokeBlue mb-2">
              {card.set.name} · {card.set.series} · {card.set.releaseDate}
            </div>
            <h1 className="font-display text-4xl font-bold text-ink">{card.name}</h1>
            <div className="text-ink2 text-[14px] mt-2">
              #{card.number} · {card.rarity ?? "—"}{card.artist ? ` · ${card.artist}` : ""}
            </div>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-4xl font-semibold tabular-nums ">
              {headline ? `€${headline.toFixed(2)}` : "—"}
            </div>
            <div className="text-[13px] text-ink2">
              raw marktprijs · {sourceLabel(headlineSource)}
              {prices.primaryUpdatedAt && <> · bijgewerkt {prices.primaryUpdatedAt}</>}
              {prices.primaryStale && <span className="text-pokeRed"> · stale</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold ${verdictStyle[analysis.verdict] ?? "bg-bg2 text-ink2"}`}>
              {analysis.verdict}
              <span className="opacity-70 text-[11px] font-normal">score {analysis.score}</span>
            </span>

            <AddToWallet
              cardId={card.id}
              cardName={card.name}
              cardSet={card.set.name}
              cardImage={card.images.small}
              suggestedPriceEUR={headline}
            />

            <button
              onClick={() => inList ? remove(card.id) : add({
                id: card.id, name: card.name, setName: card.set.name,
                image: card.images.small, notedPriceEUR: headline,
              })}
              className={
                inList
                  ? "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold bg-bg2 text-ink hover:bg-line transition"
                  : "inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold bg-ink text-white hover:bg-pokeNavy transition"
              }
            >
              {inList ? "✓ In watchlist" : "👁 Volg op watchlist"}
            </button>

            {cardmarketUrl && (
              <a href={cardmarketUrl} target="_blank" rel="noopener"
                 className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-ink2 hover:text-accent hover:bg-bg2 transition">
                Cardmarket ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* AI INVESTERINGSANALYSE — primair, bovenaan na hero */}
      <InvestmentAnalysis cardId={card.id} currentPriceEUR={headline} />

      {/* PSA slabs — investerings-grades */}
      <div className="grid md:grid-cols-2 gap-5">
        <SlabPanel slabs={slabs} />
        <PriceChart data={history} />
      </div>

      {/* Quick-scorer signalen */}
      <SignalsPanel signals={analysis.signals} />

      {/* Volledige prijsbronnen — verlaagd qua hiërarchie */}
      <details className="bg-card rounded-md border p-5" style={{ borderColor: "#DCE7F4" }}>
        <summary className="cursor-pointer font-display text-[18px] text-ink select-none" style={{ fontWeight: 400 }}>
          Alle prijsindicatoren (TCGPlayer + Cardmarket)
        </summary>
        <div className="mt-4">
          <PricePanel prices={prices} cardmarketUrl={cardmarketUrl} tcgplayerUrl={tcgplayerUrl} />
        </div>
      </details>

      <div className="text-[11px] text-ink3 leading-relaxed">
        Quick-scorer (regel-gebaseerd, zonder AI): {analysis.summary}
      </div>
    </div>
  );
}

function PricePanel({ prices, cardmarketUrl, tcgplayerUrl }: {
  prices: PriceDetail;
  cardmarketUrl?: string;
  tcgplayerUrl?: string;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <SourcePanel
        title="TCGPlayer (US, USD → EUR)"
        subtitle={`Koers $1 = €${prices.tcg.rateUsedUsdEur.toFixed(2)} · variant: ${prices.tcg.variantName ?? "—"}`}
        url={tcgplayerUrl}
        updatedAt={prices.tcg.updatedAt}
        daysOld={prices.tcg.daysOld}
        points={[
          { label: "Low",          value: prices.tcg.low,       hint: "Laagste asking price" },
          { label: "Market",       value: prices.tcg.market,    hint: "TCGPlayer's market price" },
          { label: "Mid",          value: prices.tcg.mid,       hint: "Gemiddeld asking" },
          { label: "High",         value: prices.tcg.high,      hint: "Hoogste asking" },
          { label: "Direct Low",   value: prices.tcg.directLow, hint: "Goedkoopste TCGdirect (US shipping)" },
        ]}
      />
      <SourcePanel
        title="Cardmarket (EU, EUR)"
        subtitle="Snapshot via pokemontcg.io"
        url={cardmarketUrl}
        updatedAt={prices.cm.updatedAt}
        daysOld={prices.cm.daysOld}
        points={[
          { label: "Vanaf NM+",   value: prices.cm.lowPriceExPlus, hint: "Laagste vraagprijs near-mint of beter" },
          { label: "Trend",       value: prices.cm.trendPrice,     hint: "Cardmarket's fair value" },
          { label: "Gem. sell",   value: prices.cm.averageSellPrice, hint: "Gemiddelde recente verkopen" },
          { label: "30d gem.",    value: prices.cm.avg30 },
          { label: "7d gem.",     value: prices.cm.avg7 },
          { label: "Allerlaagste", value: prices.cm.lowPrice,      hint: "Incl. beschadigd" },
        ]}
      />
    </div>
  );
}

function SourcePanel({ title, subtitle, url, updatedAt, daysOld, points }: {
  title: string;
  subtitle: string;
  url?: string;
  updatedAt: string | null;
  daysOld: number | null;
  points: { label: string; value: number | null; hint?: string }[];
}) {
  const active = points.filter((p) => p.value !== null);
  const fl = freshLabel(daysOld);
  const toneColor =
    fl.tone === "fresh" ? "bg-posBg text-pos" :
    fl.tone === "ok"    ? "bg-bg2 text-pokeBlue" :
                          "bg-negBg text-pokeRed";

  return (
    <div className="bg-card rounded-md border p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <div className="font-semibold text-ink text-[14px]">{title}</div>
          <div className="text-[11px] text-ink2 mt-0.5">{subtitle}</div>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener"
             className="text-[11px] text-pokeBlue hover:underline whitespace-nowrap">
            Open ↗
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 mb-4 mt-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${toneColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${fl.tone === "fresh" ? "bg-pos" : fl.tone === "ok" ? "bg-pokeBlue" : "bg-pokeRed"}`} />
          {fl.text}
        </span>
        {updatedAt && <span className="text-[10px] text-ink3">{updatedAt}</span>}
      </div>
      {active.length === 0 ? (
        <div className="text-[12px] text-ink3 italic">Geen data beschikbaar uit deze bron.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {active.map((p) => (
            <div key={p.label} className="p-2.5 rounded-lg bg-bg2">
              <div className="text-[10px] uppercase  text-ink2 mb-1" title={p.hint}>{p.label}</div>
              <div className="text-[15px] font-semibold tabular-nums text-ink">€{p.value!.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlabPanel({ slabs }: { slabs: Slab[] }) {
  if (!slabs.length) return (
    <div className="bg-card rounded-md p-5 border text-sm text-ink2">
      Geen prijsdata voor PSA-schatting.
    </div>
  );
  return (
    <div className="bg-card rounded-md p-5 border">
      <div className="text-[11px] font-semibold uppercase  text-ink2 mb-4">Geschatte PSA slab prijzen · EUR</div>
      <div className="space-y-3">
        {slabs.map((s) => (
          <div key={s.grade} className="flex items-center justify-between border-b last:border-0 hairline pb-3 last:pb-0">
            <div>
              <div className="font-semibold text-ink text-[15px]">{s.grade}</div>
              <div className="text-[11px] text-ink3 mt-0.5">range €{s.low} – €{s.high}</div>
            </div>
            <div className="text-[20px] font-semibold tabular-nums">€{s.mid}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-ink3 mt-4 leading-relaxed">
        Schatting via raw × multiplier. Echte eBay sold data komt zodra dev account goedgekeurd is.
      </div>
    </div>
  );
}

function SignalsPanel({ signals }: { signals: Sig[] }) {
  if (!signals.length) return null;
  return (
    <div className="bg-card rounded-md p-6 border">
      <div className="text-[11px] font-semibold uppercase  text-ink2 mb-4">Signalen</div>
      <div className="grid md:grid-cols-2 gap-3">
        {signals.map((s, i) => (
          <div key={i} className={`p-4 rounded-md border ${s.positive ? "bg-posBg border-pos" : "bg-negBg border-neg"}`}>
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
    <div className="bg-card rounded-md p-6 border">
      <div className="text-[11px] font-semibold uppercase  text-ink2 mb-4">Prognose</div>
      <div className="grid grid-cols-3 gap-4">
        {outlook.map((o) => (
          <div key={o.horizon} className="p-5 rounded-md bg-bg2">
            <div className="text-[11px] uppercase  text-ink2 mb-2">{o.horizon}</div>
            <div className="text-[28px] font-semibold tabular-nums text-accent">{o.base}</div>
            <div className="text-[11px] text-ink2 mt-1.5 tabular-nums">bear {o.bear} · bull {o.bull}</div>
          </div>
        ))}
        <div className="p-5 rounded-md bg-bg2">
          <div className="text-[11px] uppercase  text-ink2 mb-2">Methode</div>
          <div className="text-[12px] text-ink/85 leading-snug">
            Base case op set-leeftijd, rariteit, IP-kracht, prijsniveau en 30-dagen trend.
          </div>
        </div>
      </div>
    </div>
  );
}
