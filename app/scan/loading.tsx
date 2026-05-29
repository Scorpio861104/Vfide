export default function ScanLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(ellipse, #06b6d4 0%, transparent 70%)" }}
        />
      </div>
      <div className="container mx-auto px-4 max-w-6xl py-10">
        {/* Content */}
        <div className="grid grid-cols-1 gap-5">
          {[...Array(1)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-6 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
