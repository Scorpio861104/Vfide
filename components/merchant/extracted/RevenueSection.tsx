'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function RevenueSection({ data }: { data: RevenueData[] }) {
  const [period, setPeriod] = React.useState('30d');

  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const visibleData = data.slice(-periodDays);

  // Calculate statistics
  const totalRevenue = visibleData.reduce((sum, d) => sum + d.revenue, 0);
  const totalVolume = visibleData.reduce((sum, d) => sum + d.volume, 0);
  const avgDaily = visibleData.length > 0 ? totalRevenue / visibleData.length : 0;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['7d', '30d', '90d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Revenue
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Volume
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${totalVolume.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Daily Average
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Revenue Chart (Text-based since we have Recharts already) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Revenue Trend
        </h2>
        <div className="space-y-2">
          {visibleData.slice(-7).map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20">
                {day.date}
              </span>
              <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-purple-600 rounded-lg"
                  style={{ width: `${Math.min((day.revenue / 60000) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-28 text-right">
                ${day.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Revenue Table */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 table-responsive"
        role="region"
        aria-label="Revenue report table"
        tabIndex={0}
      >
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Detailed Revenue Report
        </h2>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Revenue</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Transactions</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Volume</th>
            </tr>
          </thead>
          <tbody>
            {visibleData.slice(-10).reverse().map((day) => (
              <tr key={day.date} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-900 dark:text-white">{day.date}</td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-medium">
                  ${day.revenue.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {day.transactions}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  ${day.volume.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
