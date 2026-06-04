// Skeleton loaders — match TCG-card grid

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-md overflow-hidden border shadow-sm" style={{ borderColor: "#DCE7F4" }}>
      <div className="bg-bg2 animate-pulse" style={{ aspectRatio: "3 / 4" }} />
      <div className="p-4 space-y-2">
        <div className="h-6 w-1/2 bg-bg2 rounded animate-pulse" />
        <div className="h-3.5 w-3/4 bg-bg2 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ResultGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function SearchingBar() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-ink3 font-semibold">
      <span className="pokeball-spinner" role="status" aria-label="Zoeken" />
      <span>Zoeken in pokemontcg.io database…</span>
    </div>
  );
}
