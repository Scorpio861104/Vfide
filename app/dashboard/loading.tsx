export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-10 bg-gray-800/50 rounded w-1/2 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800/20 rounded-lg p-6 border border-gray-700/50">
              <div className="h-4 bg-gray-700/50 rounded w-1/2 animate-pulse mb-3"></div>
              <div className="h-8 bg-gray-700/30 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="bg-gray-800/20 rounded-lg p-6 border border-gray-700/50 h-64 animate-pulse"></div>
      </div>
    </div>
  );
}
