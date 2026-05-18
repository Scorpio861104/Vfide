export default function ExplorerLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-10 bg-gray-800/50 rounded w-1/3 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800/20 rounded-lg p-4 border border-gray-700/50">
              <div className="h-4 bg-gray-700/50 rounded w-2/3 animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-700/30 rounded w-1/2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
