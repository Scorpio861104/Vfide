export default function MarketplaceLoading() {
  const items = [...Array(12)];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-10 bg-gray-800/50 rounded w-1/3 animate-pulse mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((_, i) => (
            <div key={i} className="bg-gray-800/20 rounded-lg border border-gray-700/50 overflow-hidden">
              <div className="h-32 bg-gray-700/30 animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-700/30 rounded w-2/3 animate-pulse"></div>
                <div className="h-6 bg-gray-700/30 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
