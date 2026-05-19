'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationHub } from '@/hooks/useNotificationHub';
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { NotificationStats } from '@/components/notifications/NotificationStats';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { NotificationFilter, NotificationType } from '@/config/notification-hub';
import { Bell, Check, Trash2, Download, Search, Filter, Settings } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function NotificationHubPage() {
  const {
    notifications, stats, isLoading: _isLoading,
    filterNotifications, markAsRead, markAllAsRead, dismissNotification,
    clearNotifications, preferences, updatePreference, resetPreferences,
    exportNotifications, searchNotifications,
  } = useNotificationHub();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'preferences'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Partial<NotificationFilter>>({});

  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (activeTab === 'unread') result = result.filter(n => n.status !== 'read');
    if (searchQuery) result = searchNotifications(searchQuery);
    if (selectedFilter.types?.length) result = filterNotifications({ ...selectedFilter, types: selectedFilter.types });
    return result;
  }, [notifications, activeTab, searchQuery, selectedFilter, filterNotifications, searchNotifications]);

  const tabs = [
    { id: 'all' as const, label: 'All', icon: <Bell size={14} />, count: notifications.length },
    { id: 'unread' as const, label: 'Unread', icon: <Bell size={14} />, count: stats.unread },
    { id: 'preferences' as const, label: 'Settings', icon: <Settings size={14} />, count: undefined },
  ];

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportNotifications(format);
    const filename = format === 'json' ? `notifications-${Date.now()}.json` : `notifications-${Date.now()}.csv`;
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="badge-live"><span className="badge-live-dot" />Signal Intelligence</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
                  <Bell size={32} className="text-violet-400" />Notification Command
                </span>
              </h1>
              <p className="text-white/50">Direct signal, filter noise, and export every critical alert.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => handleExport('json')}
                className="btn-premium-ghost flex items-center gap-2 text-sm">
                <Download size={14} />JSON
              </button>
              <button onClick={() => handleExport('csv')}
                className="btn-premium-ghost flex items-center gap-2 text-sm">
                <Download size={14} />CSV
              </button>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/60">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {stats.unread} unread
              </span>
            </div>
          </div>
        </motion.div>

        {/* Sticky tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
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
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {(activeTab === 'all' || activeTab === 'unread') ? (
            <motion.div key={`tab-${activeTab}`}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="space-y-6">
              <ErrorBoundary>
                <NotificationStats stats={stats} />
              </ErrorBoundary>

              {/* Search + Filter */}
              <div className="glass-card-premium p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-white/30" />
                    <input type="text" placeholder="Search notifications..." value={searchQuery}
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
                <NotificationList notifications={filteredNotifications} onMarkAsRead={markAsRead} onDismiss={dismissNotification} />
              </ErrorBoundary>
            </motion.div>
          ) : (
            <motion.div key="tab-preferences"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass-card-premium p-6">
              <ErrorBoundary>
                <NotificationPreferences preferences={preferences} onUpdatePreference={updatePreference} onReset={resetPreferences} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
