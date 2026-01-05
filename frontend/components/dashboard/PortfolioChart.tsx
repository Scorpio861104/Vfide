const data = [
  { label: "Mon", value: 35 },
  { label: "Tue", value: 48 },
  { label: "Wed", value: 42 },
  { label: "Thu", value: 55 },
  { label: "Fri", value: 60 },
  { label: "Sat", value: 50 },
  { label: "Sun", value: 58 },
];

export function PortfolioChart() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Portfolio Performance</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">7d view</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {data.map((bar) => (
          <div key={bar.label} className="flex flex-col items-center gap-2">
            <div className="w-full bg-gradient-to-t from-blue-500/30 to-blue-500 rounded-md" style={{ height: `${bar.value * 2}px` }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
