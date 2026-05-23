/**
 * Loading skeleton for /streaming.
 *
 * The /streaming page is currently a ComingSoonPage — money streaming
 * (Superfluid/Sablier-style continuous payments) is designed but not yet
 * shipped. This skeleton intentionally matches the shape of ComingSoonPage
 * (notice block + header + description) so users do not see a flash of
 * fake "dashboard" UI before the placeholder renders.
 * See app/streaming/page.tsx.
 */
export default function StreamingLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
        />
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-12 relative">
        <div className="h-4 w-32 rounded bg-white/8 animate-pulse mb-6" />

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500/30 animate-pulse mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 rounded bg-amber-500/30 animate-pulse" />
              <div className="h-3 w-full rounded bg-amber-500/15 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-amber-500/15 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="h-9 w-72 rounded-xl bg-white/10 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-white/6 animate-pulse" />
        </div>

        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 mb-6 space-y-3">
          <div className="h-4 w-full rounded bg-white/6 animate-pulse" />
          <div className="h-4 w-full rounded bg-white/6 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-white/6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
