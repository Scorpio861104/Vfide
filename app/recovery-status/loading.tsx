export default function RecoveryStatusLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, #10b981 0%, transparent 70%)" }}
        />
      </div>
      {/* Header */}
      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="mb-8">
          <div className="h-3 w-20 rounded-full bg-accent/10 border border-accent/20 animate-pulse mb-3" />
          <div className="h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-80 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
