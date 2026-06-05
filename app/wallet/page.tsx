"use client";
import { useEffect, useState, useMemo } from "react";
import {
  useWallet, calcCurrentValue, conditionLabel, Holding,
} from "@/lib/wallet";
import EditHolding from "@/app/components/EditHolding";

type LiveValue = {
  rawEUR: number | null;
  slabs: { grade: string; mid: number }[];
};

export default function WalletPage() {
  const { items, remove, hydrated } = useWallet();
  const [live, setLive] = useState<Record<string, LiveValue>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    setLoading(true);
    const uniqueCardIds = Array.from(new Set(items.map((it) => it.cardId)));
    Promise.all(
      uniqueCardIds.map(async (cid) => {
        try {
          const res = await fetch(`/api/card/${encodeURIComponent(cid)}`);
          if (!res.ok) return [cid, { rawEUR: null, slabs: [] }] as const;
          const json = await res.json();
          return [cid, {
            rawEUR: json.raw as number | null,
            slabs: (json.slabs ?? []).map((s: any) => ({ grade: s.grade, mid: s.mid })),
          }] as const;
        } catch {
          return [cid, { rawEUR: null, slabs: [] }] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, LiveValue> = {};
      entries.forEach(([id, v]) => { map[id] = v; });
      setLive(map);
      setLoading(false);
    });
  }, [hydrated, items.length, items.map((i) => i.cardId).join(",")]);

  const totals = useMemo(() => {
    let cost = 0;
    let current = 0;
    let knownCount = 0;
    items.forEach((it) => {
      cost += it.purchasePriceEUR * it.quantity;
      const lv = live[it.cardId];
      if (lv) {
        const cur = calcCurrentValue(it.condition, lv.rawEUR, lv.slabs);
        if (cur !== null) {
          current += cur * it.quantity;
          knownCount += it.quantity;
        }
      }
    });
    const delta = current - cost;
    const deltaPct = cost > 0 ? (delta / cost) * 100 : 0;
    return { cost, current, delta, deltaPct, knownCount };
  }, [items, live]);

  if (!hydrated) {
    return <div className="text-ink2 max-w-page mx-auto px-7 py-10">Laden…</div>;
  }

  const isPos = totals.delta >= 0;
  const accent = isPos ? "#3FA34D" : "#EE1515";
  const accentBg = isPos ? "#e3f6e7" : "#fdebe9";

  return (
    <div className="fade-in space-y-8 max-w-page mx-auto px-4 md:px-7 py-10">
      <div>
        <h1 className="font-display text-4xl font-bold text-ink m-0">Mijn wallet</h1>
        <p className="text-ink2 text-[15px] mt-2">
          {items.length === 0
            ? "Voeg kaarten toe die je hebt om je verzameling én actuele waarde bij te houden."
            : `${items.length} kaart${items.length === 1 ? "" : "en"} in je wallet. Waardes worden live opgehaald.`}
        </p>
      </div>

      {items.length === 0 && (
        <div className="bg-card rounded-md p-12 border text-center" style={{ borderColor: "#DCE7F4" }}>
          <div className="text-6xl mb-4">💎</div>
          <div className="font-display text-[24px] text-ink mb-2" style={{ fontWeight: 400 }}>Nog geen kaarten</div>
          <div className="text-ink2 text-[14px] mb-6 max-w-md mx-auto" style={{ lineHeight: 1.55 }}>
            Zoek een kaart die je hebt, en gebruik de "Voeg toe aan mijn wallet"-knop
            om hem hier op te slaan. Per kaart kun je aangeven of het een losse kaart
            of een geslepen versie (PSA/BGS/CGC) is, wanneer je 'm kocht en voor hoeveel.
          </div>
          <a href="/" className="btn-physical inline-block px-5 py-2.5 rounded-full text-[13px]"
             style={{ background: "#FFCB05", color: "#0B2A4A", letterSpacing: ".5px", boxShadow: "0 3px 0 #F2B705" }}>
            Begin met zoeken
          </a>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* Total balance hero */}
          <div className="rounded-md border-2 p-5 md:p-7 relative overflow-hidden"
               style={{ borderColor: accent, background: accentBg }}>
            <div className="absolute -right-16 -top-16 w-[220px] h-[220px] rounded-full opacity-[.10]" style={{ background: accent }} />
            <div className="relative grid md:grid-cols-3 gap-5">
              <div>
                <div className="text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".1em" }}>Wat je hebt betaald</div>
                <div className="font-display text-[36px] md:text-[42px] text-ink leading-none" style={{ fontWeight: 400 }}>
                  €{totals.cost.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[12px] text-ink3 mt-1">Optelsom van al je aankoopprijzen</div>
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".1em" }}>Waard op dit moment</div>
                <div className="font-display text-[36px] md:text-[42px] text-ink leading-none" style={{ fontWeight: 400 }}>
                  €{totals.current.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                </div>
                {loading && <div className="text-[12px] text-ink3 mt-1">Prijzen ophalen…</div>}
                {!loading && (
                  <div className="text-[12px] text-ink3 mt-1">
                    {totals.knownCount} van {items.reduce((s, i) => s + i.quantity, 0)} stuks met prijs
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: ".1em", color: accent }}>
                  {isPos ? "Winst" : "Verlies"}
                </div>
                <div className="font-display text-[36px] md:text-[42px] leading-none" style={{ fontWeight: 400, color: accent }}>
                  {isPos ? "+" : ""}€{Math.abs(totals.delta).toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[12px] font-semibold mt-1" style={{ color: accent }}>
                  {isPos ? "+" : ""}{totals.deltaPct.toFixed(1)}% sinds je kocht
                </div>
              </div>
            </div>
          </div>

          {/* Holdings list */}
          <div className="space-y-3">
            {items.map((it) => (
              <HoldingRow
                key={it.id}
                holding={it}
                live={live[it.cardId]}
                loading={loading && !live[it.cardId]}
                onRemove={() => remove(it.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HoldingRow({
  holding, live, loading, onRemove,
}: {
  holding: Holding;
  live?: LiveValue;
  loading: boolean;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const current = live ? calcCurrentValue(holding.condition, live.rawEUR, live.slabs) : null;
  const cost = holding.purchasePriceEUR * holding.quantity;
  const currentTotal = current !== null ? current * holding.quantity : null;
  const delta = currentTotal !== null ? currentTotal - cost : null;
  const deltaPct = delta !== null && cost > 0 ? (delta / cost) * 100 : null;
  const accent = delta === null ? "#6E86A3" : delta >= 0 ? "#3FA34D" : "#EE1515";
  const purchaseDateLabel = holding.purchaseDate
    ? new Date(holding.purchaseDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="bg-card rounded-md border p-4 flex items-center gap-3 md:gap-5 hover:shadow-sm transition" style={{ borderColor: "#DCE7F4" }}>
      <a href={`/card/${encodeURIComponent(holding.cardId)}`} className="flex-shrink-0">
        <img src={holding.cardImage} alt={holding.cardName} className="w-14 h-20 object-contain rounded" />
      </a>

      <div className="flex-1 min-w-0">
        <a href={`/card/${encodeURIComponent(holding.cardId)}`} className="block">
          <div className="font-semibold text-ink text-[15px] truncate hover:text-accent transition">
            {holding.cardName}
            {holding.quantity > 1 && <span className="text-ink3 font-normal text-[12px] ml-2">×{holding.quantity}</span>}
          </div>
        </a>
        <div className="text-[12px] text-ink3 truncate">
          {holding.cardSet}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-pokeBlue px-2 py-0.5 rounded-full bg-bg2" style={{ letterSpacing: ".05em" }}>
            {conditionLabel(holding.condition)}
          </span>
          {purchaseDateLabel && (
            <span className="text-[11px] text-ink3">gekocht {purchaseDateLabel}</span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right min-w-[100px] hidden sm:block">
        <div className="text-[10px] uppercase font-bold text-ink3" style={{ letterSpacing: ".06em" }}>Betaald</div>
        <div className="text-[14px] tabular-nums text-ink font-semibold">
          €{cost.toFixed(0)}
        </div>
        {holding.quantity > 1 && (
          <div className="text-[10px] text-ink3 tabular-nums">€{holding.purchasePriceEUR.toFixed(0)}/st</div>
        )}
      </div>

      <div className="flex-shrink-0 text-right min-w-[110px]">
        <div className="text-[10px] uppercase font-bold text-ink3" style={{ letterSpacing: ".06em" }}>Nu waard</div>
        <div className="text-[16px] tabular-nums font-semibold text-ink">
          {loading ? "…" : currentTotal !== null ? `€${currentTotal.toFixed(0)}` : "—"}
        </div>
        {delta !== null && deltaPct !== null && (
          <div className="text-[12px] tabular-nums font-bold" style={{ color: accent }}>
            {delta >= 0 ? "+" : ""}€{Math.abs(delta).toFixed(0)} ({delta >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%)
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-1.5">
        <button
          onClick={() => setEditing(true)}
          title="Aanpassen"
          className="w-9 h-9 rounded-full bg-bg2 hover:bg-pokeBlue/10 hover:text-pokeBlue text-ink2 flex items-center justify-center transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          onClick={() => {
            if (confirm(`"${holding.cardName}" uit je wallet halen?`)) onRemove();
          }}
          title="Verwijderen"
          className="w-9 h-9 rounded-full bg-bg2 hover:bg-pokeRed/10 hover:text-pokeRed text-ink2 flex items-center justify-center transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>

      {editing && <EditHolding holding={holding} onClose={() => setEditing(false)} />}
    </div>
  );
}
