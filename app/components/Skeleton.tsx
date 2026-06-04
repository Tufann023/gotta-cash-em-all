// Skeleton loaders Apple-stijl — subtiele shimmer

export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-2xl overflow-hidden border hairline">
      <div className="aspect-[2.5/3.5] bg-elevated animate-pulse" />
      <div className="p-3.5 space-y-2">
        <div className="h-3.5 w-3/4 bg-elevated rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-elevated rounded animate-pulse" />
        <div className="flex justify-between items-baseline pt-1">
          <div className="h-2 w-1/3 bg-elevated rounded animate-pulse" />
          <div className="h-3 w-12 bg-elevated rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function ResultGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export function SearchingBar() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span className="pokeball-spinner" role="status" aria-label="Zoeken" />
      <span>Zoeken in pokemontcg.io database…</span>
    </div>
  );
}
