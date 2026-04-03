'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const {
    notifications,
    groupedNotifications,
    unreadCount,
    preferences,
    setPreferences,
    markAsRead,
    markAllAsRead,
    archive,
    snooze,
    clearArchived,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all');

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'r' && e.metaKey) {
        e.preventDefault();
        markAllAsRead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, markAllAsRead]);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
    }
    return true;
  });

  const _groups = groupedNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-99 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-16 right-4 z-100 w-96 max-h-[80vh] overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bell size={20} className="text-cyan-400" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreferences(p => ({ ...p, sound: !p.sound }))}
                    className={`p-2 rounded-lg transition-colors ${
                      preferences.sound ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'
                    }`}
                    title={preferences.sound ? 'Mute sounds' : 'Enable sounds'}
                  >
                    {preferences.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'settings' ? 'all' : 'settings')}
                    className={`p-2 rounded-lg transition-colors ${
                      activeTab === 'settings' ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-400'
                    }`}
                    title="Settings"
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              {activeTab !== 'settings' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'all' 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'unread' 
                        ? 'bg-white/10 text-white' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Unread
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Mark all read
                  </button>
                </div>
              )}

              {/* Search & Filter */}
              {activeTab !== 'settings' && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notifications..."
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as NotificationCategory | 'all')}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="all">All</option>
                    <option value="transaction">💰 Transactions</option>
                    <option value="governance">🗳️ Governance</option>
                    <option value="merchant">🏪 Merchant</option>
                    <option value="security">🔒 Security</option>
                    <option value="system">⚙️ System</option>
                    <option value="social">👥 Social</option>
                  </select>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[50vh] overflow-y-auto">
              {activeTab === 'settings' ? (
                <NotificationSettings 
                  preferences={preferences} 
                  onUpdate={setPreferences} 
                />
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                    <BellOff size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className="group">
                      <NotificationItem
                        notification={notification}
                        onRead={() => markAsRead(notification.id)}
                        onArchive={() => archive(notification.id)}
                        onSnooze={() => snooze(notification.id)}
                        onAction={() => {
                          if (notification.actionUrl && isAllowedURL(notification.actionUrl)) {
                            window.location.href = notification.actionUrl;
                          }
                        }}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {notifications.length} notifications
              </span>
              <button
                onClick={clearArchived}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Clear archived
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
