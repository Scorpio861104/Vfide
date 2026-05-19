export default function PayrollLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-10 relative">
        {/* Page header skeleton */}
        <div className="mb-8">
          <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-72 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-48 rounded-lg bg-white/5 animate-pulse" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i}
              className="rounded-2xl border border-white/6 bg-white/[0.03] p-5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-3 w-16 rounded bg-white/8 animate-pulse mb-3" />
              <div className="h-7 w-24 rounded-lg bg-white/10 animate-pulse mb-1" />
              <div className="h-2.5 w-12 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 mb-6">
          {/* Tab bar skeleton */}
          <div className="flex gap-3 mb-6 border-b border-white/5 pb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-lg bg-white/8 animate-pulse" />
            ))}
          </div>
          {/* Content rows */}
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-full bg-white/8 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-white/8 animate-pulse" style={{ width: `${60 + i * 5}%` }} />
                  <div className="h-3 rounded bg-white/5 animate-pulse" style={{ width: `${40 + i * 4}%` }} />
                </div>
                <div className="h-8 w-20 rounded-lg bg-white/6 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
