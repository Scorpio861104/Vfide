/**
 * NotificationCenter - Enhanced notification system with toasts, sounds, and smart features
 * Features: Swipe actions, grouping, snooze, sound/vibration, quiet hours, keyboard shortcuts
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Bell, 
  BellOff,
  Vote, 
  Gift, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Clock,
  Archive,
  Volume2,
  VolumeX,
  Settings,
  Search,
  ChevronRight,
  Check,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// ==================== TYPES ====================

type NotificationType = 'vote' | 'reward' | 'security' | 'alert' | 'success' | 'transaction' | 'social';
type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  href?: string;
  read: boolean;
  archived?: boolean;
  snoozedUntil?: number;
  priority: NotificationPriority;
  groupKey?: string;
}

interface NotificationPreferences {
  sound: boolean;
  desktop: boolean;
  vibrate: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
  snoozeMinutes: number;
}

// ==================== CONSTANTS ====================

const iconMap: Record<NotificationType, React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>> = {
  vote: Vote,
  reward: Gift,
  security: Shield,
  alert: AlertTriangle,
  success: CheckCircle2,
  transaction: Gift,
  social: Bell,
};

const colorMap: Record<NotificationType, string> = {
  vote: '#9B59B6',
  reward: '#50C878',
  security: '#00F0FF',
  alert: '#FF6B6B',
  success: '#50C878',
  transaction: '#8B5CF6',
  social: '#3B82F6',
};

const priorityColors: Record<NotificationPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-500',
};

const STORAGE_KEY = 'vfide-notif-prefs';

// Initial empty state (notifications will be populated by backend/websocket events)
const initialNotifications: Notification[] = [];

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

function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startH = 0, startM = 0] = prefs.quietHours.start.split(':').map(Number);
  const [endH = 0, endM = 0] = prefs.quietHours.end.split(':').map(Number);
  const startTime = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime < endTime;
  }
  return currentTime >= startTime || currentTime < endTime;
}

// ==================== NOTIFICATION ITEM ====================

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onArchive: () => void;
  onSnooze: () => void;
  onClose: () => void;
}

function NotificationItem({ notification, onRead, onArchive, onSnooze, onClose }: NotificationItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const Icon = iconMap[notification.type];
  const color = colorMap[notification.type];

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
      className="relative overflow-hidden group"
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.3}
      onDrag={(_, info) => setSwipeX(info.offset.x)}
      onDragEnd={handleDragEnd}
    >
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className={`flex-1 flex items-center justify-start pl-4 transition-colors ${swipeX > 30 ? 'bg-emerald-500/20' : ''}`}>
          {swipeX > 30 && <Check className="text-emerald-400" size={20} />}
        </div>
        <div className={`flex-1 flex items-center justify-end pr-4 transition-colors ${swipeX < -30 ? 'bg-orange-500/20' : ''}`}>
          {swipeX < -30 && <Archive className="text-orange-400" size={20} />}
        </div>
      </div>

      {/* Content */}
      <motion.div style={{ x: swipeX }}>
        <div
          className={`relative p-4 border-b border-zinc-700 hover:bg-zinc-700/50 transition-colors ${
            !notification.read ? 'bg-cyan-400/5' : ''
          }`}
        >
          {/* Priority indicator */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColors[notification.priority]}`} />

          <Link
            href={notification.href || '#'}
            onClick={() => {
              onRead();
              onClose();
            }}
            className="flex gap-3 ml-2"
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className={`font-bold text-sm text-zinc-100 ${!notification.read ? 'font-extrabold' : ''}`}>
                  {notification.title}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400">
                    {formatTimeAgo(notification.timestamp)}
                  </span>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                {notification.message}
              </p>
              
              {/* Priority badge */}
              <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full ${priorityColors[notification.priority]} text-white font-medium`}>
                {notification.priority}
              </span>
            </div>
          </Link>
          
          {/* Action buttons (on hover) */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Snooze"
            >
              <Clock size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Archive"
            >
              <Archive size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
              title="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== SETTINGS PANEL ====================

interface SettingsPanelProps {
  prefs: NotificationPreferences;
  onUpdate: (prefs: NotificationPreferences) => void;
}

function SettingsPanel({ prefs, onUpdate }: SettingsPanelProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-100">Sound</span>
          <input
            type="checkbox"
            checked={prefs.sound}
            onChange={(e) => onUpdate({ ...prefs, sound: e.target.checked })}
            className="w-5 h-5 rounded bg-zinc-700 border-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-100">Desktop notifications</span>
          <input
            type="checkbox"
            checked={prefs.desktop}
            onChange={(e) => onUpdate({ ...prefs, desktop: e.target.checked })}
            className="w-5 h-5 rounded bg-zinc-700 border-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-sm text-zinc-100">Vibrate (mobile)</span>
          <input
            type="checkbox"
            checked={prefs.vibrate}
            onChange={(e) => onUpdate({ ...prefs, vibrate: e.target.checked })}
            className="w-5 h-5 rounded bg-zinc-700 border-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
      </div>

      <div className="pt-3 border-t border-zinc-700">
        <label className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-100">Quiet hours</span>
          <input
            type="checkbox"
            checked={prefs.quietHours.enabled}
            onChange={(e) => onUpdate({ 
              ...prefs, 
              quietHours: { ...prefs.quietHours, enabled: e.target.checked }
            })}
            className="w-5 h-5 rounded bg-zinc-700 border-zinc-700 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
        {prefs.quietHours.enabled && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={prefs.quietHours.start}
              onChange={(e) => onUpdate({
                ...prefs,
                quietHours: { ...prefs.quietHours, start: e.target.value }
              })}
              className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-700 rounded text-sm text-white"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="time"
              value={prefs.quietHours.end}
              onChange={(e) => onUpdate({
                ...prefs,
                quietHours: { ...prefs.quietHours, end: e.target.value }
              })}
              className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-700 rounded text-sm text-white"
            />
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-zinc-700">
        <label className="text-sm text-zinc-100 mb-2 block">Snooze duration</label>
        <select
          value={prefs.snoozeMinutes}
          onChange={(e) => onUpdate({ ...prefs, snoozeMinutes: Number(e.target.value) })}
          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
        </select>
      </div>

      <div className="pt-3 border-t border-zinc-700">
        <p className="text-xs text-zinc-400">
          <strong className="text-white">Tip:</strong> Swipe right to mark as read, swipe left to archive.
          Press <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-[10px]">⌘R</kbd> to mark all as read.
        </p>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    sound: true,
    desktop: true,
    vibrate: true,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    snoozeMinutes: 30,
  });

  const { play: playSound } = useTransactionSounds();

  // Load preferences
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
  }, [prefs]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+N to open notifications
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Cmd+R to mark all as read (when open)
      if (isOpen && (e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        markAllRead();
      }
      // Escape to close
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const activeNotifications = notifications.filter(n => !n.archived);

  const filteredNotifications = activeNotifications.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  }).filter(n => !n.snoozedUntil || n.snoozedUntil <= Date.now());

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    if (prefs.sound && !isInQuietHours(prefs)) {
      playSound('click');
    }
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (prefs.sound && !isInQuietHours(prefs)) {
      playSound('success');
    }
  };

  const archive = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, archived: true, read: true } : n)
    );
  };

  const snooze = (id: string) => {
    const snoozeUntil = Date.now() + prefs.snoozeMinutes * 60 * 1000;
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, snoozedUntil: snoozeUntil } : n)
    );
  };

  const clearArchived = () => {
    setNotifications(prev => prev.filter(n => !n.archived));
  };

  return (
    <div className="relative">
      {/* Bell Button with enhanced badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
            {/* Pulse animation */}
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-cyan-500 rounded-full animate-ping opacity-30" />
          </>
        )}
      </button>

      {/* Enhanced Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-md max-h-[80vh] overflow-hidden bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl z-50"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                    <Bell size={18} className="text-cyan-400" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium">
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPrefs(p => ({ ...p, sound: !p.sound }))}
                      className={`p-2 rounded-lg transition-colors ${
                        prefs.sound ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-zinc-400'
                      }`}
                      title={prefs.sound ? 'Mute sounds' : 'Enable sounds'}
                    >
                      {prefs.sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    <button
                      onClick={() => setActiveTab(activeTab === 'settings' ? 'all' : 'settings')}
                      className={`p-2 rounded-lg transition-colors ${
                        activeTab === 'settings' ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-400'
                      }`}
                      title="Settings"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                {activeTab !== 'settings' && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === 'all' 
                            ? 'bg-white/10 text-white' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveTab('unread')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                          activeTab === 'unread' 
                            ? 'bg-white/10 text-white' 
                            : 'text-zinc-400 hover:text-white'
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
                        onClick={markAllRead}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Mark all read
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notifications..."
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-zinc-700 rounded-lg text-sm text-white placeholder-[#A0A0A5] focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="max-h-80 overflow-y-auto">
                {activeTab === 'settings' ? (
                  <SettingsPanel prefs={prefs} onUpdate={setPrefs} />
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                      <BellOff size={24} className="text-zinc-400" />
                    </div>
                    <p className="text-zinc-400 text-sm">
                      {activeTab === 'unread' ? 'All caught up! 🎉' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={() => markAsRead(notification.id)}
                      onArchive={() => archive(notification.id)}
                      onSnooze={() => snooze(notification.id)}
                      onClose={() => setIsOpen(false)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-zinc-700 flex items-center justify-between">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight size={14} />
                </Link>
                <button
                  onClick={clearArchived}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clear archived
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
