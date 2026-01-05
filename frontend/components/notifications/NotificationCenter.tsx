/**
 * Real-time Notification Center Component
 * Manages notifications, notification history, preferences, and real-time updates
 * 
 * Features:
 * - Real-time notification display
 * - Notification filtering (by type, status, date)
 * - Notification history tracking
 * - User notification preferences
 * - Mark as read/unread
 * - Notification actions (dismiss, archive)
 * - Badge count tracking
 * - Sound and desktop notifications support
 * - Mobile-responsive design
 * - Dark mode support
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MobileButton, MobileInput } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// ==================== TYPES ====================

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'transaction';
  icon: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'transaction' | 'governance' | 'merchant' | 'security' | 'system';
  source: string;
}

interface NotificationPreferences {
  enableNotifications: boolean;
  enableSound: boolean;
  enableDesktop: boolean;
  enableEmail: boolean;
  transactionAlerts: boolean;
  governanceAlerts: boolean;
  merchantAlerts: boolean;
  securityAlerts: boolean;
  systemAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  unreadByType: Record<string, number>;
  unreadByPriority: Record<string, number>;
  readToday: number;
  archivedCount: number;
}

interface NotificationFilter {
  search: string;
  type: 'all' | Notification['type'];
  category: 'all' | Notification['category'];
  priority: 'all' | Notification['priority'];
  read: 'all' | 'read' | 'unread';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

// ==================== MOCK DATA ====================

function generateMockNotifications(): Notification[] {
  const now = Date.now();
  return [
    {
      id: 'notif-1',
      title: 'Transaction Confirmed',
      message: 'Your payment of $500 to John Doe has been confirmed',
      type: 'success',
      icon: '✅',
      timestamp: now - 2 * 60 * 1000,
      read: false,
      archived: false,
      actionUrl: '/transactions/tx-123',
      actionLabel: 'View Details',
      priority: 'high',
      category: 'transaction',
      source: 'Blockchain',
    },
    {
      id: 'notif-2',
      title: 'Governance Vote Available',
      message: 'New proposal "Increase Treasury" is open for voting. Cast your vote now!',
      type: 'info',
      icon: '🗳️',
      timestamp: now - 30 * 60 * 1000,
      read: false,
      archived: false,
      actionUrl: '/governance/proposals/456',
      actionLabel: 'Vote Now',
      priority: 'medium',
      category: 'governance',
      source: 'DAO',
    },
    {
      id: 'notif-3',
      title: 'Security Alert',
      message: 'New login from Chrome on Windows detected',
      type: 'warning',
      icon: '⚠️',
      timestamp: now - 1 * 60 * 60 * 1000,
      read: true,
      archived: false,
      actionUrl: '/settings/security',
      actionLabel: 'Review Activity',
      priority: 'critical',
      category: 'security',
      source: 'Security System',
    },
    {
      id: 'notif-4',
      title: 'Payment Request Received',
      message: 'Alice Smith requested $250 for project services',
      type: 'transaction',
      icon: '💰',
      timestamp: now - 2 * 60 * 60 * 1000,
      read: true,
      archived: false,
      actionUrl: '/payments/requests/789',
      actionLabel: 'Review Request',
      priority: 'medium',
      category: 'merchant',
      source: 'Merchant Portal',
    },
    {
      id: 'notif-5',
      title: 'System Maintenance',
      message: 'Scheduled maintenance on January 5 from 2-4 AM UTC',
      type: 'info',
      icon: '🔧',
      timestamp: now - 6 * 60 * 60 * 1000,
      read: true,
      archived: false,
      priority: 'low',
      category: 'system',
      source: 'System',
    },
    {
      id: 'notif-6',
      title: 'ProofScore Increased',
      message: 'Your ProofScore increased by 45 points. You are now a Rising Star!',
      type: 'success',
      icon: '⭐',
      timestamp: now - 12 * 60 * 60 * 1000,
      read: true,
      archived: false,
      actionUrl: '/proofscore',
      actionLabel: 'View Profile',
      priority: 'low',
      category: 'system',
      source: 'ProofScore',
    },
    {
      id: 'notif-7',
      title: 'Transaction Failed',
      message: 'Transaction to 0x1234...5678 failed due to insufficient gas',
      type: 'error',
      icon: '❌',
      timestamp: now - 24 * 60 * 60 * 1000,
      read: true,
      archived: true,
      actionUrl: '/transactions/failed/abc',
      actionLabel: 'Retry',
      priority: 'high',
      category: 'transaction',
      source: 'Blockchain',
    },
  ];
}

function calculateNotificationStats(notifications: Notification[]): NotificationStats {
  const unread = notifications.filter((n) => !n.read && !n.archived);
  const archived = notifications.filter((n) => n.archived);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const readToday = notifications.filter(
    (n) => n.read && n.timestamp > today.getTime() && !n.archived
  ).length;

  const unreadByType: Record<string, number> = {};
  const unreadByPriority: Record<string, number> = {};

  unread.forEach((n) => {
    unreadByType[n.type] = (unreadByType[n.type] || 0) + 1;
    unreadByPriority[n.priority] = (unreadByPriority[n.priority] || 0) + 1;
  });

  return {
    total: notifications.filter((n) => !n.archived).length,
    unread: unread.length,
    unreadByType,
    unreadByPriority,
    readToday,
    archivedCount: archived.length,
  };
}

// ==================== HELPER FUNCTIONS ====================

function getTypeColor(type: Notification['type']): string {
  switch (type) {
    case 'success':
      return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700';
    case 'error':
      return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700';
    case 'warning':
      return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700';
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700';
    case 'transaction':
      return 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700';
    default:
      return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  }
}

function getTypeTextColor(type: Notification['type']): string {
  switch (type) {
    case 'success':
      return 'text-green-800 dark:text-green-200';
    case 'error':
      return 'text-red-800 dark:text-red-200';
    case 'warning':
      return 'text-yellow-800 dark:text-yellow-200';
    case 'info':
      return 'text-blue-800 dark:text-blue-200';
    case 'transaction':
      return 'text-purple-800 dark:text-purple-200';
    default:
      return 'text-gray-800 dark:text-gray-200';
  }
}

function getPriorityColor(priority: Notification['priority']): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-blue-500';
    case 'low':
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

function filterNotifications(
  notifications: Notification[],
  filter: NotificationFilter
): Notification[] {
  let result = notifications.filter((n) => !n.archived);

  if (filter.search) {
    const search = filter.search.toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(search) || n.message.toLowerCase().includes(search)
    );
  }

  if (filter.type !== 'all') {
    result = result.filter((n) => n.type === filter.type);
  }

  if (filter.category !== 'all') {
    result = result.filter((n) => n.category === filter.category);
  }

  if (filter.priority !== 'all') {
    result = result.filter((n) => n.priority === filter.priority);
  }

  if (filter.read !== 'all') {
    result = result.filter((n) => (filter.read === 'read' ? n.read : !n.read));
  }

  if (filter.dateRange !== 'all') {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    result = result.filter((n) => {
      const age = now - n.timestamp;
      switch (filter.dateRange) {
        case 'today':
          return age < oneDay;
        case 'week':
          return age < oneWeek;
        case 'month':
          return age < oneMonth;
        default:
          return true;
      }
    });
  }

  return result;
}

// ==================== COMPONENTS ====================

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onAction?: (url: string) => void;
}

function NotificationItem({
  notification,
  onRead,
  onArchive,
  onAction,
}: NotificationItemProps) {
  const isRead = notification.read;

  return (
    <div
      className={`${getTypeColor(notification.type)} border rounded-lg p-4 md:p-6 transition-all cursor-pointer hover:shadow-md`}
      onClick={() => !isRead && onRead(notification.id)}
    >
      <div className="flex items-start gap-4">
        {/* Icon and Priority Indicator */}
        <div className="relative flex-shrink-0">
          <span className="text-2xl md:text-3xl">{notification.icon}</span>
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(notification.priority)}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`text-base md:text-lg font-bold ${getTypeTextColor(notification.type)} ${!isRead ? 'font-extrabold' : ''}`}>
              {notification.title}
            </h3>
            {!isRead && (
              <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0 ml-2" />
            )}
          </div>

          <p className={`text-sm md:text-base ${getTypeTextColor(notification.type)} opacity-90 mb-2`}>
            {notification.message}
          </p>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className={getTypeTextColor(notification.type)}>
                {notification.source}
              </span>
              <span className="opacity-60">•</span>
              <span className="opacity-60">{formatTime(notification.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {!isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification.id);
              }}
              className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Mark Read
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded transition-colors"
          >
            Archive
          </button>
        </div>
      </div>

      {/* Action Button */}
      {notification.actionUrl && notification.actionLabel && (
        <button
          onClick={() => onAction?.(notification.actionUrl!)}
          className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
        >
          {notification.actionLabel}
        </button>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className={`rounded-lg p-4 md:p-6 bg-gradient-to-br ${color} text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <span className="text-3xl md:text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState<'notifications' | 'history' | 'preferences'>(
    'notifications'
  );
  const [notifications, setNotifications] = useState<Notification[]>(generateMockNotifications());
  const [filter, setFilter] = useState<NotificationFilter>({
    search: '',
    type: 'all',
    category: 'all',
    priority: 'all',
    read: 'unread',
    dateRange: 'all',
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableNotifications: true,
    enableSound: true,
    enableDesktop: true,
    enableEmail: false,
    transactionAlerts: true,
    governanceAlerts: true,
    merchantAlerts: true,
    securityAlerts: true,
    systemAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const stats = calculateNotificationStats(notifications);
  const filteredNotifications = filterNotifications(notifications, filter);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleArchive = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, archived: true } : n))
    );
  }, []);

  const handleArchiveAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, archived: true })));
  }, []);

  const handleClearArchive = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => !n.archived));
  }, []);

  const handleNotificationAction = useCallback((url: string) => {
    // In production, this would navigate to the URL
    console.log('Navigate to:', url);
  }, []);

  // ==================== TAB CONTENT ====================

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className={`grid ${responsiveGrids.auto} gap-4`}>
        <StatCard
          label="Total Unread"
          value={stats.unread}
          icon="📬"
          color="from-blue-500 to-blue-700"
        />
        <StatCard
          label="Read Today"
          value={stats.readToday}
          icon="📖"
          color="from-green-500 to-green-700"
        />
        <StatCard
          label="Total Active"
          value={stats.total}
          icon="📌"
          color="from-purple-500 to-purple-700"
        />
        <StatCard
          label="Archived"
          value={stats.archivedCount}
          icon="📦"
          color="from-orange-500 to-orange-700"
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
          Filter Notifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <MobileInput
              type="text"
              placeholder="Search notifications..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <select
              value={filter.type}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  type: e.target.value as NotificationFilter['type'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  category: e.target.value as NotificationFilter['category'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="transaction">Transaction</option>
              <option value="governance">Governance</option>
              <option value="merchant">Merchant</option>
              <option value="security">Security</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={filter.priority}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  priority: e.target.value as NotificationFilter['priority'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Read Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filter.read}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  read: e.target.value as NotificationFilter['read'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
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
                setFilter({
                  ...filter,
                  dateRange: e.target.value as NotificationFilter['dateRange'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <MobileButton
            onClick={handleMarkAllAsRead}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Mark All Read
          </MobileButton>
          <MobileButton
            onClick={handleArchiveAll}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Archive All
          </MobileButton>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleMarkAsRead}
              onArchive={handleArchive}
              onAction={handleNotificationAction}
            />
          ))
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No notifications match your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
            Notification History
          </h3>
          <MobileButton
            onClick={handleClearArchive}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Clear All
          </MobileButton>
        </div>

        <div className="space-y-3">
          {notifications
            .filter((n) => n.archived)
            .map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <span className="text-2xl flex-shrink-0">{notification.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Archived {formatTime(notification.timestamp)}
                  </p>
                </div>
              </div>
            ))}

          {notifications.filter((n) => n.archived).length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No archived notifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h3>

        <div className="space-y-4">
          {/* General Settings */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">General Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enableNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, enableNotifications: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable all notifications
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enableSound}
                  onChange={(e) =>
                    setPreferences({ ...preferences, enableSound: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable notification sounds
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enableDesktop}
                  onChange={(e) =>
                    setPreferences({ ...preferences, enableDesktop: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable desktop notifications
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enableEmail}
                  onChange={(e) =>
                    setPreferences({ ...preferences, enableEmail: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Enable email notifications
                </span>
              </label>
            </div>
          </div>

          {/* Notification Categories */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Notification Categories
            </h4>
            <div className="space-y-3">
              {[
                { key: 'transactionAlerts', label: 'Transaction Alerts' },
                { key: 'governanceAlerts', label: 'Governance Alerts' },
                { key: 'merchantAlerts', label: 'Merchant Alerts' },
                { key: 'securityAlerts', label: 'Security Alerts' },
                { key: 'systemAlerts', label: 'System Alerts' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[key as keyof NotificationPreferences] as boolean}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        [key]: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Quiet Hours</h4>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={preferences.quietHoursEnabled}
                onChange={(e) =>
                  setPreferences({ ...preferences, quietHoursEnabled: e.target.checked })
                }
                className="w-5 h-5 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable quiet hours
              </span>
            </label>

            {preferences.quietHoursEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) =>
                      setPreferences({ ...preferences, quietHoursStart: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) =>
                      setPreferences({ ...preferences, quietHoursEnd: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <MobileButton
          onClick={() => {
            // In production, this would save preferences to backend
            console.log('Preferences saved:', preferences);
          }}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Save Preferences
        </MobileButton>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <ResponsiveContainer>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              🔔 Notification Center
            </h1>
            {stats.unread > 0 && (
              <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                {stats.unread}
              </div>
            )}
          </div>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            Manage your notifications and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-3 border-b border-gray-200 dark:border-gray-700">
            {(['notifications', 'history', 'preferences'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-center transition-colors text-sm md:text-base ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'notifications' && `📬 Notifications`}
                {tab === 'history' && `📦 History`}
                {tab === 'preferences' && `⚙️ Preferences`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-8">
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'history' && renderHistoryTab()}
            {activeTab === 'preferences' && renderPreferencesTab()}
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
