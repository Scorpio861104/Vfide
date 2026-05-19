export default function MerchantLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="mb-8">
          <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-72 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Merchant dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/8 animate-pulse" />
                <div className="h-4 w-24 rounded bg-white/8 animate-pulse" />
              </div>
              <div className="h-8 w-32 rounded-lg bg-white/10 animate-pulse mb-2" />
              <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden">
              <div className="h-40 bg-white/6 animate-pulse" />
              <div className="p-3">
                <div className="h-4 w-3/4 rounded bg-white/8 animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
