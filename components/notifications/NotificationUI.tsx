'use client';

import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useCallback, useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Bell, 
  BellOff,
  Clock, 
  Archive, 
  ChevronRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Settings,
  Trash2,
  CheckCheck,
  Search
} from 'lucide-react';
import { 
  Notification, 
  NotificationGroup, 
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  useNotifications 
} from '@/hooks/useNotifications';
import { isAllowedURL } from '@/lib/security';

// ==================== CONSTANTS ====================

const TYPE_COLORS: Record<NotificationType, { bg: string; border: string; text: string; icon: string }> = {
  success: { 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/30', 
    text: 'text-emerald-400',
    icon: 'bg-emerald-500'
  },
  error: { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30', 
    text: 'text-red-400',
    icon: 'bg-red-500'
  },
  warning: { 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/30', 
    text: 'text-amber-400',
    icon: 'bg-amber-500'
  },
  info: { 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/30', 
    text: 'text-blue-400',
    icon: 'bg-blue-500'
  },
  transaction: { 
    bg: 'bg-purple-500/10', 
    border: 'border-purple-500/30', 
    text: 'text-purple-400',
    icon: 'bg-purple-500'
  },
};

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-500',
};

const _CATEGORY_ICONS: Record<NotificationCategory, string> = {
  transaction: '💰',
  governance: '🗳️',
  merchant: '🏪',
  security: '🔒',
  system: '⚙️',
  social: '👥',
};

// ==================== HELPERS ====================

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ==================== NOTIFICATION TOAST ====================

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onAction?: () => void;
  onSnooze?: () => void;
}

export function NotificationToast({ 
  notification, 
  onDismiss, 
  onAction,
  onSnooze 
}: NotificationToastProps) {
  const [isDragging, setIsDragging] = useState(false);
  const colors = TYPE_COLORS[notification.type];

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (Math.abs(info.offset.x) > 100) {
      onDismiss();
    }
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: isDragging ? 0 : 300, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className={`
        relative overflow-hidden rounded-xl border ${colors.border} ${colors.bg}
        backdrop-blur-xl shadow-2xl cursor-grab active:cursor-grabbing
        max-w-sm w-full
      `}
    >
      {/* Priority indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${PRIORITY_COLORS[notification.priority]}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center text-xl`}>
            {notification.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-white text-sm leading-tight">
                {notification.title}
              </h4>
              <button
                onClick={onDismiss}
                className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{notification.source}</span>
              <span>•</span>
              <span>{formatTimeAgo(notification.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          {notification.actionUrl && (
            <button
              onClick={onAction}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors"
            >
              {notification.actionLabel || 'View'}
              <ChevronRight size={12} />
            </button>
          )}
          <button
            onClick={onSnooze}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Snooze"
          >
            <Clock size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Dismiss"
          >
            <Check size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
    </motion.div>
  );
}

// ==================== TOAST CONTAINER ====================

interface ToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onAction?: (notification: Notification) => void;
  onSnooze?: (id: string) => void;
  maxVisible?: number;
}

export function ToastContainer({ 
  notifications, 
  onDismiss, 
  onAction,
  onSnooze,
  maxVisible = 3 
}: ToastContainerProps) {
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div className="fixed top-4 right-4 z-200 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onDismiss={() => onDismiss(notification.id)}
              onAction={() => onAction?.(notification)}
              onSnooze={() => onSnooze?.(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ==================== NOTIFICATION ITEM (for dropdown) ====================

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onArchive: () => void;
  onSnooze: () => void;
  onAction?: () => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onRead,
  onArchive,
  onSnooze,
  onAction,
  compact = false,
}: NotificationItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const colors = TYPE_COLORS[notification.type];

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      onArchive();
    } else if (info.offset.x > 80) {
      onRead();
    }
    setSwipeX(0);
  }, [onArchive, onRead]);

  return (
    <motion.div
      className="relative overflow-hidden"
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.3}
      onDrag={(_, info) => setSwipeX(info.offset.x)}
      onDragEnd={handleDragEnd}
    >
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center justify-start pl-4 ${swipeX > 0 ? 'bg-emerald-500/30' : ''}`}>
          {swipeX > 30 && <Check className="text-emerald-400" size={20} />}
        </div>
        <div className={`flex-1 flex items-center justify-end pr-4 ${swipeX < 0 ? 'bg-orange-500/30' : ''}`}>
          {swipeX < -30 && <Archive className="text-orange-400" size={20} />}
        </div>
      </div>

      {/* Content */}
      <motion.div
        style={{ x: swipeX }}
        className={`
          relative ${colors.bg} border-b border-white/5
          ${!notification.read ? 'bg-white/5' : ''}
          hover:bg-white/5 transition-colors cursor-pointer
        `}
        onClick={() => {
          if (!notification.read) onRead();
          onAction?.();
        }}
      >
        <div className={`p-${compact ? '3' : '4'}`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`
              shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg ${colors.icon} 
              flex items-center justify-center ${compact ? 'text-base' : 'text-lg'}
            `}>
              {notification.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`
                    font-medium text-white ${compact ? 'text-xs' : 'text-sm'} leading-tight
                    ${!notification.read ? 'font-semibold' : ''}
                  `}>
                    {notification.title}
                  </h4>
                  <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5 line-clamp-1`}>
                    {notification.message}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="shrink-0 w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                )}
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                  {formatTimeAgo(notification.timestamp)}
                </span>

                {/* Priority badge */}
                <span className={`
                  ${compact ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'}
                  rounded-full ${PRIORITY_COLORS[notification.priority]} text-white font-medium
                `}>
                  {notification.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons (visible on hover) */}
          {!compact && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onRead(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Mark as read"
              >
                <Check size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSnooze(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Snooze"
              >
                <Clock size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Archive"
              >
                <Archive size={12} />
              </button>
              {notification.actionUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAction?.(); }}
                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                  title="Open"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== GROUPED NOTIFICATION ====================

interface GroupedNotificationProps {
  group: NotificationGroup;
  onExpand: () => void;
  onReadAll: () => void;
  onArchiveAll: () => void;
}

export function GroupedNotification({
  group,
  onExpand,
  onReadAll,
  onArchiveAll,
}: GroupedNotificationProps) {
  const first = group.notifications[0];
  
  // Early return if no notifications
  if (!first || group.count === 1) {
    return null; // Use NotificationItem for single items
  }
  
  const colors = TYPE_COLORS[first.type];
  const unreadCount = group.notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        ${colors.bg} border ${colors.border} rounded-xl overflow-hidden
        hover:bg-white/5 transition-colors cursor-pointer
      `}
      onClick={onExpand}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Stacked icons */}
          <div className="relative shrink-0 w-12 h-12">
            {group.notifications.slice(0, 3).map((n, i) => (
              <div
                key={n.id}
                className={`
                  absolute w-8 h-8 rounded-lg ${colors.icon} 
                  flex items-center justify-center text-sm
                  border-2 border-zinc-950
                `}
                style={{
                  top: i * 4,
                  left: i * 4,
                  zIndex: 3 - i,
                }}
              >
                {n.icon}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-white text-sm">
                {group.count} {first.category} notifications
              </h4>
              {unreadCount > 0 && (
                <span className="shrink-0 px-2 py-0.5 bg-cyan-500 rounded-full text-xs font-medium text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {first.title} and {group.count - 1} more
            </p>
            <span className="text-xs text-gray-500 mt-1">
              {formatTimeAgo(group.latestTimestamp)}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors"
          >
            View All
            <ChevronRight size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReadAll(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Mark all as read"
          >
            <CheckCheck size={14} className="text-gray-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onArchiveAll(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Archive all"
          >
            <Archive size={14} className="text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ==================== NOTIFICATION BADGE ====================

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function NotificationBadge({ 
  count, 
  onClick, 
  size = 'md',
  pulse = true 
}: NotificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const badgeSizeClasses = {
    sm: 'w-4 h-4 text-[9px] -top-1 -right-1',
    md: 'w-5 h-5 text-[10px] -top-1 -right-1',
    lg: 'w-6 h-6 text-xs -top-1.5 -right-1.5',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative ${sizeClasses[size]} rounded-xl 
        bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
        flex items-center justify-center transition-all
        focus:outline-none focus:ring-2 focus:ring-cyan-500/50
      `}
    >
      <Bell size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} className="text-gray-400" />
      
      {count > 0 && (
        <>
          <span className={`
            absolute ${badgeSizeClasses[size]} rounded-full 
            bg-gradient-to-r from-cyan-500 to-blue-500 
            flex items-center justify-center font-bold text-white
          `}>
            {count > 99 ? '99+' : count}
          </span>
          
          {/* Pulse animation */}
          {pulse && (
            <span className={`
              absolute ${badgeSizeClasses[size]} rounded-full 
              bg-cyan-500 animate-ping opacity-50
            `} />
          )}
        </>
      )}
    </button>
  );
}

// ==================== NOTIFICATION DROPDOWN ====================

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
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

// ==================== NOTIFICATION SETTINGS ====================

interface NotificationSettingsProps {
  preferences: ReturnType<typeof useNotifications>['preferences'];
  onUpdate: (prefs: ReturnType<typeof useNotifications>['preferences']) => void;
}

function NotificationSettings({ preferences, onUpdate }: NotificationSettingsProps) {
  const categories: { key: NotificationCategory; label: string; icon: string }[] = [
    { key: 'transaction', label: 'Transactions', icon: '💰' },
    { key: 'governance', label: 'Governance', icon: '🗳️' },
    { key: 'merchant', label: 'Merchant', icon: '🏪' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'system', label: 'System', icon: '⚙️' },
    { key: 'social', label: 'Social', icon: '👥' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Global settings */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">General</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Enable notifications</span>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onUpdate({ ...preferences, enabled: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Sound</span>
            <input
              type="checkbox"
              checked={preferences.sound}
              onChange={(e) => onUpdate({ ...preferences, sound: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Desktop notifications</span>
            <input
              type="checkbox"
              checked={preferences.desktop}
              onChange={(e) => onUpdate({ ...preferences, desktop: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Vibrate (mobile)</span>
            <input
              type="checkbox"
              checked={preferences.vibrate}
              onChange={(e) => onUpdate({ ...preferences, vibrate: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
        </div>
      </div>

      {/* Category settings */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map(({ key, label, icon }) => (
            <label key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <span>{icon}</span>
                {label}
              </span>
              <input
                type="checkbox"
                checked={preferences.categories[key]}
                onChange={(e) => onUpdate({
                  ...preferences,
                  categories: { ...preferences.categories, [key]: e.target.checked }
                })}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Quiet Hours</h4>
        <label className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-300">Enable quiet hours</span>
          <input
            type="checkbox"
            checked={preferences.quietHours.enabled}
            onChange={(e) => onUpdate({
              ...preferences,
              quietHours: { ...preferences.quietHours, enabled: e.target.checked }
            })}
            className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
        {preferences.quietHours.enabled && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Start</label>
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => onUpdate({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, start: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => onUpdate({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, end: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Snooze duration */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Snooze Duration</h4>
        <select
          value={preferences.snoozeMinutes}
          onChange={(e) => onUpdate({ ...preferences, snoozeMinutes: Number(e.target.value) })}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
          <option value={480}>8 hours</option>
        </select>
      </div>
    </div>
  );
}

// ==================== COMPACT NAVBAR BADGE ====================

export function NavbarNotificationBell() {
  const { unreadCount, notifications: _notifications, markAsRead: _markAsRead, archive: _archive, snooze: _snooze } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <NotificationBadge
        count={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        pulse={unreadCount > 0}
      />
      <NotificationDropdown 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </div>
  );
}
