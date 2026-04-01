export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 bg-gray-800/50 rounded w-1/3 animate-pulse"></div>
        <div className="bg-gray-800/20 rounded-lg p-6 border border-gray-700/50 space-y-4">
          <div className="h-6 bg-gray-700/50 rounded w-1/2 animate-pulse"></div>
          <div className="h-12 bg-gray-700/30 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-700/30 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
