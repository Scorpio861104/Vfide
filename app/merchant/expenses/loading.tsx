export default function MerchantExpensesLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 bg-zinc-800/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse" />
          <div className="h-40 bg-zinc-800/20 rounded-xl border border-zinc-700/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
