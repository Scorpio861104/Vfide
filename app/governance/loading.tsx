export default function GovernanceLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-12 bg-gray-800/50 rounded-lg w-2/3 animate-pulse"></div>
          <div className="h-4 bg-gray-800/30 rounded w-1/2 animate-pulse"></div>
        </div>

        {/* Grid of proposal cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/20 rounded-lg p-6 border border-gray-700/50 space-y-4">
              <div className="h-6 bg-gray-700/50 rounded w-3/4 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700/30 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-700/30 rounded w-5/6 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-700/30 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
