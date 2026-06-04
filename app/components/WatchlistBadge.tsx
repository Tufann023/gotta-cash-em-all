"use client";
import { useWatchlist } from "@/lib/watchlist";

export default function WatchlistBadge() {
  const { items, hydrated } = useWatchlist();
  if (!hydrated || items.length === 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent text-white text-[10px] font-bold">
      {items.length}
    </span>
  );
}
