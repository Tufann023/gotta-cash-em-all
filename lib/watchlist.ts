"use client";
import { useEffect, useState, useCallback } from "react";

const KEY = "gotta-cash-watchlist-v1";

export type WatchlistItem = {
  id: string;
  name: string;
  setName: string;
  image: string;
  addedAt: number;
  notedPriceEUR: number | null;
};

function read(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WatchlistItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("watchlist:changed"));
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(read());
    setHydrated(true);
    const onChange = () => setItems(read());
    window.addEventListener("watchlist:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("watchlist:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const add = useCallback((it: Omit<WatchlistItem, "addedAt">) => {
    const next = read();
    if (next.find((x) => x.id === it.id)) return;
    next.unshift({ ...it, addedAt: Date.now() });
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x.id !== id));
  }, []);

  const has = useCallback((id: string) => items.some((x) => x.id === id), [items]);

  return { items, add, remove, has, hydrated };
}
