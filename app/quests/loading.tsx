export default function QuestsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 bg-zinc-800/50 rounded w-1/2 animate-pulse"></div>
        <div className="h-28 bg-zinc-800/30 rounded-xl animate-pulse"></div>
        <div className="h-96 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse"></div>
      </div>
    </div>
  );
}
