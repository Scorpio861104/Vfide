export default function SecurityCenterLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 bg-zinc-800/50 rounded w-1/3 animate-pulse"></div>
        <div className="h-20 bg-zinc-800/30 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/40 animate-pulse"></div>
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/40 animate-pulse"></div>
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/40 animate-pulse"></div>
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/40 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
