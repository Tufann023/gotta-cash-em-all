"use client";
import { useEffect, useState } from "react";
import { useWatchlist, WatchlistItem } from "@/lib/watchlist";

type LivePrice = {
  raw: number | null;
  delta: number | null; // % verschil vs noted
};

export default function WatchlistPage() {
  const { items, remove, hydrated } = useWatchlist();
  const [live, setLive] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    setLoading(true);
    Promise.all(
      items.map(async (it) => {
        try {
          const res = await fetch(`/api/card/${encodeURIComponent(it.id)}`);
          if (!res.ok) return [it.id, { raw: null, delta: null }] as const;
          const json = await res.json();
          const raw: number | null = json.raw;
          const delta = it.notedPriceEUR && raw
            ? ((raw - it.notedPriceEUR) / it.notedPriceEUR) * 100
            : null;
          return [it.id, { raw, delta }] as const;
        } catch {
          return [it.id, { raw: null, delta: null }] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, LivePrice> = {};
      entries.forEach(([id, v]) => { map[id] = v; });
      setLive(map);
      setLoading(false);
    });
  }, [hydrated, items.length]);

  if (!hydrated) return <div className="text-muted">Laden…</div>;

  return (
    <div className="fade-in space-y-8">
      <div>
        <h1 className="font-display text-4xl font-bold text-ink">Watchlist</h1>
        <p className="text-muted text-[15px] mt-2">
          {items.length === 0
            ? "Voeg kaarten toe via de + Watchlist-knop op een kaartpagina."
            : `${items.length} kaart${items.length === 1 ? "" : "en"} opgeslagen. Prijzen worden live bijgewerkt.`}
        </p>
      </div>

      {items.length === 0 && (
        <div className="bg-surface rounded-2xl p-12 border hairline text-center">
          <div className="text-6xl mb-4">📊</div>
          <div className="font-semibold text-ink text-[18px] mb-2">Nog geen kaarten</div>
          <div className="text-muted text-[14px] mb-6 max-w-md mx-auto">
            Zoek een kaart en gebruik de "+ Watchlist" knop om hem hier op te slaan.
            Bij elk bezoek zie je actuele prijs + verschil sinds toevoeging.
          </div>
          <a href="/" className="btn-poke inline-block px-5 py-2.5 rounded-full text-[13px]">
            Begin met zoeken
          </a>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((it) => (
            <WatchlistRow
              key={it.id}
              item={it}
              live={live[it.id]}
              loading={loading && !live[it.id]}
              onRemove={() => remove(it.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistRow({
  item, live, loading, onRemove,
}: {
  item: WatchlistItem;
  live?: LivePrice;
  loading: boolean;
  onRemove: () => void;
}) {
  const delta = live?.delta ?? null;
  const noted = item.notedPriceEUR;
  const since = new Date(item.addedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="bg-surface rounded-2xl border hairline p-4 flex items-center gap-5 hover:shadow-card transition">
      <a href={`/card/${encodeURIComponent(item.id)}`} className="flex-shrink-0">
        <img src={item.image} alt={item.name} className="w-14 h-20 object-contain rounded-lg" />
      </a>

      <div className="flex-1 min-w-0">
        <a href={`/card/${encodeURIComponent(item.id)}`} className="block">
          <div className="font-semibold text-ink text-[15px] truncate hover:text-accent transition">{item.name}</div>
          <div className="text-[12px] text-muted truncate">{item.setName} · toegevoegd {since}</div>
        </a>
      </div>

      <div className="flex-shrink-0 text-right min-w-[120px]">
        <div className="text-[11px] text-muted uppercase tracking-wider">Toegevoegd</div>
        <div className="text-[14px] tabular-nums text-ink">
          {noted ? `€${noted.toFixed(2)}` : "—"}
        </div>
      </div>

      <div className="flex-shrink-0 text-right min-w-[130px]">
        <div className="text-[11px] text-muted uppercase tracking-wider">Nu</div>
        <div className="text-[16px] tabular-nums font-semibold text-ink">
          {loading ? "…" : live?.raw ? `€${live.raw.toFixed(2)}` : "—"}
        </div>
        {delta !== null && (
          <div className={`text-[12px] tabular-nums font-semibold ${delta >= 0 ? "text-pos" : "text-neg"}`}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        title="Verwijder uit watchlist"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-elevated hover:bg-neg/10 hover:text-neg text-muted flex items-center justify-center transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  );
}
