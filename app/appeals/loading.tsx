export default function AppealsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-10 bg-zinc-800/50 rounded w-1/4 animate-pulse"></div>
        <div className="h-28 bg-zinc-800/30 rounded-xl animate-pulse"></div>
        <div className="h-80 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse"></div>
      </div>
    </div>
  );
}
