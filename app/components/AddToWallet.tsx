"use client";
import { useState, useEffect } from "react";
import { useWallet, CONDITIONS, ConditionKey } from "@/lib/wallet";

export default function AddToWallet({
  cardId, cardName, cardSet, cardImage, suggestedPriceEUR,
}: {
  cardId: string;
  cardName: string;
  cardSet: string;
  cardImage: string;
  suggestedPriceEUR: number | null;
}) {
  const { add, items, hydrated } = useWallet();
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<ConditionKey>("raw_nm");
  const [purchaseDate, setPurchaseDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");

  const ownedCount = hydrated ? items.filter((it) => it.cardId === cardId).reduce((s, i) => s + i.quantity, 0) : 0;

  // Sluit bij ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(purchasePrice.replace(",", "."));
    if (!isFinite(price) || price < 0) return;
    add({
      cardId, cardName, cardSet, cardImage,
      condition, purchaseDate,
      purchasePriceEUR: price,
      quantity: Math.max(1, quantity),
      notes: notes.trim() || undefined,
    });
    setOpen(false);
    setPurchasePrice("");
    setNotes("");
    setQuantity(1);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPurchasePrice(suggestedPriceEUR ? suggestedPriceEUR.toFixed(2) : "");
          setOpen(true);
        }}
        className="btn-physical inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px]"
        style={{
          background: "#3FA34D",
          color: "#fff",
          border: "2px solid #2c7a37",
          boxShadow: "0 3px 0 #2c7a37",
          fontWeight: 700,
        }}
      >
        💎 Voeg toe aan mijn wallet
        {ownedCount > 0 && (
          <span className="bg-white/25 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
            {ownedCount} in wallet
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="bg-card rounded-md border w-full max-w-lg shadow-lg overflow-hidden"
            style={{ borderColor: "#DCE7F4" }}
          >
            <div className="p-5 border-b" style={{ borderColor: "#DCE7F4" }}>
              <div className="flex items-start gap-3">
                <img src={cardImage} alt={cardName} className="w-12 h-16 object-contain rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase font-bold text-accent" style={{ letterSpacing: ".1em" }}>Toevoegen aan wallet</div>
                  <div className="font-display text-[20px] text-ink leading-tight truncate" style={{ fontWeight: 400 }}>{cardName}</div>
                  <div className="text-[12px] text-ink3 truncate">{cardSet}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-bg2 hover:bg-line text-ink2 flex items-center justify-center transition"
                  aria-label="Sluiten"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Condition */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>
                  In welke staat?
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ConditionKey)}
                  className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
                  style={{ borderColor: "#C3D5EC" }}
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <div className="text-[11px] text-ink3 mt-1">
                  PSA / BGS / CGC = officieel beoordeelde kaart in beschermende houder.
                </div>
              </div>

              {/* Purchase date + quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>
                    Wanneer gekocht?
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
                    style={{ borderColor: "#C3D5EC" }}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>
                    Aantal
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
                    style={{ borderColor: "#C3D5EC" }}
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>
                  Wat heb je per stuk betaald? (EUR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 font-semibold">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={suggestedPriceEUR ? suggestedPriceEUR.toFixed(2) : "0.00"}
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full bg-card border rounded pl-7 pr-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition tabular-nums"
                    style={{ borderColor: "#C3D5EC" }}
                    required
                  />
                </div>
                {suggestedPriceEUR && (
                  <button
                    type="button"
                    onClick={() => setPurchasePrice(suggestedPriceEUR.toFixed(2))}
                    className="text-[11px] text-accent hover:underline mt-1 font-semibold"
                  >
                    Gebruik huidige marktprijs (€{suggestedPriceEUR.toFixed(2)})
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-ink3 mb-1.5" style={{ letterSpacing: ".08em" }}>
                  Notitie (optioneel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="bv. 'verjaardagscadeau' of 'eBay aankoop'"
                  className="w-full bg-card border rounded px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition"
                  style={{ borderColor: "#C3D5EC" }}
                />
              </div>
            </div>

            <div className="p-5 bg-bg flex items-center justify-end gap-3" style={{ borderTop: "1px solid #DCE7F4" }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-ink2 hover:bg-bg2 transition"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn-physical px-5 py-2.5 rounded-full text-[13px]"
                style={{
                  background: "#3FA34D",
                  color: "#fff",
                  border: "2px solid #2c7a37",
                  boxShadow: "0 3px 0 #2c7a37",
                  fontWeight: 700,
                }}
              >
                Opslaan in wallet
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
