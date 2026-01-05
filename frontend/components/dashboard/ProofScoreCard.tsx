export function ProofScoreCard() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Proof Score</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">Stable</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-purple-500">8,420</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">/10,000</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Higher scores unlock advanced governance and rewards.</p>
      <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: '84%' }} />
      </div>
    </div>
  );
}
