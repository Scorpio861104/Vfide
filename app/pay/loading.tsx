export default function PayLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-start justify-center">
      <div className="w-full max-w-xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-6">
          <div className="h-3 w-16 rounded-full bg-white/5 animate-pulse mb-4" />
          <div className="h-8 w-48 rounded-xl bg-white/8 animate-pulse mb-6" />
          {/* Amount input */}
          <div className="h-16 w-full rounded-xl bg-white/6 border border-white/8 animate-pulse mb-4" />
          {/* Token selector */}
          <div className="h-12 w-full rounded-xl bg-white/6 border border-white/8 animate-pulse mb-4" />
          {/* Recipient */}
          <div className="h-12 w-full rounded-xl bg-white/6 border border-white/8 animate-pulse mb-6" />
          {/* Fee breakdown */}
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between mb-2">
                <div className="h-3 w-20 rounded bg-white/6 animate-pulse" />
                <div className="h-3 w-16 rounded bg-white/8 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-12 w-full rounded-xl bg-accent/20 border border-accent/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
