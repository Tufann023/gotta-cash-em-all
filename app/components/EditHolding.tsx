"use client";
import { useState, useEffect } from "react";
import { useWallet, CONDITIONS, ConditionKey, Holding } from "@/lib/wallet";

export default function EditHolding({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const { update } = useWallet();
  const [condition, setCondition] = useState<ConditionKey>(holding.condition);
  const [purchaseDate, setPurchaseDate] = useState<string>(holding.purchaseDate);
  const [purchasePrice, setPurchasePrice] = useState<string>(holding.purchasePriceEUR.toFixed(2));
  const [quantity, setQuantity] = useState<number>(holding.quantity);
  const [notes, setNotes] = useState<string>(holding.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(purchasePrice.replace(",", "."));
    if (!isFinite(price) || price < 0) return;
    setSaving(true);
    await update(holding.id, {
      condition,
      purchaseDate,
      purchasePriceEUR: price,
      quantity: Math.max(1, quantity),
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-card rounded-md border w-full max-w-lg shadow-lg overflow-hidden"
        style={{ borderColor: "#DCE7F4" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "#DCE7F4" }}>
          <div className="flex items-start gap-3">
            <img src={holding.cardImage} alt={holding.cardName} className="w-12 h-16 object-contain rounded" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase font-bold text-accent" style={{ letterSpacing: ".1em" }}>Aanpassen</div>
              <div className="font-display text-[20px] text-ink leading-tight truncate" style={{ fontWeight: 400 }}>{holding.cardName}</div>
              <div className="text-[12px] text-ink3 truncate">{holding.cardSet}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
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
              Aankoopprijs per stuk (EUR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 font-semibold">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full bg-card border rounded pl-7 pr-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent transition tabular-nums"
                style={{ borderColor: "#C3D5EC" }}
                required
              />
            </div>
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
            onClick={onClose}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-ink2 hover:bg-bg2 transition"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-physical px-5 py-2.5 rounded-full text-[13px] disabled:opacity-50"
            style={{
              background: "#2A75BB",
              color: "#fff",
              border: "2px solid #1B528C",
              boxShadow: "0 3px 0 #1B528C",
              fontWeight: 700,
            }}
          >
            {saving ? "Opslaan…" : "Wijzigingen opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
