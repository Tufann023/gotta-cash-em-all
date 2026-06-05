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

const SUGGESTIONS = [
  { label: "charizard 151", pip: "#FF6B35" }, // fire
  { label: "umbreon vmax",  pip: "#3A4756" }, // dark
  { label: "lugia silver",  pip: "#2A75BB" }, // water
  { label: "pikachu vmax",  pip: "#FFCB05" }, // electric
];

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
        setSelectedSets(new Set());
        setSelectedRarities(new Set());
        setSelectedBucket(null);
        setShownCount(PAGE_SIZE);
      } catch (e: any) { setErr(e.message || "Onbekende fout"); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

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
    <>
      {/* HERO */}
      <section className="px-7 pt-[84px] pb-9 text-center overflow-hidden">
        <div className="max-w-page mx-auto">
          <span
            className="inline-flex items-center gap-2 font-bold text-[13px] uppercase rounded-full px-[15px] py-[7px] mb-[26px] whitespace-nowrap"
            style={{
              letterSpacing: ".14em",
              color: "#EE1515",
              background: "color-mix(in srgb, #EE1515 12%, #fff)",
              border: "1px solid color-mix(in srgb, #EE1515 28%, transparent)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#EE1515", boxShadow: "0 0 0 3px color-mix(in srgb, #EE1515 25%, transparent)" }}
            />
            Zonder gezeik · Live prijzen · Echt advies
          </span>
          <h1
            className="font-display m-0 text-ink"
            style={{
              fontSize: "clamp(46px, 8.5vw, 104px)",
              lineHeight: ".94",
              letterSpacing: "-.5px",
              fontWeight: 400,
            }}
          >
            Karton of kassa?
            <span
              className="logo-treatment-large"
              style={{ display: "block", transform: "rotate(-1.5deg)", marginTop: ".06em" }}
            >
              Wij rekenen 't uit.
            </span>
          </h1>
          <p
            className="max-w-prose mx-auto mt-[30px] text-ink2 font-normal"
            style={{ fontSize: "clamp(17px, 2vw, 21px)", textWrap: "balance" }}
          >
            Check elke Pokémon-kaart in 2 seconden. Live prijzen, PSA-schattingen en prognose voor 3, 5 en 10 jaar. Geen halve waarheden — wij zeggen gewoon wat 'ie écht waard is.
          </p>

          {/* SEARCH ZONE */}
          <div className="max-w-[760px] mx-auto mt-[46px] relative">
            <form
              className="holo-glow flex items-center gap-[14px] bg-card border-2 rounded-full shadow-md transition-all"
              style={{ borderColor: "#C3D5EC", padding: "6px 6px 6px 24px" }}
              onSubmit={(e) => e.preventDefault()}
              autoComplete="off"
            >
              <span className="flex-none text-accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Charizard 151, Umbreon VMAX, Pikachu…"
                aria-label="Zoek een kaart"
                autoFocus
                className="flex-1 bg-transparent border-0 outline-none font-medium text-[18px] text-ink min-w-0 py-4 placeholder:text-ink3 placeholder:font-medium"
              />
              {loading && (
                <span className="pokeball-spinner mr-2" aria-label="Aan het zoeken" role="status" />
              )}
              <button
                type="submit"
                className="btn-physical flex-none font-display text-[17px] rounded-full inline-flex items-center justify-center"
                style={{
                  background: "#FFCB05",
                  color: "#0B2A4A",
                  letterSpacing: ".5px",
                  padding: "0 26px",
                  height: 54,
                  lineHeight: 1,
                  paddingTop: 4,
                  boxShadow: "0 3px 0 #F2B705",
                }}
              >
                Zoek
              </button>
            </form>

            <div className="flex items-center justify-center flex-wrap gap-[10px] mt-[22px]">
              <span className="text-ink3 font-semibold text-[14px] mr-0.5">Of test 'm met:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setQ(s.label)}
                  className="inline-flex items-center gap-2 font-semibold text-[14px] text-ink2 bg-card border-[1.5px] rounded-full px-4 py-[9px] transition-all duration-150 hover:-translate-y-0.5 hover:text-ink hover:shadow-sm"
                  style={{ borderColor: "#C3D5EC" }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EE1515"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#C3D5EC"; }}
                >
                  <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: s.pip }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ERR */}
          {err && <div className="text-neg text-sm mt-6">Fout: {err}</div>}

          {/* SKELETON */}
          {loading && results.length === 0 && q.trim().length >= 2 && (
            <div className="fade-up max-w-[1000px] mx-auto mt-[38px] text-left space-y-4">
              <SearchingBar />
              <ResultGridSkeleton count={10} />
            </div>
          )}

          {/* RESULTS */}
          {results.length > 0 && (
            <div className="fade-up max-w-[1000px] mx-auto mt-[38px] text-left">
              <div className="flex items-baseline justify-between mb-[18px] px-1 flex-wrap gap-3">
                <h2 className="font-display font-normal text-[26px] m-0 text-ink">
                  Buit voor "{q}"
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-ink3 font-semibold text-[14px]">
                    {filtered.length} van {results.length}
                  </span>
                  <button
                    onClick={() => setFiltersOpen((v) => !v)}
                    aria-expanded={filtersOpen}
                    aria-controls="filter-panel"
                    className={`inline-flex items-center gap-2 px-[14px] py-[8px] rounded-full text-[13px] font-semibold transition border ${
                      filtersOpen
                        ? "bg-accent text-white"
                        : activeFilters > 0
                          ? "bg-accentSoft text-accent"
                          : "bg-card text-ink2"
                    }`}
                    style={{ borderColor: filtersOpen ? "#EE1515" : activeFilters > 0 ? "#EE1515" : "#C3D5EC" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M3 6h18M7 12h10M10 18h4" />
                    </svg>
                    Filter
                    {activeFilters > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${filtersOpen ? "bg-white/25 text-white" : "bg-accent text-white"}`}>
                        {activeFilters}
                      </span>
                    )}
                  </button>
                  <select
                    aria-label="Sorteer resultaten"
                    value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
                    className="bg-card border rounded-full px-[14px] py-[8px] text-[13px] font-semibold text-ink2 outline-none cursor-pointer transition focus:border-accent"
                    style={{ borderColor: "#C3D5EC" }}
                  >
                    {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {filtersOpen && (
                <div id="filter-panel" className="fade-up bg-card rounded-md border p-5 mb-5 space-y-4" style={{ borderColor: "#DCE7F4" }} role="region" aria-label="Filter opties">
                  {availableSets.length > 1 && (
                    <FilterGroup label={`Set (${availableSets.length})`}>
                      {availableSets.slice(0, 12).map(([s, count]) => (
                        <Chip key={s} active={selectedSets.has(s)} onClick={() => toggleSet(s)} label={s} hint={`${count}`} />
                      ))}
                    </FilterGroup>
                  )}
                  {availableRarities.length > 1 && (
                    <FilterGroup label={`Rariteit (${availableRarities.length})`}>
                      {availableRarities.slice(0, 10).map(([r, count]) => (
                        <Chip key={r} active={selectedRarities.has(r)} onClick={() => toggleRarity(r)} label={r} hint={`${count}`} />
                      ))}
                    </FilterGroup>
                  )}
                  <FilterGroup label="Prijsklasse">
                    {PRICE_BUCKETS.map((b, i) => (
                      <Chip key={i} active={selectedBucket === i}
                        onClick={() => { setSelectedBucket(selectedBucket === i ? null : i); setShownCount(PAGE_SIZE); }}
                        label={b.label} />
                    ))}
                  </FilterGroup>
                  {activeFilters > 0 && (
                    <button
                      onClick={() => { setSelectedSets(new Set()); setSelectedRarities(new Set()); setSelectedBucket(null); }}
                      className="text-[12px] text-accent hover:underline font-semibold"
                    >
                      Wis alle filters
                    </button>
                  )}
                </div>
              )}

              {filtered.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-5">
                    {visible.map((r) => <TCGCard key={r.id} card={r} />)}
                  </div>
                  {filtered.length > shownCount && (
                    <div className="flex justify-center pt-6">
                      <button
                        onClick={() => setShownCount(shownCount + PAGE_SIZE)}
                        className="btn-physical font-display text-[15px] px-6 py-3 rounded-full"
                        style={{ background: "#FFCB05", color: "#0B2A4A", letterSpacing: ".5px", boxShadow: "0 3px 0 #F2B705" }}
                      >
                        Laad meer ({Math.min(PAGE_SIZE, filtered.length - shownCount)})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-ink3">Niks past bij je filters. Te streng misschien?</div>
              )}
            </div>
          )}

          {!loading && q.trim().length >= 2 && results.length === 0 && !err && (
            <ExternalSearchPanel query={q} reason="zero" />
          )}
        </div>
      </section>

      {/* STEPS */}
      <section className="px-4 md:px-7 pt-[30px] pb-16">
        <div className="max-w-page mx-auto">
          <div className="text-center font-bold text-[13px] uppercase text-accent mb-2.5" style={{ letterSpacing: ".14em" }}>
            Zo hossel je 't
          </div>
          <h2 className="text-center font-display font-normal m-0 mb-11 text-ink" style={{ fontSize: "clamp(30px, 4vw, 44px)" }}>
            Van zolderdoos naar kassa — in 3 stappen
          </h2>
          <div className="grid gap-[22px] md:grid-cols-3 grid-cols-1">
            <Step n="1" title="Zoek" body="Type een kaartnaam — desnoods half goed gespeld. Wij vissen 'm direct uit duizenden kaarten." color="#EE1515" />
            <Step n="2" title="Check" body="Live prijs, PSA-schattingen, prognose voor 3, 5 en 10 jaar. Voeg toe aan je watchlist of wallet." color="#2A75BB" />
            <Step n="3" title="Beslis" body="Brutaal eerlijk advies van AI. Kopen, vasthouden of dumpen — wij sparen je gevoel niet." color="#3FA34D" />
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="px-4 md:px-7 py-16">
        <div className="max-w-page mx-auto">
          <div className="text-center font-bold text-[13px] uppercase text-accent mb-2.5" style={{ letterSpacing: ".14em" }}>
            Plus dit allemaal
          </div>
          <h2 className="text-center font-display font-normal m-0 mb-4 text-ink" style={{ fontSize: "clamp(30px, 4vw, 44px)" }}>
            Alles wat je nodig hebt
          </h2>
          <p className="text-center text-ink2 text-[16px] max-w-prose mx-auto mb-11" style={{ lineHeight: 1.5 }}>
            Geen 5 tools meer naast elkaar. Eén plek om je collectie te checken, te volgen en te managen.
          </p>
          <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3 grid-cols-1">
            <FeatureCard
              icon="🔍" accent="#EE1515"
              title="Slim zoeken"
              body="Type 'charizard 151' en je krijgt direct de SIR uit set 151. Filters op set, rariteit en prijsklasse. Werkt ook met typo's."
            />
            <FeatureCard
              icon="💶" accent="#2A75BB"
              title="Live prijzen"
              body="Actuele cijfers van TCGPlayer én Cardmarket, naast elkaar. Met verse-datum-stempel zodat je weet of het up-to-date is."
            />
            <FeatureCard
              icon="🏷" accent="#FFCB05"
              title="PSA-schattingen"
              body="Per kaart een schatting voor PSA 8, 9 en 10. Gebaseerd op publieke verkopen, ±40% nauwkeurigheid. Plus link naar échte data."
            />
            <FeatureCard
              icon="🤖" accent="#7C5CD6"
              title="AI-advies"
              body="Claude geeft je per kaart: koop/houden/verkopen-verdict, prognose voor 3, 5 en 10 jaar, koop- en verkoopprijs, plus 2-4 redenen voor en tegen."
            />
            <FeatureCard
              icon="👁" accent="#3FA34D"
              title="Watchlist"
              body="Volg kaarten die je interessant vindt. Bij elk bezoek zie je hoeveel ze sinds toevoegen zijn gestegen of gedaald."
            />
            <FeatureCard
              icon="💎" accent="#EE1515"
              title="Mijn wallet"
              body="Sla op wat je hebt. Per kaart: PSA-grade of losse staat, aankoopdatum en -prijs. Zie real-time je winst of verlies op je hele verzameling."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />
    </>
  );
}

function CTASection() {
  return (
    <section className="px-4 md:px-7 pb-24">
      <div className="max-w-page mx-auto">
        <div
          className="rounded-lg p-8 md:p-12 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #EE1515 0%, #B30E0E 100%)",
          }}
        >
          <div className="absolute -right-20 -top-20 w-[280px] h-[280px] rounded-full opacity-[.18]" style={{ background: "#FFCB05" }} />
          <div className="absolute -left-16 -bottom-16 w-[200px] h-[200px] rounded-full opacity-[.10]" style={{ background: "#FFCB05" }} />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase text-white/80 mb-3" style={{ letterSpacing: ".14em" }}>
              Gratis voor altijd
            </div>
            <h2 className="font-display text-white m-0 mb-3" style={{ fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 400, lineHeight: 1 }}>
              Klaar om te hosselen?
            </h2>
            <p className="text-white/90 text-[17px] max-w-prose mx-auto mb-6" style={{ lineHeight: 1.5 }}>
              Maak een gratis account, sla je wallet op en sync over al je apparaten. Geen creditcard, geen gezeik.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href="/signup"
                className="btn-physical font-display text-[16px] px-6 py-3 rounded-full inline-flex items-center justify-center"
                style={{
                  background: "#FFCB05", color: "#0B2A4A",
                  letterSpacing: ".5px", boxShadow: "0 3px 0 #F2B705",
                  lineHeight: 1, paddingTop: 14, paddingBottom: 10,
                }}
              >
                Account maken
              </a>
              <a
                href="#top"
                className="text-white font-semibold text-[14px] hover:text-white/80 transition px-4 py-3"
              >
                Eerst rondkijken →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, accent, title, body }: { icon: string; accent: string; title: string; body: string }) {
  return (
    <div
      className="bg-card border rounded-lg p-6 shadow-sm relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      style={{ borderColor: "#DCE7F4" }}
    >
      <div
        className="absolute -right-10 -top-10 w-[120px] h-[120px] rounded-full opacity-[.06]"
        style={{ background: accent }}
      />
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] mb-4"
          style={{ background: `${accent}20`, border: `2px solid ${accent}` }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <h3 className="font-display font-normal text-[22px] m-0 mb-2 text-ink">{title}</h3>
        <p className="m-0 text-ink2 text-[14px]" style={{ lineHeight: 1.55 }}>{body}</p>
      </div>
    </div>
  );
}

// ---------- COMPONENTS ----------

function TCGCard({ card }: { card: Result }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) - 0.5;
    const py = ((e.clientY - r.top) / r.height) - 0.5;
    el.style.transform = `perspective(800px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <a
      ref={ref}
      href={`/card/${encodeURIComponent(card.id)}`}
      className="group bg-card border rounded-md overflow-hidden shadow-sm text-left transition-all hover:shadow-lg"
      style={{ borderColor: "#DCE7F4", transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="relative bg-bg2 overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
        <img src={card.image} alt={card.name} loading="lazy" className="w-full h-full object-contain p-3" />
        <div className="tcg-art-sheen" />
        <span
          className="absolute top-2.5 left-2.5 z-[2] text-[11px] font-bold uppercase text-white rounded-full px-[9px] py-1"
          style={{ background: "rgba(11,42,74,.55)", backdropFilter: "blur(4px)", letterSpacing: ".05em" }}
        >
          {card.setName}
        </span>
      </div>
      <div className="p-[14px] pt-[14px] pb-4 px-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[24px] text-ink font-normal tabular-nums">
            {card.priceEUR ? `€${card.priceEUR.toFixed(2)}` : "—"}
          </span>
          <span className="text-[10px] text-ink3 uppercase font-bold" style={{ letterSpacing: ".05em" }}>
            #{card.number}
          </span>
        </div>
        <div className="mt-2 text-[13px] text-ink2 font-semibold truncate" title={card.name}>
          {card.name}
        </div>
        {card.rarity && (
          <div className="mt-1 text-[11px] text-ink3 uppercase font-bold truncate" style={{ letterSpacing: ".04em" }}>
            {card.rarity}
          </div>
        )}
      </div>
    </a>
  );
}

function Step({ n, title, body, color }: { n: string; title: string; body: string; color: string }) {
  return (
    <div
      className="bg-card border rounded-lg p-[30px] px-7 shadow-sm relative overflow-hidden transition-all duration-200 hover:-translate-y-1.5 hover:shadow-lg"
      style={{ borderColor: "#DCE7F4" }}
    >
      <div
        className="absolute -right-10 -top-10 w-[140px] h-[140px] rounded-full opacity-[.06]"
        style={{ background: color }}
      />
      <div className="step-badge w-[54px] h-[54px] rounded-full flex items-center justify-center mb-5" style={{ background: color }}>
        <span className="font-display text-[26px] text-white">{n}</span>
      </div>
      <h3 className="font-display font-normal text-[24px] m-0 mb-2.5 text-ink">{title}</h3>
      <p className="m-0 text-ink2 text-[16px]" style={{ lineHeight: 1.55 }}>{body}</p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase text-ink3 mb-2" style={{ letterSpacing: ".05em" }}>{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, label, hint }: { active: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition flex items-center gap-1.5 ${
        active ? "bg-accent text-white" : "bg-bg2 text-ink2 hover:bg-accentSoft hover:text-accent"
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
    { label: "PriceCharting", url: `https://www.pricecharting.com/search-products?q=${pokemonQ}&type=prices`, desc: "Volledige database incl. Japanse promo's en sealed product" },
    { label: "TCGdex", url: `https://tcgdex.net/series?q=${q}`, desc: "Internationale TCG-database, betere Japanse coverage" },
    { label: "eBay sold", url: `https://www.ebay.com/sch/i.html?_nkw=${pokemonQ}&LH_Sold=1&LH_Complete=1`, desc: "Actuele verkooptransacties laatste 90 dagen" },
  ];
  return (
    <div className="bg-card rounded-md border p-6 mt-8 max-w-[1000px] mx-auto text-left" style={{ borderColor: "#DCE7F4" }}>
      <div className="text-[11px] font-bold uppercase text-accent mb-2" style={{ letterSpacing: ".14em" }}>
        {reason === "zero" ? "Helemaal niks?" : "Toch niet gevonden?"}
      </div>
      <div className="font-display text-[22px] text-ink mb-2">
        Geen kaart in onze database met "{query}". Bummer.
      </div>
      <p className="text-[14px] text-ink2 mb-4 max-w-2xl" style={{ lineHeight: 1.55 }}>
        We trekken alleen Engelse kaarten uit pokemontcg.io. Japanse promo's en sealed product zit er niet bij.
        Probeer 'm hier — die hebben de buitenkansjes:
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener"
             className="group block p-4 rounded-md bg-bg2 hover:bg-accentSoft transition">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-ink text-[14px] group-hover:text-accent transition">{l.label}</span>
              <svg className="text-ink3 group-hover:text-accent transition" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
              </svg>
            </div>
            <div className="text-[11px] text-ink3" style={{ lineHeight: 1.4 }}>{l.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
