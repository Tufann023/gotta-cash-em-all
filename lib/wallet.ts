"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "./supabase/client";
import { useAuth } from "./supabase/AuthProvider";

const KEY = "gotta-cash-wallet-v1";
const MIGRATED_KEY = "gotta-cash-wallet-migrated";

export const CONDITIONS = [
  { key: "raw_nm",   label: "Losse kaart — perfect",          rawMultiplier: 1.0  },
  { key: "raw_lp",   label: "Losse kaart — lichte gebruikssporen", rawMultiplier: 0.7 },
  { key: "raw_played", label: "Losse kaart — bespeeld",        rawMultiplier: 0.4 },
  { key: "psa_10",   label: "PSA 10 (perfect, beoordeeld)",    rawMultiplier: null },
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
  id: string;
  cardId: string;
  cardName: string;
  cardSet: string;
  cardImage: string;
  condition: ConditionKey;
  purchaseDate: string;
  purchasePriceEUR: number;
  quantity: number;
  notes?: string;
  addedAt: number;
};

// ---------- localStorage helpers ----------
function readLocal(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Holding[]) : [];
  } catch { return []; }
}

function writeLocal(items: Holding[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("wallet:changed"));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Hook ----------
export function useWallet() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const migrationDone = useRef(false);

  const reload = useCallback(async () => {
    if (user) {
      const supabase = createClient();
      const { data } = await supabase
        .from("wallet_holdings")
        .select("*")
        .order("created_at", { ascending: false });
      const mapped: Holding[] = (data ?? []).map((row: any) => ({
        id: row.id,
        cardId: row.card_id,
        cardName: row.card_name,
        cardSet: row.set_name,
        cardImage: row.card_image,
        condition: row.condition as ConditionKey,
        purchaseDate: row.purchase_date,
        purchasePriceEUR: Number(row.purchase_price_eur),
        quantity: row.quantity,
        notes: row.notes ?? undefined,
        addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      }));
      setItems(mapped);
    } else {
      setItems(readLocal());
    }
    setHydrated(true);
  }, [user]);

  const migrate = useCallback(async () => {
    if (!user) return;
    if (migrationDone.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    const local = readLocal();
    if (local.length === 0) {
      localStorage.setItem(MIGRATED_KEY, "1");
      migrationDone.current = true;
      return;
    }

    const supabase = createClient();
    const rows = local.map((it) => ({
      user_id: user.id,
      card_id: it.cardId,
      card_name: it.cardName,
      set_name: it.cardSet,
      card_image: it.cardImage,
      condition: it.condition,
      purchase_date: it.purchaseDate,
      purchase_price_eur: it.purchasePriceEUR,
      quantity: it.quantity,
      notes: it.notes ?? null,
    }));
    await supabase.from("wallet_holdings").insert(rows);

    localStorage.setItem(MIGRATED_KEY, "1");
    migrationDone.current = true;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (user) await migrate();
      await reload();
    })();
  }, [authLoading, user, migrate, reload]);

  useEffect(() => {
    if (user) return;
    const onChange = () => setItems(readLocal());
    window.addEventListener("wallet:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("wallet:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user]);

  const add = useCallback(async (it: Omit<Holding, "id" | "addedAt">) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("wallet_holdings").insert({
        user_id: user.id,
        card_id: it.cardId,
        card_name: it.cardName,
        set_name: it.cardSet,
        card_image: it.cardImage,
        condition: it.condition,
        purchase_date: it.purchaseDate,
        purchase_price_eur: it.purchasePriceEUR,
        quantity: it.quantity,
        notes: it.notes ?? null,
      });
      await reload();
    } else {
      const next = readLocal();
      next.unshift({ ...it, id: uid(), addedAt: Date.now() });
      writeLocal(next);
    }
  }, [user, reload]);

  const update = useCallback(async (id: string, patch: Partial<Omit<Holding, "id" | "addedAt">>) => {
    if (user) {
      const supabase = createClient();
      const dbPatch: any = {};
      if (patch.condition) dbPatch.condition = patch.condition;
      if (patch.purchaseDate) dbPatch.purchase_date = patch.purchaseDate;
      if (patch.purchasePriceEUR !== undefined) dbPatch.purchase_price_eur = patch.purchasePriceEUR;
      if (patch.quantity !== undefined) dbPatch.quantity = patch.quantity;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      await supabase.from("wallet_holdings").update(dbPatch).eq("id", id).eq("user_id", user.id);
      await reload();
    } else {
      const next = readLocal().map((x) => (x.id === id ? { ...x, ...patch } : x));
      writeLocal(next);
    }
  }, [user, reload]);

  const remove = useCallback(async (id: string) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("wallet_holdings").delete().eq("id", id).eq("user_id", user.id);
      await reload();
    } else {
      writeLocal(readLocal().filter((x) => x.id !== id));
    }
  }, [user, reload]);

  return { items, add, update, remove, hydrated };
}

// ---------- Pricing helpers (ongewijzigd) ----------
export function calcCurrentValue(
  condition: ConditionKey,
  rawEUR: number | null,
  slabs: { grade: string; mid: number }[],
): number | null {
  if (rawEUR === null) return null;
  const c = CONDITIONS.find((x) => x.key === condition);
  if (!c) return null;

  const slabMap: Record<string, string> = {
    psa_10: "PSA 10",
    psa_9: "PSA 9",
    psa_8: "PSA 8",
    bgs_10: "PSA 10",
    bgs_95: "PSA 10",
    cgc_10: "PSA 10",
  };
  if (slabMap[condition]) {
    const wanted = slabMap[condition];
    const slab = slabs.find((s) => s.grade === wanted);
    if (slab) {
      if (condition === "bgs_10") return slab.mid * 1.4;
      return slab.mid;
    }
  }
  if (c.rawMultiplier !== null) return rawEUR * c.rawMultiplier;
  return rawEUR;
}

export function conditionLabel(key: ConditionKey): string {
  return CONDITIONS.find((c) => c.key === key)?.label ?? key;
}
