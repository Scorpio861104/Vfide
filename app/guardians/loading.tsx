export default function GuardiansLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-5xl py-10">
        <div className="mb-8">
          <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-80 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Guardian cards */}
        <div className="space-y-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/8 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-white/8 animate-pulse" />
                <div className="h-3 w-28 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-8 w-24 rounded-xl bg-white/6 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
        {/* Threshold indicator */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
          <div className="h-4 w-32 rounded bg-white/8 animate-pulse mb-3" />
          <div className="h-3 w-full rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
