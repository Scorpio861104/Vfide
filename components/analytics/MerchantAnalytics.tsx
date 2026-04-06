/**
 * MerchantAnalytics — Sales dashboard for merchants
 * 
 * Shows: total revenue, transaction count, average order value,
 * top products, daily revenue trend.
 * 
 * Data comes from /api/merchant/analytics endpoint.
 * Falls back gracefully while merchant activity is still warming up.
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { ExportCSVButton } from '@/components/export/ExportCSVButton';

interface AnalyticsData {
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  revenueChange: number; // percent change vs previous period
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  topProducts: { name: string; revenue: number; count: number }[];
  dailyRevenue: { date: string; amount: number }[];
}

interface MerchantAnalyticsProps {
  merchantAddress: string;
}

export function MerchantAnalytics({ merchantAddress }: MerchantAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchant/analytics?address=${merchantAddress}&period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [merchantAddress, period]);

  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.dailyRevenue.map(d => [d.date, d.amount]);
  }, [data]);

  const formatMoney = (value: number) => (
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Package size={48} className="mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">Analytics will populate after your first synced sales cycle.</p>
        <p className="text-gray-500 text-sm mt-1">Start selling to unlock revenue trends, product leaders, and exportable reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector + export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                period === p ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
              }`}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <ExportCSVButton
          filename={`revenue-${period}`}
          headers={['Date', 'Revenue']}
          rows={exportRows}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatMoney(data.totalRevenue)}
          change={data.revenueChange}
          icon={DollarSign}
          color="cyan"
        />
        <StatCard
          label="Transactions"
          value={data.transactionCount.toLocaleString()}
          icon={ShoppingCart}
          color="emerald"
        />
        <StatCard
          label="Avg Order Value"
          value={formatMoney(data.averageOrderValue)}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign size={20} className="text-cyan-400" />
          Profit &amp; Loss
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PnLMetric label="Revenue" value={formatMoney(data.totalRevenue)} toneClass="text-emerald-400" />
          <PnLMetric label="Operating Expenses" value={`-${formatMoney(data.totalExpenses)}`} toneClass="text-red-400" />
          <PnLMetric label="Net Profit" value={formatMoney(data.netProfit)} toneClass={data.netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'} />
          <PnLMetric label="Margin" value={`${data.profitMargin.toFixed(1)}%`} toneClass="text-cyan-300" />
        </div>
      </div>

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Package size={20} className="text-cyan-400" />
            Top Products
          </h3>
          <div className="space-y-3">
            {data.topProducts.slice(0, 5).map((product, i) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{product.name}</div>
                    <div className="text-gray-500 text-xs">{product.count} sold</div>
                  </div>
                </div>
                <div className="text-cyan-400 font-mono font-bold text-sm">
                  ${product.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Sparkline (simple bar chart) */}
      {data.dailyRevenue.length > 0 && (
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-cyan-400" />
            Daily Revenue
          </h3>
          <div className="flex items-end gap-1 h-32">
            {data.dailyRevenue.map((day, i) => {
              const maxAmount = Math.max(...data.dailyRevenue.map(d => d.amount), 1);
              const heightPct = (day.amount / maxAmount) * 100;
              return (
                <motion.div
                  key={day.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: i * 0.02 }}
                  className="flex-1 bg-gradient-to-t from-cyan-500/40 to-cyan-400/80 rounded-t min-h-[2px]"
                  title={`${day.date}: $${day.amount.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{data.dailyRevenue[0]?.date}</span>
            <span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon, color }: {
  label: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ size: number; className: string }>;
  color: 'cyan' | 'emerald' | 'amber';
}) {
  const colorMap = {
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`p-2 rounded-xl ${c.bg}`}>
          <Icon size={18} className={c.text} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-sm font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {Math.abs(change).toFixed(1)}% vs prior period
        </div>
      )}
    </motion.div>
  );
}

function PnLMetric({ label, value, toneClass }: {
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-1 text-xs text-gray-400">{label}</div>
      <div className={`font-mono text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
