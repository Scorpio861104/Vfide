'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNotificationHub } from '@/hooks/useNotificationHub';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { NotificationStats } from '@/components/notifications/NotificationStats';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import {
  NotificationFilter,
  NotificationType,
} from '@/config/notification-hub';
import {
  Bell,
  Check,
  Trash2,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/ui/PageLayout';

export default function NotificationHubPage() {
  const {
    notifications,
    stats,
    isLoading: _isLoading,
    filterNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
    preferences,
    updatePreference,
    resetPreferences,
    exportNotifications,
    searchNotifications,
  } = useNotificationHub();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Partial<NotificationFilter>>({});

  // Apply filters
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Tab filtering
    if (activeTab === 'unread') {
      result = result.filter((n) => n.status !== 'read');
    }

    // Search
    if (searchQuery) {
      result = searchNotifications(searchQuery);
    }

    // Type filtering
    if (selectedFilter.types?.length) {
      result = filterNotifications({
        ...selectedFilter,
        types: selectedFilter.types,
      });
    }

    return result;
  }, [notifications, activeTab, searchQuery, selectedFilter, filterNotifications, searchNotifications]);

  const tabs = [
    { id: 'all' as const, label: 'All', count: notifications.length },
    { id: 'unread' as const, label: 'Unread', count: stats.unread },
    { id: 'preferences' as const, label: 'Settings' },
  ];

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportNotifications(format);
    const filename =
      format === 'json'
        ? `notifications-${Date.now()}.json`
        : `notifications-${Date.now()}.csv`;

    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageWrapper variant="gradient">
      <PageHeader
        icon={<Bell className="w-10 h-10 text-white" />}
        title="Notification Command"
        subtitle="Direct signal, filter noise, and export every critical alert."
        badge="Signal Intelligence"
        badgeColor="bg-violet-400/20 text-violet-200"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/70 hover:bg-slate-700 rounded-lg border border-slate-600/60 text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {stats.unread} unread signals
          </span>
        </div>
      </PageHeader>
      <h1 className="sr-only">Notification Command</h1>

      {/* Tab Navigation */}
      <div className="sticky top-20 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {tabs.map(({ id, label, count }) => (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1 px-2 py-0.5 bg-slate-800 rounded text-xs">
                    {count}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 py-8">
        {activeTab === 'all' || activeTab === 'unread' ? (
          <motion.div
            key={`tab-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats */}
            <ErrorBoundary>
              <NotificationStats stats={stats} />
            </ErrorBoundary>

            {/* Search and Filters */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) =>  setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <select
                    value={selectedFilter.types?.[0] || ''}
                    onChange={(e) =>  {
                      if (e.target.value) {
                        setSelectedFilter({
                          types: [e.target.value as NotificationType],
                        });
                      } else {
                        setSelectedFilter({});
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    {Object.values(NotificationType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {stats.unread > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm text-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Mark All as Read
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <ErrorBoundary>
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={markAsRead}
                onDismiss={dismissNotification}
              />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            key="tab-preferences"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
              <ErrorBoundary>
                <NotificationPreferences
                  preferences={preferences}
                  onUpdatePreference={updatePreference}
                  onReset={resetPreferences}
                />
              </ErrorBoundary>
            </div>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
