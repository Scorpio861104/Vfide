export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-7xl py-10">
        <div className="mb-8">
          <div className="h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-4" />
          {/* Search + filter bar */}
          <div className="flex gap-3 mb-6">
            <div className="h-11 flex-1 rounded-xl bg-white/6 border border-white/8 animate-pulse" />
            <div className="h-11 w-32 rounded-xl bg-white/6 border border-white/8 animate-pulse" />
          </div>
          {/* Category chips */}
          <div className="flex gap-2 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-white/6 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] overflow-hidden">
              <div className="aspect-square bg-white/6 animate-pulse" />
              <div className="p-4">
                <div className="h-4 w-3/4 rounded bg-white/8 animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 rounded bg-accent/15 animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-white/6 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
