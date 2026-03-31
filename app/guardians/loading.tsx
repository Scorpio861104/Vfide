export default function GuardiansLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="h-12 bg-gray-800/50 rounded-lg w-1/2 animate-pulse"></div>
          <div className="h-4 bg-gray-800/30 rounded w-2/3 animate-pulse"></div>
        </div>

        {/* Guardian list skeleton */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/20 rounded-lg p-4 border border-gray-700/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700/50 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-1/3 animate-pulse"></div>
                <div className="h-3 bg-gray-700/30 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-700/30 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
