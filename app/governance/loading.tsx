export default function GovernanceLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
      <div className="container mx-auto px-4 max-w-5xl py-10">
        <div className="mb-8">
          <div className="h-3 w-24 rounded-full bg-white/5 animate-pulse mb-3" />
          <div className="h-9 w-64 rounded-xl bg-white/8 animate-pulse mb-2" />
          <div className="h-4 w-72 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Proposal list */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="h-5 w-64 rounded bg-white/8 animate-pulse mb-2" />
                  <div className="h-3 w-48 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="h-6 w-20 rounded-full bg-white/8 animate-pulse shrink-0" />
              </div>
              {/* Vote bar */}
              <div className="h-2 w-full rounded-full bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
