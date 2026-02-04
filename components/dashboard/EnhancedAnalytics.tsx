/**
 * Enhanced Dashboard Analytics Component
 * Real-time portfolio charts, transaction history, alerts, and ProofScore visualization
 * 
 * Features:
 * - Real-time portfolio value tracking
 * - Interactive Recharts visualizations
 * - Transaction history with advanced filtering
 * - Alerts notification center
 * - ProofScore progress
 * - Mobile-responsive design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids } from '@/lib/mobile';

// ==================== DATA TYPES ====================

interface PortfolioDataPoint {
  timestamp: number;
  date: string;
  value: number;
  eth: number;
  btc: number;
  usdc: number;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake';
  asset: string;
  amount: number;
  counterAsset?: string;
  counterAmount?: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  date: string;
  hash: string;
  from: string;
  to: string;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

interface AssetAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// ==================== DATA FETCHERS ====================

async function fetchPortfolioData(address?: string): Promise<PortfolioDataPoint[]> {
  if (!address) return [];
  try {
    const res = await fetch(`/api/analytics/portfolio/${address}`);
    if (res.ok) {
      const data = await res.json();
      return data.portfolio || [];
    }
  } catch {
    // API not available
  }
  return [];
}

async function fetchTransactions(address?: string): Promise<Transaction[]> {
  if (!address) return [];
  try {
    const res = await fetch(`/api/crypto/transactions/${address}`);
    if (res.ok) {
      const data = await res.json();
      return (data.transactions || []).map((tx: {
        id: string;
        type: string;
        asset: string;
        amount: number;
        status: string;
        timestamp: string;
        hash: string;
        from: string;
        to: string;
      }) => ({
        ...tx,
        date: new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }));
    }
  } catch {
    // API not available
  }
  return [];
}

async function fetchAlerts(address?: string): Promise<Alert[]> {
  if (!address) return [];
  try {
    const res = await fetch(`/api/notifications?userId=${address}`);
    if (res.ok) {
      const data = await res.json();
      return (data.notifications || []).slice(0, 5).map((n: {
        id: string;
        type: string;
        title: string;
        message: string;
        createdAt: string;
        read: boolean;
        actionUrl?: string;
        actionLabel?: string;
      }) => ({
        id: n.id,
        type: n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : n.type === 'error' ? 'error' : 'info',
        title: n.title,
        message: n.message,
        timestamp: new Date(n.createdAt).getTime(),
        read: n.read,
        action: n.actionUrl ? { label: n.actionLabel || 'View', href: n.actionUrl } : undefined,
      }));
    }
  } catch {
    // API not available
  }
  return [];
}

// ==================== CHART COMPONENTS ====================

export function PortfolioValueChart({ data }: { data: PortfolioDataPoint[] }) {
  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '12px',
            }}
            labelStyle={{ color: '#f3f4f6' }}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AssetAllocationChart({ allocations }: { allocations: AssetAllocation[] }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocations}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percentage }) => `${name} ${percentage}%`}
          >
            {allocations.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `$${value.toLocaleString()}`}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TransactionVolumeChart({ data }: { data: PortfolioDataPoint[] }) {
  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Legend />
          <Bar dataKey="eth" stackId="a" fill="#627eea" name="ETH" />
          <Bar dataKey="btc" stackId="a" fill="#f7931a" name="BTC" />
          <Bar dataKey="usdc" stackId="a" fill="#2775ca" name="USDC" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== MAIN DASHBOARD COMPONENT ====================

export default function EnhancedDashboardAnalytics() {
  const { address } = useAccount();
  const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch real data from APIs
    const loadData = async () => {
      setIsLoading(true);
      const [portfolio, txs, notifs] = await Promise.all([
        fetchPortfolioData(address),
        fetchTransactions(address),
        fetchAlerts(address),
      ]);
      setPortfolioData(portfolio);
      setTransactions(txs);
      setAlerts(notifs);
      setIsLoading(false);
    };
    
    if (address) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [address]);

  // Calculate asset allocation
  const latestData = portfolioData.length > 0 ? portfolioData[portfolioData.length - 1] : null;
  const allocations: AssetAllocation[] = latestData ? [
    {
      name: 'ETH',
      value: latestData.eth,
      percentage: Math.round((latestData.eth / latestData.value) * 100),
      color: '#627eea',
    },
    {
      name: 'BTC',
      value: latestData.btc,
      percentage: Math.round((latestData.btc / latestData.value) * 100),
      color: '#f7931a',
    },
    {
      name: 'USDC',
      value: latestData.usdc,
      percentage: Math.round((latestData.usdc / latestData.value) * 100),
      color: '#2775ca',
    },
  ] : [];

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    let matches = true;

    if (transactionFilter !== 'all') {
      matches = matches && tx.type === transactionFilter;
    }

    if (searchQuery) {
      matches = matches && (
        tx.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return matches;
  });

  // Unread alerts count
  const unreadAlertsCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Balance"
          value={latestData?.value || 0}
          change={12.5}
          icon="💰"
        />
        <MetricCard
          label="24h Change"
          value={250.50}
          change={5.2}
          icon="📈"
        />
        <MetricCard
          label="ProofScore"
          value={8450}
          change={150}
          icon="⭐"
        />
        <MetricCard
          label="Alerts"
          value={unreadAlertsCount}
          change={0}
          icon="🔔"
          highlight={unreadAlertsCount > 0}
        />
      </div>

      {/* Charts Grid */}
      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        {/* Portfolio Value Chart */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Portfolio Value (30 days)
          </h3>
          {isLoading ? (
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <PortfolioValueChart data={portfolioData} />
          )}
        </div>

        {/* Asset Allocation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Asset Allocation
          </h3>
          {isLoading ? (
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ) : (
            <AssetAllocationChart allocations={allocations} />
          )}
        </div>
      </div>

      {/* Transaction Volume Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Transaction Volume
        </h3>
        {isLoading ? (
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : (
          <TransactionVolumeChart data={portfolioData} />
        )}
      </div>

      {/* Alerts Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Alerts ({unreadAlertsCount} unread)
          </h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Mark all as read
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Transaction History
          </h3>
          <Link href="/explorer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MobileInput
            label="Search"
            placeholder="Asset, address, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <MobileSelect
            label="Type"
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'send', label: 'Sent' },
              { value: 'receive', label: 'Received' },
              { value: 'swap', label: 'Swaps' },
              { value: 'stake', label: 'Staking' },
            ]}
            value={transactionFilter}
            onChange={(e) => setTransactionFilter(e.target.value)}
          />

          <MobileSelect
            label="Period"
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: 'all', label: 'All time' },
            ]}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          />
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div
            className="table-responsive"
            role="region"
            aria-label="Analytics transactions"
            tabIndex={0}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Asset
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 10).map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-sm">{tx.type}</td>
                    <td className="py-3 px-4 text-sm font-medium">{tx.asset}</td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {tx.type === 'swap' ? `${tx.amount} ${tx.asset} → ${tx.counterAmount} ${tx.counterAsset}` : `${tx.amount} ${tx.asset}`}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredTransactions.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No transactions found
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================

function MetricCard({
  label,
  value,
  change,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  change: number;
  icon: string;
  highlight?: boolean;
}) {
  const isPositive = change >= 0;

  return (
    <div className={`rounded-lg p-4 border ${
      highlight
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' && label.includes('Balance')
              ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : typeof value === 'number'
              ? value.toLocaleString()
              : value}
          </p>
        </div>
        <span className="text-2xl md:text-3xl">{icon}</span>
      </div>
      {label !== 'Alerts' && (
        <div className={`mt-2 text-xs md:text-sm font-medium ${
          isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
  };

  const iconColor = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`rounded-lg p-4 border ${bgColor[alert.type]} ${alert.read ? 'opacity-75' : ''}`}>
      <div className="flex gap-3">
        <span className="text-xl shrink-0">{iconColor[alert.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {alert.title}
          </p>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 mt-1">
            {alert.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
            {alert.action && (
              <a
                href={alert.action.href}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {alert.action.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'completed' | 'failed' }) {
  const colors = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300',
    completed: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    failed: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
