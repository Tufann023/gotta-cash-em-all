"use client";
import { useState, useEffect, useRef } from "react";

type Result = {
  id: string; name: string; number: string; rarity?: string;
  setName: string; setReleaseDate: string; image: string;
  priceEUR: number | null;
};

export default function HomePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } catch (e: any) {
        setErr(e.message || "Onbekende fout");
      } finally { setLoading(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto pt-8">
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
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted text-[13px]">Zoeken…</div>
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

      {results.length > 0 && (
        <div className="fade-in">
          <div className="text-sm text-muted mb-4">{results.length} resultaten</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {results.map((r) => (
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
                    <span className="text-[10px] text-subtle uppercase tracking-wider">
                      {r.rarity ?? "—"}
                    </span>
                    <span className="text-[15px] font-semibold text-ink tabular-nums">
                      {r.priceEUR ? `€${r.priceEUR.toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && q.trim().length >= 2 && results.length === 0 && !err && (
        <div className="text-muted text-center">Geen resultaten voor "{q}".</div>
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
