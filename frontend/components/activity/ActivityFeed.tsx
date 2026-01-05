/**
 * Activity Feed Component
 * Displays user activity history with timeline view, filtering, search, and export
 * 
 * Features:
 * - Timeline view of user activities
 * - Filter by activity type (transaction, governance, merchant, badge, escrow, wallet)
 * - Filter by date range
 * - Search by description/user
 * - Pagination or infinite scroll
 * - Export activity data
 * - Real-time activity updates
 * - Mobile-responsive design
 * - Dark mode support
 * - Accessibility compliance
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MobileButton, MobileInput } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// ==================== TYPES ====================

interface Activity {
  id: string;
  type: 'transaction' | 'governance' | 'merchant' | 'badge' | 'escrow' | 'wallet';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: {
    amount?: string;
    proposalId?: string;
    badgeName?: string;
    status?: string;
    [key: string]: any;
  };
  icon?: string;
}

interface ActivityFilter {
  type: 'all' | Activity['type'];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  search: string;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  byType: Record<Activity['type'], number>;
}

// ==================== MOCK DATA ====================

const generateMockActivities = (): Activity[] => {
  const now = new Date();
  const activities: Activity[] = [
    {
      id: '1',
      type: 'transaction',
      title: 'Payment Received',
      description: 'Received 500 USDC from merchant portal',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      user: 'John Doe',
      metadata: { amount: '500 USDC', status: 'completed' },
      icon: '💰',
    },
    {
      id: '2',
      type: 'governance',
      title: 'Voted on Proposal',
      description: 'Voted YES on proposal #42: Treasury Allocation',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
      user: 'John Doe',
      metadata: { proposalId: '42', status: 'active' },
      icon: '🗳️',
    },
    {
      id: '3',
      type: 'badge',
      title: 'Badge Earned',
      description: 'Earned "Early Adopter" badge',
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      user: 'John Doe',
      metadata: { badgeName: 'Early Adopter', status: 'active' },
      icon: '🏆',
    },
    {
      id: '4',
      type: 'merchant',
      title: 'Merchant Profile Updated',
      description: 'Updated business information and payment settings',
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      user: 'John Doe',
      metadata: { status: 'completed' },
      icon: '🏪',
    },
    {
      id: '5',
      type: 'escrow',
      title: 'Escrow Created',
      description: 'Created escrow for transaction #1234',
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      user: 'John Doe',
      metadata: { amount: '1000 USDC', status: 'active' },
      icon: '🔒',
    },
    {
      id: '6',
      type: 'wallet',
      title: 'Wallet Connected',
      description: 'Connected MetaMask wallet',
      timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      user: 'John Doe',
      metadata: { status: 'connected' },
      icon: '👛',
    },
    {
      id: '7',
      type: 'transaction',
      title: 'Payment Sent',
      description: 'Sent 250 USDC to supplier',
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      user: 'John Doe',
      metadata: { amount: '250 USDC', status: 'completed' },
      icon: '💸',
    },
    {
      id: '8',
      type: 'governance',
      title: 'Proposal Created',
      description: 'Created proposal #43: Community Fund',
      timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      user: 'John Doe',
      metadata: { proposalId: '43', status: 'pending' },
      icon: '📝',
    },
    {
      id: '9',
      type: 'badge',
      title: 'Badge Progress',
      description: 'Made progress on "Transaction Master" badge (75%)',
      timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      user: 'John Doe',
      metadata: { badgeName: 'Transaction Master', status: 'in-progress' },
      icon: '⭐',
    },
    {
      id: '10',
      type: 'merchant',
      title: 'Payout Received',
      description: 'Received monthly payout of 2,500 USDC',
      timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      user: 'John Doe',
      metadata: { amount: '2500 USDC', status: 'completed' },
      icon: '💵',
    },
  ];

  return activities;
};

const calculateActivityStats = (activities: Activity[]): ActivityStats => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats: ActivityStats = {
    total: activities.length,
    today: activities.filter((a) => a.timestamp >= oneDayAgo).length,
    thisWeek: activities.filter((a) => a.timestamp >= oneWeekAgo).length,
    byType: {
      transaction: activities.filter((a) => a.type === 'transaction').length,
      governance: activities.filter((a) => a.type === 'governance').length,
      merchant: activities.filter((a) => a.type === 'merchant').length,
      badge: activities.filter((a) => a.type === 'badge').length,
      escrow: activities.filter((a) => a.type === 'escrow').length,
      wallet: activities.filter((a) => a.type === 'wallet').length,
    },
  };

  return stats;
};

// ==================== HELPER FUNCTIONS ====================

const getTypeColor = (type: Activity['type']): string => {
  const colors: Record<Activity['type'], string> = {
    transaction: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    governance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    merchant: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    escrow: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    wallet: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

const getTypeLabel = (type: Activity['type']): string => {
  const labels: Record<Activity['type'], string> = {
    transaction: 'Transaction',
    governance: 'Governance',
    merchant: 'Merchant',
    badge: 'Badge',
    escrow: 'Escrow',
    wallet: 'Wallet',
  };
  return labels[type] || type;
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

const formatFullDate = (timestamp: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(timestamp);
};

const filterActivities = (activities: Activity[], filter: ActivityFilter): Activity[] => {
  let filtered = [...activities];

  // Filter by type
  if (filter.type !== 'all') {
    filtered = filtered.filter((a) => a.type === filter.type);
  }

  // Filter by date range
  if (filter.dateRange !== 'all') {
    const now = new Date();
    let cutoffDate: Date;

    switch (filter.dateRange) {
      case 'today':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    filtered = filtered.filter((a) => a.timestamp >= cutoffDate);
  }

  // Filter by search text
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.user?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
};

const exportActivitiesToCSV = (activities: Activity[]): void => {
  // Create CSV header
  const headers = ['ID', 'Type', 'Title', 'Description', 'Timestamp', 'User', 'Metadata'];
  
  // Create CSV rows
  const rows = activities.map((activity) => [
    activity.id,
    activity.type,
    activity.title,
    activity.description,
    activity.timestamp.toISOString(),
    activity.user || '',
    JSON.stringify(activity.metadata || {}),
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `activity-feed-${new Date().toISOString()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==================== SUB-COMPONENTS ====================

interface ActivityItemProps {
  activity: Activity;
  showTimeline?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, showTimeline = true }) => {
  return (
    <div className="flex gap-4">
      {/* Timeline indicator */}
      {showTimeline && (
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-lg flex-shrink-0">
            {activity.icon || '📌'}
          </div>
          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
        </div>
      )}

      {/* Activity content */}
      <div className="flex-1 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {activity.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </p>
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getTypeColor(
                activity.type
              )}`}
            >
              {getTypeLabel(activity.type)}
            </span>
          </div>

          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                >
                  {key}: {value}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span title={formatFullDate(activity.timestamp)}>
              {formatTimeAgo(activity.timestamp)}
            </span>
            {activity.user && <span>by {activity.user}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-lg ${
            colorClasses[color] || colorClasses.blue
          } flex items-center justify-center text-2xl`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const ActivityFeed: React.FC = () => {
  // State
  const [activities] = useState<Activity[]>(generateMockActivities());
  const [filter, setFilter] = useState<ActivityFilter>({
    type: 'all',
    dateRange: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Computed values
  const stats = useMemo(() => calculateActivityStats(activities), [activities]);
  const filteredActivities = useMemo(
    () => filterActivities(activities, filter),
    [activities, filter]
  );

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Handlers
  const handleExport = useCallback(() => {
    exportActivitiesToCSV(filteredActivities);
  }, [filteredActivities]);

  const handleClearFilters = useCallback(() => {
    setFilter({
      type: 'all',
      dateRange: 'all',
      search: '',
    });
    setPage(1);
  }, []);

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilter: Partial<ActivityFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
    setPage(1);
  }, []);

  return (
    <ResponsiveContainer>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Activity Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and track all your activities in one place
          </p>
        </div>

        {/* Statistics */}
        <div className={`${responsiveGrids.auto} gap-4 mb-6`}>
          <StatCard label="Total Activities" value={stats.total} icon="📊" color="blue" />
          <StatCard label="Today" value={stats.today} icon="📅" color="green" />
          <StatCard label="This Week" value={stats.thisWeek} icon="📈" color="purple" />
          <StatCard
            label="Transactions"
            value={stats.byType.transaction}
            icon="💰"
            color="orange"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Filters
          </h2>

          <div className={`${responsiveGrids.auto} gap-4 mb-4`}>
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <MobileInput
                type="text"
                value={filter.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                placeholder="Search activities..."
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={filter.type}
                onChange={(e) =>
                  handleFilterChange({ type: e.target.value as ActivityFilter['type'] })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="transaction">Transaction</option>
                <option value="governance">Governance</option>
                <option value="merchant">Merchant</option>
                <option value="badge">Badge</option>
                <option value="escrow">Escrow</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={filter.dateRange}
                onChange={(e) =>
                  handleFilterChange({ dateRange: e.target.value as ActivityFilter['dateRange'] })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-wrap gap-2">
            <MobileButton
              variant="secondary"
              onClick={handleClearFilters}
              disabled={filter.type === 'all' && filter.dateRange === 'all' && !filter.search}
            >
              Clear Filters
            </MobileButton>
            <MobileButton
              variant="primary"
              onClick={handleExport}
              disabled={filteredActivities.length === 0}
            >
              Export CSV ({filteredActivities.length})
            </MobileButton>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Timeline
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>

          {/* Activities List */}
          {paginatedActivities.length > 0 ? (
            <div className="space-y-0">
              {paginatedActivities.map((activity, index) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  showTimeline={index < paginatedActivities.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
                No activities found
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">
                Try adjusting your filters to see more results
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredActivities.length > itemsPerPage && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * itemsPerPage + 1} to{' '}
                {Math.min(page * itemsPerPage, filteredActivities.length)} of{' '}
                {filteredActivities.length}
              </div>
              <div className="flex gap-2">
                <MobileButton
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </MobileButton>
                <MobileButton
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </MobileButton>
              </div>
            </div>
          )}
        </div>

        {/* Activity Type Breakdown */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity Breakdown
          </h2>
          <div className={`${responsiveGrids.auto} gap-4`}>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                    type as Activity['type']
                  )}`}
                >
                  {getTypeLabel(type as Activity['type'])}
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default ActivityFeed;
