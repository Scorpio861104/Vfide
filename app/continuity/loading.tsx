export default function ContinuityLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-6xl py-10">
        <div className="mb-8">
          <div className="h-3 w-28 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-56 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-white/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 space-y-3">
              <div className="h-5 w-32 rounded bg-white/8 animate-pulse" />
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-white/5 animate-pulse" />
              <div className="h-8 w-28 rounded-xl bg-white/6 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
          <div className="h-4 w-40 rounded bg-white/8 animate-pulse mb-4" />
          <div className="h-3 w-full rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
