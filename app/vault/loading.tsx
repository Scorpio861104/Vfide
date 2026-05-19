export default function VaultLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)" }} />
      </div>
      <div className="container mx-auto px-4 max-w-5xl py-10 relative">
        <div className="mb-8 text-center">
          <div className="mx-auto h-3 w-20 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="mx-auto h-9 w-48 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="mx-auto h-4 w-64 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Vault card */}
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/5 p-8 mb-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/15 animate-pulse" />
            <div className="h-6 w-48 rounded-lg bg-white/8 animate-pulse" />
            <div className="h-4 w-36 rounded bg-white/5 animate-pulse" />
          </div>
        </div>
        {/* Action buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/6 border border-white/8 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
