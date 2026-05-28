export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
      </div>
      <div className="relative border-b border-white/5 bg-zinc-950/80">
        <div className="container mx-auto px-4 max-w-6xl py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="h-5 w-24 rounded-full bg-cyan-500/10 border border-accent/20 animate-pulse mb-3" />
              <div className="h-10 w-64 rounded-xl bg-white/8 animate-pulse mb-2" />
              <div className="h-4 w-36 rounded-lg bg-white/5 animate-pulse" />
            </div>
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 w-28 rounded-xl bg-white/6 border border-white/8 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-6xl py-8">
        {/* ProofScore + stats row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-8">
          <div className="lg:col-span-1 rounded-2xl border border-white/6 bg-white/[0.02] p-6 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-white/6 animate-pulse" />
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
              <div className="h-3 w-20 rounded bg-white/8 animate-pulse mb-3" />
              <div className="h-8 w-28 rounded-lg bg-white/10 animate-pulse mb-1" />
              <div className="h-2.5 w-16 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-lg bg-white/6 border border-white/8 animate-pulse" />
          ))}
        </div>
        {/* Content card */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 h-72 animate-pulse" />
      </div>
    </div>
  );
}
