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
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-5">
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

export function CardDetailSkeleton() {
  return (
    <div className="fade-in space-y-10 max-w-page mx-auto px-7 py-10" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="pokeball-spinner" />
        <span className="text-[13px] text-ink3 font-semibold">Kaartgegevens ophalen…</span>
      </div>

      {/* Hero skeleton */}
      <div className="grid md:grid-cols-[300px_1fr] gap-10">
        <div className="rounded-md bg-bg2 animate-pulse" style={{ aspectRatio: "3 / 4" }} />
        <div className="space-y-4">
          <div className="h-3 w-44 bg-bg2 rounded animate-pulse" />
          <div className="h-10 w-3/4 bg-bg2 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-bg2 rounded animate-pulse" />
          <div className="flex items-baseline gap-3 pt-2">
            <div className="h-12 w-32 bg-bg2 rounded animate-pulse" />
            <div className="h-3 w-40 bg-bg2 rounded animate-pulse" />
          </div>
          <div className="flex gap-3 pt-3">
            <div className="h-9 w-28 bg-bg2 rounded-full animate-pulse" />
            <div className="h-9 w-32 bg-bg2 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* AI analyse hero skeleton */}
      <div className="bg-card rounded-md border p-7" style={{ borderColor: "#DCE7F4" }}>
        <div className="h-3 w-32 bg-bg2 rounded animate-pulse mb-4" />
        <div className="h-8 w-2/3 bg-bg2 rounded animate-pulse mb-3" />
        <div className="h-4 w-full bg-bg2 rounded animate-pulse mb-2" />
        <div className="h-4 w-5/6 bg-bg2 rounded animate-pulse mb-5" />
        <div className="h-11 w-44 bg-bg2 rounded-full animate-pulse" />
      </div>

      {/* PSA + chart skeleton */}
      <div className="grid md:grid-cols-2 gap-5">
        <SkeletonPanel />
        <SkeletonPanel />
      </div>

      {/* Signals skeleton */}
      <SkeletonPanel />
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="bg-card rounded-md border p-5 space-y-3" style={{ borderColor: "#DCE7F4" }}>
      <div className="h-3 w-24 bg-bg2 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-bg2 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-bg2 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-bg2 rounded animate-pulse" />
    </div>
  );
}
