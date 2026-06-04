"use client";
import { useState } from "react";

export type AIAnalysis = {
  verdict: "Sterke koop" | "Koop" | "Houden" | "Vermijden" | "Verkopen";
  confidence: "Hoog" | "Midden" | "Laag";
  oneliner: string;
  summary: string;
  forecasts: { horizon: string; bearEUR: number; baseEUR: number; bullEUR: number; rationale: string }[];
  catalysts: { title: string; description: string }[];
  risks: { title: string; description: string }[];
  strategy: {
    buyBelowEUR: number | null;
    sellAboveEUR: number | null;
    bestVehicle: string;
    rationale: string;
  };
  comparables: { name: string; reason: string }[];
  keyFigure: { label: string; value: string };
};

// ---------- Style maps ----------
const VERDICT_THEME: Record<AIAnalysis["verdict"], { bg: string; text: string; arc: string; emoji: string }> = {
  "Sterke koop": { bg: "#3FA34D", text: "#fff",     arc: "#3FA34D", emoji: "★" },
  "Koop":         { bg: "#e3f6e7", text: "#1f7a32", arc: "#3FA34D", emoji: "✓" },
  "Houden":       { bg: "#FFF4CC", text: "#8a6600", arc: "#FFCB05", emoji: "◐" },
  "Vermijden":    { bg: "#fdebe9", text: "#b3261e", arc: "#EE1515", emoji: "✕" },
  "Verkopen":     { bg: "#EE1515", text: "#fff",    arc: "#EE1515", emoji: "↓" },
};

const CONFIDENCE_DOTS: Record<AIAnalysis["confidence"], number> = { Laag: 1, Midden: 2, Hoog: 3 };

// ---------- Main panel ----------
export default function InvestmentAnalysis({
  cardId,
  initialAnalysis,
  currentPriceEUR,
}: {
  cardId: string;
  initialAnalysis?: AIAnalysis | null;
  currentPriceEUR: number | null;
}) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(initialAnalysis ?? null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cardId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI call failed");
      setAnalysis(json.analysis);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  if (!analysis) {
    return <EmptyAnalysisCTA loading={loading} err={err} onRun={run} />;
  }

  return (
    <article className="space-y-5 fade-up">
      <VerdictHero analysis={analysis} onRegen={run} loading={loading} />
      <ForecastsGrid forecasts={analysis.forecasts} currentPriceEUR={currentPriceEUR} />
      <StrategyPanel strategy={analysis.strategy} currentPriceEUR={currentPriceEUR} />
      <DriversGrid catalysts={analysis.catalysts} risks={analysis.risks} />
      <ComparablesPanel comparables={analysis.comparables} />
      {err && <div className="text-neg text-sm">Fout bij regen: {err}</div>}
    </article>
  );
}

// ---------- Empty state CTA ----------
function EmptyAnalysisCTA({ loading, err, onRun }: { loading: boolean; err: string | null; onRun: () => void }) {
  return (
    <div
      className="bg-card rounded-md border p-7 relative overflow-hidden"
      style={{ borderColor: "#DCE7F4", boxShadow: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)" }}
    >
      <div className="absolute -right-12 -top-12 w-[180px] h-[180px] rounded-full opacity-[.06]" style={{ background: "#EE1515" }} />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase text-accent mb-2" style={{ letterSpacing: ".14em" }}>
          AI Investerings-analyse
        </div>
        <h2 className="font-display text-[28px] md:text-[34px] text-ink m-0 mb-2" style={{ fontWeight: 400 }}>
          Krijg een gericht advies van Claude
        </h2>
        <p className="text-ink2 text-[14px] mb-5 max-w-xl" style={{ lineHeight: 1.55 }}>
          Verdict (Koop/Houden/Vermijden), prijsverwachting voor 3, 5 en 10 jaar (bear/base/bull),
          catalysten, risico's, koop- en verkoopniveaus, en vergelijkbare kaarten. Alles in 1 analyse.
        </p>
        <button
          onClick={onRun}
          disabled={loading}
          className="btn-physical font-display text-[16px] px-6 py-3 rounded-full inline-flex items-center gap-2"
          style={{ background: "#FFCB05", color: "#0B2A4A", letterSpacing: ".5px", boxShadow: "0 3px 0 #F2B705" }}
        >
          {loading ? (
            <>
              <span className="pokeball-spinner" />
              Genereren…
            </>
          ) : (
            <>
              ⚡ Genereer analyse
            </>
          )}
        </button>
        {err && <div className="text-neg text-[13px] mt-3">{err}</div>}
        <div className="text-[11px] text-ink3 mt-3">
          Claude Haiku 4.5 · ~$0,02 per analyse · 5-10 seconden
        </div>
      </div>
    </div>
  );
}

// ---------- Verdict hero ----------
function VerdictHero({ analysis, onRegen, loading }: { analysis: AIAnalysis; onRegen: () => void; loading: boolean }) {
  const t = VERDICT_THEME[analysis.verdict];
  const confDots = CONFIDENCE_DOTS[analysis.confidence];
  return (
    <div
      className="bg-card rounded-md border p-7 relative overflow-hidden"
      style={{ borderColor: "#DCE7F4", boxShadow: "0 8px 24px rgba(11,42,74,.10), 0 2px 6px rgba(11,42,74,.06)" }}
    >
      <div className="absolute -right-16 -top-16 w-[220px] h-[220px] rounded-full opacity-[.08]" style={{ background: t.arc }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="text-[11px] font-bold uppercase text-accent" style={{ letterSpacing: ".14em" }}>
            AI Investerings-analyse · Claude
          </div>
          <button
            onClick={onRegen}
            disabled={loading}
            className="text-[11px] font-semibold text-ink3 hover:text-accent transition inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Genereer opnieuw"
          >
            {loading ? <span className="pokeball-spinner" /> : <>↻</>} Opnieuw
          </button>
        </div>

        <div className="flex items-start gap-4 flex-wrap mb-4">
          <div
            className="step-badge rounded-full flex items-center justify-center font-display text-[28px] flex-none"
            style={{ background: t.bg, color: t.text, width: 64, height: 64 }}
          >
            {t.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[34px] md:text-[42px] m-0 leading-[1.05] text-ink" style={{ fontWeight: 400 }}>
              {analysis.verdict}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] uppercase font-bold text-ink3" style={{ letterSpacing: ".1em" }}>Confidence</span>
              <span className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full" style={{ background: i <= confDots ? t.arc : "#DCE7F4" }} />
                ))}
              </span>
              <span className="text-[12px] font-semibold text-ink2">{analysis.confidence}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase font-bold text-ink3" style={{ letterSpacing: ".1em" }}>{analysis.keyFigure.label}</div>
            <div className="font-display text-[26px] text-ink leading-none mt-1" style={{ fontWeight: 400 }}>{analysis.keyFigure.value}</div>
          </div>
        </div>

        <p className="text-ink text-[17px] font-semibold m-0 mb-3" style={{ lineHeight: 1.4 }}>
          {analysis.oneliner}
        </p>
        <p className="text-ink2 text-[14px] m-0" style={{ lineHeight: 1.6 }}>
          {analysis.summary}
        </p>
      </div>
    </div>
  );
}

// ---------- Forecasts grid ----------
function ForecastsGrid({ forecasts, currentPriceEUR }: { forecasts: AIAnalysis["forecasts"]; currentPriceEUR: number | null }) {
  return (
    <div className="bg-card rounded-md border p-5 md:p-6" style={{ borderColor: "#DCE7F4", boxShadow: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-[22px] text-ink m-0" style={{ fontWeight: 400 }}>Prijsverwachting</h3>
        {currentPriceEUR && (
          <div className="text-[11px] uppercase font-bold text-ink3" style={{ letterSpacing: ".1em" }}>
            Nu: <span className="text-ink font-display ml-1" style={{ fontSize: 14 }}>€{currentPriceEUR.toFixed(0)}</span>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-3 md:gap-4">
        {forecasts.map((f, i) => (
          <ForecastCard key={i} f={f} currentPriceEUR={currentPriceEUR} />
        ))}
      </div>
    </div>
  );
}

function ForecastCard({ f, currentPriceEUR }: { f: AIAnalysis["forecasts"][0]; currentPriceEUR: number | null }) {
  const baseROI = currentPriceEUR ? ((f.baseEUR - currentPriceEUR) / currentPriceEUR) * 100 : null;
  const bullROI = currentPriceEUR ? ((f.bullEUR - currentPriceEUR) / currentPriceEUR) * 100 : null;
  const bearROI = currentPriceEUR ? ((f.bearEUR - currentPriceEUR) / currentPriceEUR) * 100 : null;
  const roiColor = baseROI !== null && baseROI > 0 ? "#1f7a32" : "#b3261e";

  return (
    <div className="rounded-md border p-4" style={{ borderColor: "#DCE7F4", background: "#F4F8FE" }}>
      <div className="text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".1em" }}>
        {f.horizon}
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-[32px] text-ink leading-none" style={{ fontWeight: 400 }}>
          €{f.baseEUR.toLocaleString("nl-NL")}
        </span>
        {baseROI !== null && (
          <span className="text-[13px] font-bold tabular-nums" style={{ color: roiColor }}>
            {baseROI >= 0 ? "+" : ""}{baseROI.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#b3261e" }} />
          <span className="text-ink3 font-semibold uppercase" style={{ letterSpacing: ".06em" }}>Bear</span>
          <span className="text-ink font-semibold tabular-nums">€{f.bearEUR.toLocaleString("nl-NL")}</span>
          {bearROI !== null && <span className="text-ink3 tabular-nums">({bearROI >= 0 ? "+" : ""}{bearROI.toFixed(0)}%)</span>}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[11px] mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1f7a32" }} />
          <span className="text-ink3 font-semibold uppercase" style={{ letterSpacing: ".06em" }}>Bull</span>
          <span className="text-ink font-semibold tabular-nums">€{f.bullEUR.toLocaleString("nl-NL")}</span>
          {bullROI !== null && <span className="text-ink3 tabular-nums">({bullROI >= 0 ? "+" : ""}{bullROI.toFixed(0)}%)</span>}
        </span>
      </div>
      <p className="text-[12px] text-ink2 m-0" style={{ lineHeight: 1.5 }}>{f.rationale}</p>
    </div>
  );
}

// ---------- Strategy panel ----------
function StrategyPanel({ strategy, currentPriceEUR }: { strategy: AIAnalysis["strategy"]; currentPriceEUR: number | null }) {
  const buyDiff = strategy.buyBelowEUR !== null && currentPriceEUR ? currentPriceEUR - strategy.buyBelowEUR : null;
  return (
    <div className="bg-card rounded-md border p-5 md:p-6" style={{ borderColor: "#DCE7F4", boxShadow: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)" }}>
      <h3 className="font-display text-[22px] text-ink m-0 mb-4" style={{ fontWeight: 400 }}>Strategie</h3>
      <div className="grid md:grid-cols-3 gap-3 md:gap-4">
        {/* Buy below */}
        <div className="rounded-md border-2 p-4" style={{ borderColor: "#3FA34D", background: "#e3f6e7" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: "#3FA34D" }}>↓</span>
            <span className="text-[11px] uppercase font-bold" style={{ letterSpacing: ".08em", color: "#1f7a32" }}>Koop onder</span>
          </div>
          <div className="font-display text-[32px] leading-none text-ink mb-1" style={{ fontWeight: 400 }}>
            {strategy.buyBelowEUR !== null ? `€${strategy.buyBelowEUR.toLocaleString("nl-NL")}` : "—"}
          </div>
          {buyDiff !== null && buyDiff > 0 && (
            <div className="text-[11px] text-ink3 mb-2 font-semibold">€{buyDiff.toFixed(0)} onder huidige prijs</div>
          )}
          {buyDiff !== null && buyDiff <= 0 && (
            <div className="text-[11px] font-bold mb-2" style={{ color: "#1f7a32" }}>✓ Huidige prijs onder doel</div>
          )}
        </div>

        {/* Sell above */}
        <div className="rounded-md border-2 p-4" style={{ borderColor: "#EE1515", background: "#fdebe9" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: "#EE1515" }}>↑</span>
            <span className="text-[11px] uppercase font-bold" style={{ letterSpacing: ".08em", color: "#b3261e" }}>Verkoop boven</span>
          </div>
          <div className="font-display text-[32px] leading-none text-ink mb-1" style={{ fontWeight: 400 }}>
            {strategy.sellAboveEUR !== null ? `€${strategy.sellAboveEUR.toLocaleString("nl-NL")}` : "—"}
          </div>
          {currentPriceEUR && strategy.sellAboveEUR && (
            <div className="text-[11px] text-ink3 mb-2 font-semibold">
              +{(((strategy.sellAboveEUR - currentPriceEUR) / currentPriceEUR) * 100).toFixed(0)}% vanaf nu
            </div>
          )}
        </div>

        {/* Best vehicle */}
        <div className="rounded-md border-2 p-4" style={{ borderColor: "#2A75BB", background: "#E1ECFA" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: "#2A75BB" }}>★</span>
            <span className="text-[11px] uppercase font-bold" style={{ letterSpacing: ".08em", color: "#1B528C" }}>Beste vorm</span>
          </div>
          <div className="font-display text-[24px] leading-tight text-ink mb-1" style={{ fontWeight: 400 }}>
            {strategy.bestVehicle}
          </div>
        </div>
      </div>
      <p className="text-[13px] text-ink2 mt-4 m-0" style={{ lineHeight: 1.55 }}>{strategy.rationale}</p>
    </div>
  );
}

// ---------- Drivers grid (catalysts + risks) ----------
function DriversGrid({ catalysts, risks }: { catalysts: AIAnalysis["catalysts"]; risks: AIAnalysis["risks"] }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DriverPanel
        title="Catalysten"
        subtitle="Wat de prijs kan opdrijven"
        items={catalysts}
        accent="#3FA34D"
        accentBg="#e3f6e7"
        icon="↑"
      />
      <DriverPanel
        title="Risico's"
        subtitle="Wat de prijs kan drukken"
        items={risks}
        accent="#EE1515"
        accentBg="#fdebe9"
        icon="↓"
      />
    </div>
  );
}

function DriverPanel({
  title, subtitle, items, accent, accentBg, icon,
}: {
  title: string;
  subtitle: string;
  items: { title: string; description: string }[];
  accent: string;
  accentBg: string;
  icon: string;
}) {
  return (
    <div className="bg-card rounded-md border p-5" style={{ borderColor: "#DCE7F4", boxShadow: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)" }}>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[14px]" style={{ background: accent }}>{icon}</span>
        <h3 className="font-display text-[22px] text-ink m-0" style={{ fontWeight: 400 }}>{title}</h3>
      </div>
      <div className="text-[12px] text-ink3 mb-4 ml-9">{subtitle}</div>
      <div className="space-y-2.5">
        {items.map((it, i) => (
          <div key={i} className="rounded-md p-3 border" style={{ borderColor: "#DCE7F4", background: accentBg }}>
            <div className="font-semibold text-[14px] text-ink mb-1">{it.title}</div>
            <div className="text-[12px] text-ink2" style={{ lineHeight: 1.5 }}>{it.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Comparables ----------
function ComparablesPanel({ comparables }: { comparables: AIAnalysis["comparables"] }) {
  if (!comparables?.length) return null;
  return (
    <div className="bg-card rounded-md border p-5" style={{ borderColor: "#DCE7F4", boxShadow: "0 1px 2px rgba(11,42,74,.06), 0 2px 8px rgba(11,42,74,.05)" }}>
      <h3 className="font-display text-[22px] text-ink m-0 mb-1" style={{ fontWeight: 400 }}>Vergelijkbare kaarten</h3>
      <div className="text-[12px] text-ink3 mb-4">Kaarten met vergelijkbare investerings-dynamiek</div>
      <div className="grid md:grid-cols-3 gap-3">
        {comparables.map((c, i) => (
          <div key={i} className="rounded-md border p-3" style={{ borderColor: "#DCE7F4", background: "#F4F8FE" }}>
            <div className="font-semibold text-[14px] text-ink mb-1">{c.name}</div>
            <div className="text-[12px] text-ink2" style={{ lineHeight: 1.5 }}>{c.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
