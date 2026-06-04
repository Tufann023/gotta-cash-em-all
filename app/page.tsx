"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { ResultGridSkeleton, SearchingBar } from "./components/Skeleton";

type Result = {
  id: string; name: string; number: string; rarity?: string;
  setName: string; setId: string; setReleaseDate: string; image: string;
  priceEUR: number | null; year: number;
};

type PriceBucket = { label: string; min: number; max: number };
const PRICE_BUCKETS: PriceBucket[] = [
  { label: "Onder €5",        min: 0,    max: 5 },
  { label: "€5 – €25",        min: 5,    max: 25 },
  { label: "€25 – €100",      min: 25,   max: 100 },
  { label: "€100 – €500",     min: 100,  max: 500 },
  { label: "€500 – €2.000",   min: 500,  max: 2000 },
  { label: "€2.000+",         min: 2000, max: Infinity },
];

const SORT_OPTIONS = [
  { key: "relevance",  label: "Relevantie" },
  { key: "price-desc", label: "Prijs aflopend" },
  { key: "price-asc",  label: "Prijs oplopend" },
  { key: "year-desc",  label: "Nieuwste set" },
  { key: "year-asc",   label: "Oudste set" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["key"];

const PAGE_SIZE = 24;

export default function HomePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "search failed");
        setResults(json.data || []);
        // Reset filters bij nieuwe zoekopdracht
        setSelectedSets(new Set());
        setSelectedRarities(new Set());
        setSelectedBucket(null);
        setShownCount(PAGE_SIZE);
      } catch (e: any) { setErr(e.message || "Onbekende fout"); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Unieke sets & rariteiten uit huidige resultaten
  const availableSets = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((r) => m.set(r.setName, (m.get(r.setName) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const availableRarities = useMemo(() => {
    const m = new Map<string, number>();
    results.forEach((r) => { if (r.rarity) m.set(r.rarity, (m.get(r.rarity) ?? 0) + 1); });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [results]);

  // Apply filters + sort
  const filtered = useMemo(() => {
    let xs = results.filter((r) => {
      if (selectedSets.size > 0 && !selectedSets.has(r.setName)) return false;
      if (selectedRarities.size > 0 && (!r.rarity || !selectedRarities.has(r.rarity))) return false;
      if (selectedBucket !== null) {
        const b = PRICE_BUCKETS[selectedBucket];
        if (r.priceEUR == null) return false;
        if (r.priceEUR < b.min || r.priceEUR >= b.max) return false;
      }
      return true;
    });
    if (sort === "price-desc") xs.sort((a, b) => (b.priceEUR ?? -1) - (a.priceEUR ?? -1));
    else if (sort === "price-asc") xs.sort((a, b) => (a.priceEUR ?? Infinity) - (b.priceEUR ?? Infinity));
    else if (sort === "year-desc") xs.sort((a, b) => b.year - a.year);
    else if (sort === "year-asc") xs.sort((a, b) => a.year - b.year);
    return xs;
  }, [results, selectedSets, selectedRarities, selectedBucket, sort]);

  const visible = filtered.slice(0, shownCount);
  const activeFilters = selectedSets.size + selectedRarities.size + (selectedBucket !== null ? 1 : 0);

  const toggleSet = (s: string) => {
    const next = new Set(selectedSets);
    next.has(s) ? next.delete(s) : next.add(s);
    setSelectedSets(next); setShownCount(PAGE_SIZE);
  };
  const toggleRarity = (s: string) => {
    const next = new Set(selectedRarities);
    next.has(s) ? next.delete(s) : next.add(s);
    setSelectedRarities(next); setShownCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto pt-6">
        <h1 className="text-5xl md:text-6xl font-semibold text-ink tracking-display leading-[1.05]">
          Elke Pokemon kaart.<br />
          <span className="text-muted">Eén prijs.</span>
        </h1>
        <p className="mt-5 text-[17px] text-muted leading-relaxed">
          Zoek per kaartnaam, set of nummer. Direct marktprijs, PSA-schatting per grade, prijsverloop en investerings-analyse.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Charizard 151, Umbreon VMAX, Pikachu…"
            autoFocus
            className="w-full bg-surface border hairline rounded-2xl pl-13 pr-5 py-4 text-[17px] outline-none focus:border-accent focus:ring-4 focus:ring-accentSoft transition shadow-card"
            style={{ paddingLeft: "3.25rem" }}
          />
          {loading && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 rounded-full border-2 border-elevated" />
                <div className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 justify-center text-[12px] text-muted">
          <span>Probeer:</span>
          {["charizard 151", "umbreon vmax", "lugia silver", "pikachu vmax"].map((s) => (
            <button key={s} onClick={() => setQ(s)} className="px-2.5 py-1 rounded-full bg-elevated hover:bg-accentSoft hover:text-accent transition">
              {s}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="text-neg text-sm text-center">Fout: {err}</div>}

      {/* Skeleton during initial loading */}
      {loading && results.length === 0 && q.trim().length >= 2 && (
        <div className="fade-in space-y-4">
          <SearchingBar />
          <ResultGridSkeleton count={10} />
        </div>
      )}

      {results.length > 0 && (
        <div className="fade-in space-y-6">
          {/* Results header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-[14px] text-muted">
              <span className="text-ink font-semibold">{filtered.length}</span> van {results.length} resultaten
              {activeFilters > 0 && <span> · {activeFilters} filter{activeFilters > 1 ? "s" : ""} actief</span>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-muted">Sorteer:</label>
              <select
                value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-surface border hairline rounded-lg px-3 py-1.5 text-[13px] outline-none focus:border-accent transition"
              >
                {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Filter panel */}
          <div className="bg-surface rounded-2xl border hairline p-5 space-y-4">
            {availableSets.length > 1 && (
              <FilterGroup label={`Set (${availableSets.length})`}>
                {availableSets.slice(0, 12).map(([s, count]) => (
                  <Chip
                    key={s} active={selectedSets.has(s)} onClick={() => toggleSet(s)}
                    label={s} hint={`${count}`}
                  />
                ))}
              </FilterGroup>
            )}
            {availableRarities.length > 1 && (
              <FilterGroup label={`Rariteit (${availableRarities.length})`}>
                {availableRarities.slice(0, 10).map(([r, count]) => (
                  <Chip
                    key={r} active={selectedRarities.has(r)} onClick={() => toggleRarity(r)}
                    label={r} hint={`${count}`}
                  />
                ))}
              </FilterGroup>
            )}
            <FilterGroup label="Prijsklasse">
              {PRICE_BUCKETS.map((b, i) => (
                <Chip
                  key={i} active={selectedBucket === i}
                  onClick={() => { setSelectedBucket(selectedBucket === i ? null : i); setShownCount(PAGE_SIZE); }}
                  label={b.label}
                />
              ))}
            </FilterGroup>
            {activeFilters > 0 && (
              <button
                onClick={() => { setSelectedSets(new Set()); setSelectedRarities(new Set()); setSelectedBucket(null); }}
                className="text-[12px] text-accent hover:underline"
              >
                ← Wis alle filters
              </button>
            )}
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {visible.map((r) => (
                  <a key={r.id} href={`/card/${encodeURIComponent(r.id)}`}
                     className="group bg-surface rounded-2xl overflow-hidden hover:shadow-hover transition-all border hairline">
                    <div className="aspect-[2.5/3.5] bg-elevated">
                      <img src={r.image} alt={r.name} loading="lazy"
                           className="w-full h-full object-contain p-2.5 group-hover:scale-[1.02] transition-transform" />
                    </div>
                    <div className="p-3.5">
                      <div className="font-semibold text-[14px] text-ink truncate group-hover:text-accent transition">
                        {r.name}
                      </div>
                      <div className="text-[11px] text-muted truncate mt-0.5">
                        {r.setName} · #{r.number}
                      </div>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-[10px] text-subtle uppercase tracking-wider truncate pr-1">
                          {r.rarity ?? "—"}
                        </span>
                        <span className="text-[15px] font-semibold text-ink tabular-nums whitespace-nowrap">
                          {r.priceEUR ? `€${r.priceEUR.toFixed(2)}` : "—"}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {filtered.length > shownCount && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShownCount(shownCount + PAGE_SIZE)}
                    className="px-6 py-3 rounded-full bg-ink text-white text-[13px] font-semibold hover:bg-accent transition"
                  >
                    Laad meer ({Math.min(PAGE_SIZE, filtered.length - shownCount)}) · {filtered.length - shownCount} nog te zien
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted">
              Geen kaarten match de actieve filters.
            </div>
          )}
        </div>
      )}

      {!loading && q.trim().length >= 2 && results.length === 0 && !err && (
        <ExternalSearchPanel query={q} reason="zero" />
      )}

      {results.length > 0 && filtered.length === visible.length && filtered.length >= 50 && (
        <ExternalSearchPanel query={q} reason="completeness" />
      )}

      {q.trim().length < 2 && (
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-8">
          {[
            { t: "Zoek", d: "Type een kaartnaam, set of nummer. Resultaten direct, met live marktprijs.", n: "1" },
            { t: "Bekijk", d: "PSA 8/9/10 schattingen, 30-dagen prijsverloop, signalen en prognose op 3 en 5 jaar.", n: "2" },
            { t: "Beslis", d: "Quick-analyse direct. Diepere AI-analyse op verzoek via Claude.", n: "3" },
          ].map((s) => (
            <div key={s.t} className="bg-surface rounded-2xl p-6 border hairline">
              <div className="w-9 h-9 rounded-full bg-accentSoft text-accent font-semibold text-sm flex items-center justify-center mb-4">
                {s.n}
              </div>
              <div className="font-semibold text-ink text-[16px] mb-1.5">{s.t}</div>
              <div className="text-[13px] text-muted leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition flex items-center gap-1.5 ${
        active
          ? "bg-accent text-white"
          : "bg-elevated text-ink hover:bg-accentSoft hover:text-accent"
      }`}
    >
      <span>{label}</span>
      {hint && <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>{hint}</span>}
    </button>
  );
}

function ExternalSearchPanel({ query, reason }: { query: string; reason: "zero" | "completeness" }) {
  const q = encodeURIComponent(query);
  const pokemonQ = encodeURIComponent(`${query} pokemon`);
  const links = [
    {
      label: "PriceCharting",
      url: `https://www.pricecharting.com/search-products?q=${pokemonQ}&type=prices`,
      desc: "Volledige database incl. Japanse promo's, vintage en sealed product",
    },
    {
      label: "TCGdex",
      url: `https://tcgdex.net/series?q=${q}`,
      desc: "Internationale TCG-database met betere Japanse coverage",
    },
    {
      label: "eBay sold",
      url: `https://www.ebay.com/sch/i.html?_nkw=${pokemonQ}&LH_Sold=1&LH_Complete=1`,
      desc: "Actuele verkooptransacties van de laatste 90 dagen",
    },
  ];
  return (
    <div className={`bg-surface rounded-2xl border hairline p-6 ${reason === "zero" ? "mt-8" : "mt-8"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">
        {reason === "zero" ? "Niets gevonden?" : "Niet wat je zocht?"}
      </div>
      <div className="font-semibold text-ink text-[16px] mb-2">
        {reason === "zero"
          ? `Geen kaart in onze database met "${query}".`
          : "Op zoek naar een Japanse promo, vintage of sealed product?"}
      </div>
      <p className="text-[13px] text-muted leading-relaxed mb-4 max-w-2xl">
        Onze data komt van pokemontcg.io — primair Engelstalig, beperkte Japanse coverage en geen sealed product.
        Probeer een van deze externe databases met bredere dekking:
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener"
             className="group block p-4 rounded-xl bg-elevated hover:bg-accentSoft transition">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-ink text-[14px] group-hover:text-accent transition">{l.label}</span>
              <svg className="text-muted group-hover:text-accent transition" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
              </svg>
            </div>
            <div className="text-[11px] text-muted leading-snug">{l.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
