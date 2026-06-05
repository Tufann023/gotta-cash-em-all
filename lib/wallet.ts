"use client";
import { useEffect, useState, useCallback } from "react";

const KEY = "gotta-cash-wallet-v1";

export const CONDITIONS = [
  { key: "raw_nm",   label: "Losse kaart — perfect",          rawMultiplier: 1.0  },
  { key: "raw_lp",   label: "Losse kaart — lichte gebruikssporen", rawMultiplier: 0.7 },
  { key: "raw_played", label: "Losse kaart — bespeeld",        rawMultiplier: 0.4 },
  { key: "psa_10",   label: "PSA 10 (perfect, beoordeeld)",    rawMultiplier: null /* use slab */ },
  { key: "psa_9",    label: "PSA 9 (bijna perfect)",           rawMultiplier: null },
  { key: "psa_8",    label: "PSA 8 (zeer goed)",               rawMultiplier: null },
  { key: "bgs_10",   label: "BGS 10 (pristine)",               rawMultiplier: null },
  { key: "bgs_95",   label: "BGS 9.5 (gem mint)",              rawMultiplier: null },
  { key: "cgc_10",   label: "CGC 10",                          rawMultiplier: null },
  { key: "sealed",   label: "Sealed (verzegeld)",              rawMultiplier: 1.3 },
  { key: "other",    label: "Anders",                          rawMultiplier: 1.0 },
] as const;

export type ConditionKey = typeof CONDITIONS[number]["key"];

export type Holding = {
  id: string; // unique uuid
  cardId: string; // pokemontcg.io id
  cardName: string;
  cardSet: string;
  cardImage: string;
  condition: ConditionKey;
  purchaseDate: string; // ISO yyyy-mm-dd
  purchasePriceEUR: number; // per stuk
  quantity: number;
  notes?: string;
  addedAt: number;
};

function read(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Holding[]) : [];
  } catch {
    return [];
  }
}

function write(items: Holding[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wallet:changed"));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useWallet() {
  const [items, setItems] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    const onChange = () => setItems(read());
    window.addEventListener("wallet:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("wallet:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((it: Omit<Holding, "id" | "addedAt">) => {
    const next = read();
    next.unshift({ ...it, id: uid(), addedAt: Date.now() });
    write(next);
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Holding, "id" | "addedAt">>) => {
    const next = read().map((x) => (x.id === id ? { ...x, ...patch } : x));
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  return { items, add, update, remove, hydrated };
}

// Calculate current value of a holding given a "raw" base price and slabs
export function calcCurrentValue(
  condition: ConditionKey,
  rawEUR: number | null,
  slabs: { grade: string; mid: number }[],
): number | null {
  if (rawEUR === null) return null;
  const c = CONDITIONS.find((x) => x.key === condition);
  if (!c) return null;

  // PSA / BGS / CGC grades use slab estimates
  const slabMap: Record<string, string> = {
    psa_10: "PSA 10",
    psa_9: "PSA 9",
    psa_8: "PSA 8",
    bgs_10: "PSA 10", // benadering
    bgs_95: "PSA 10",
    cgc_10: "PSA 10",
  };
  if (slabMap[condition]) {
    const wanted = slabMap[condition];
    const slab = slabs.find((s) => s.grade === wanted);
    if (slab) {
      // BGS 10 = 1.4x PSA 10, BGS 9.5 = ~ PSA 10
      if (condition === "bgs_10") return slab.mid * 1.4;
      return slab.mid;
    }
  }

  // Raw / sealed / other = multiplier * raw
  if (c.rawMultiplier !== null) {
    return rawEUR * c.rawMultiplier;
  }
  return rawEUR;
}

export function conditionLabel(key: ConditionKey): string {
  return CONDITIONS.find((c) => c.key === key)?.label ?? key;
}
