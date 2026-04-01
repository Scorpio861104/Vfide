export default function CryptoLoading() {
  return (
    <div className="min-h-screen bg-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-zinc-800/50 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-36 bg-zinc-800/30 rounded-xl animate-pulse"></div>
          <div className="h-36 bg-zinc-800/30 rounded-xl animate-pulse"></div>
          <div className="h-36 bg-zinc-800/30 rounded-xl animate-pulse"></div>
        </div>
        <div className="h-72 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse"></div>
      </div>
    </div>
  );
}
