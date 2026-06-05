"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "./supabase/client";
import { useAuth } from "./supabase/AuthProvider";

const KEY = "gotta-cash-watchlist-v1";
const MIGRATED_KEY = "gotta-cash-watchlist-migrated";

export type WatchlistItem = {
  id: string;
  name: string;
  setName: string;
  image: string;
  addedAt: number;
  notedPriceEUR: number | null;
};

// ---------- localStorage helpers ----------
function readLocal(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch { return []; }
}

function writeLocal(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("watchlist:changed"));
}

// ---------- Hook ----------
export function useWatchlist() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const migrationDone = useRef(false);

  // Reload helper
  const reload = useCallback(async () => {
    if (user) {
      // From Supabase
      const supabase = createClient();
      const { data } = await supabase
        .from("watchlist_items")
        .select("*")
        .order("created_at", { ascending: false });
      const mapped: WatchlistItem[] = (data ?? []).map((row: any) => ({
        id: row.card_id,
        name: row.card_name,
        setName: row.set_name,
        image: row.card_image,
        addedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        notedPriceEUR: row.noted_price_eur,
      }));
      setItems(mapped);
    } else {
      setItems(readLocal());
    }
    setHydrated(true);
  }, [user]);

  // Migrate localStorage → Supabase op eerste login
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
      card_id: it.id,
      card_name: it.name,
      set_name: it.setName,
      card_image: it.image,
      noted_price_eur: it.notedPriceEUR,
    }));
    await supabase
      .from("watchlist_items")
      .upsert(rows, { onConflict: "user_id,card_id", ignoreDuplicates: true });

    localStorage.setItem(MIGRATED_KEY, "1");
    migrationDone.current = true;
  }, [user]);

  // Effect: initial + reload op auth change
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      if (user) await migrate();
      await reload();
    })();
  }, [authLoading, user, migrate, reload]);

  // Effect: localStorage cross-tab updates voor anonieme users
  useEffect(() => {
    if (user) return;
    const onChange = () => setItems(readLocal());
    window.addEventListener("watchlist:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("watchlist:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [user]);

  const add = useCallback(async (it: Omit<WatchlistItem, "addedAt">) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("watchlist_items").upsert({
        user_id: user.id,
        card_id: it.id,
        card_name: it.name,
        set_name: it.setName,
        card_image: it.image,
        noted_price_eur: it.notedPriceEUR,
      }, { onConflict: "user_id,card_id" });
      await reload();
    } else {
      const next = readLocal();
      if (next.find((x) => x.id === it.id)) return;
      next.unshift({ ...it, addedAt: Date.now() });
      writeLocal(next);
    }
  }, [user, reload]);

  const remove = useCallback(async (id: string) => {
    if (user) {
      const supabase = createClient();
      await supabase.from("watchlist_items").delete().eq("user_id", user.id).eq("card_id", id);
      await reload();
    } else {
      writeLocal(readLocal().filter((x) => x.id !== id));
    }
  }, [user, reload]);

  const has = useCallback((id: string) => items.some((x) => x.id === id), [items]);

  return { items, add, remove, has, hydrated };
}
