export default function EscrowLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <div className="mb-8">
          <div className="h-3 w-20 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-48 rounded-xl bg-white/8 animate-pulse mb-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
              <div className="h-4 w-32 rounded bg-white/8 animate-pulse mb-3" />
              <div className="h-8 w-24 rounded-lg bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-white/8 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 rounded bg-white/8 animate-pulse mb-2" />
                <div className="h-3 w-32 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-7 w-20 rounded-full bg-white/6 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
