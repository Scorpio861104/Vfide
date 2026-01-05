import { TrendingUp, ShieldCheck, ArrowUpRight } from "lucide-react";

const metrics = [
  { label: "Portfolio Value", value: "$1.2M", change: "+2.4%", icon: TrendingUp, color: "text-emerald-400" },
  { label: "Active Strategies", value: "12", change: "+1", icon: ShieldCheck, color: "text-cyan-400" },
  { label: "7d Yield", value: "4.8%", change: "+0.3%", icon: ArrowUpRight, color: "text-amber-400" },
];

export function DashboardOverview() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Overview</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Live</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1 text-sm">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <span>{item.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</span>
              <span className="text-xs text-emerald-500">{item.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
