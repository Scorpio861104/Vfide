'use client';

/**
 * NotificationsTabInline — the full Notifications Hub rendered as a tab
 * inside /settings (R90 T1-3). Extracted from /notifications/page.tsx so it
 * can be embedded without page chrome duplication.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationHub } from '@/hooks/useNotificationHub';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { NotificationStats } from '@/components/notifications/NotificationStats';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { NotificationFilter, NotificationType } from '@/config/notification-hub';
import { Bell, Check, Trash2, Download, Search, Filter, Settings } from 'lucide-react';

export function NotificationsTabInline() {
  const {
    notifications, stats, isLoading: _isLoading,
    filterNotifications, markAsRead, markAllAsRead, dismissNotification,
    clearNotifications, preferences, updatePreference, resetPreferences,
    exportNotifications, searchNotifications,
  } = useNotificationHub();

  const [activeTab, setActiveTab]     = useState<'all' | 'unread' | 'preferences'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Partial<NotificationFilter>>({});

  // CODE-6: filterNotifications and searchNotifications are listed as deps here.
  // If those functions are not wrapped in useCallback inside the hook they come from,
  // they will be recreated on every render, causing this memo to rerun every render.
  // Verify that the hook providing them (useNotificationCenter) memoises them with useCallback.
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (activeTab === 'unread') result = result.filter(n => n.status !== 'read');
    if (searchQuery) result = searchNotifications(searchQuery);
    if (selectedFilter.types?.length)
      result = filterNotifications({ ...selectedFilter, types: selectedFilter.types });
    return result;
  }, [notifications, activeTab, searchQuery, selectedFilter, filterNotifications, searchNotifications]);

  const tabs = [
    { id: 'all'         as const, label: 'All',        icon: <Bell size={14} />,     count: notifications.length },
    { id: 'unread'      as const, label: 'Unread',     icon: <Bell size={14} />,     count: stats.unread },
    { id: 'preferences' as const, label: 'Preferences',icon: <Settings size={14} />, count: undefined },
  ];

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportNotifications(format);
    const filename = `notifications-${Date.now()}.${format}`;
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bell className="text-violet-400" size={22} />
          <div>
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <p className="text-xs text-white/40">Manage your alerts and preferences</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {stats.unread} unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('json')}
            className="btn-premium-ghost flex items-center gap-1.5 text-xs px-2.5 py-1.5">
            <Download size={12} />JSON
          </button>
          <button onClick={() => handleExport('csv')}
            className="btn-premium-ghost flex items-center gap-1.5 text-xs px-2.5 py-1.5">
            <Download size={12} />CSV
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={activeTab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}>
            {t.icon}{t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded-full text-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {(activeTab === 'all' || activeTab === 'unread') ? (
          <motion.div key={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">
            <ErrorBoundary>
              <NotificationStats stats={stats} />
            </ErrorBoundary>

            {/* Search + Filter */}
            <div className="glass-card-premium p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-white/30" />
                  <input type="text" placeholder="Search notifications…" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50" />
                </div>
                <div className="relative">
                  <Filter size={16} className="absolute left-3 top-3 text-white/30" />
                  <select value={selectedFilter.types?.[0] || ''}
                    onChange={e => {
                      if (e.target.value) setSelectedFilter({ types: [e.target.value as NotificationType] });
                      else setSelectedFilter({});
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50">
                    <option value="">All Types</option>
                    {Object.values(NotificationType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.unread > 0 && (
                  <button onClick={markAllAsRead}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-all">
                    <Check size={14} />Mark All as Read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearNotifications}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-all">
                    <Trash2 size={14} />Clear All
                  </button>
                )}
              </div>
            </div>

            <ErrorBoundary>
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={markAsRead}
                onDismiss={dismissNotification}
              />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div key="tab-preferences"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card-premium p-6">
            <ErrorBoundary>
              <NotificationPreferences
                preferences={preferences}
                onUpdatePreference={updatePreference}
                onReset={resetPreferences}
              />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
