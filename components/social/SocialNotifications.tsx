'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MessageCircle,
  UserPlus,
  DollarSign,
  Award,
  Users,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Notification } from '@/types/socialIntegration';
import { formatAddress as _formatAddress } from '@/lib/messageEncryption';

export function SocialNotifications() {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load notifications
  useEffect(() => {
    if (!address || !isClient || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`vfide_notifications_${address}`);
      if (stored) {
        const notifs: Notification[] = JSON.parse(stored);
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
      setNotifications([]);
    }
  }, [address, isClient]);

  // Save notifications
  useEffect(() => {
    if (!address || notifications.length === 0 || !isClient || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`vfide_notifications_${address}`, JSON.stringify(notifications));
      setUnreadCount(notifications.filter(n => !n.read).length);
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }, [address, notifications, isClient]);

  // Add event listener cleanup for custom events
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;

    const handleCustomNotification = (event: CustomEvent) => {
      const notification = event.detail as Notification;
      setNotifications(prev => [notification, ...prev]);
    };

    window.addEventListener('vfide-notification', handleCustomNotification as EventListener);
    
    return () => {
      window.removeEventListener('vfide-notification', handleCustomNotification as EventListener);
    };
  }, [isClient]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!showNotifications) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showNotifications]);

  const getIcon = (type: Notification['type']) => {
    const iconMap = {
      message: MessageCircle,
      friend_request: UserPlus,
      payment_request: DollarSign,
      payment_received: DollarSign,
      endorsement: Award,
      badge: Award,
      group_invite: Users,
    };
    const IconComponent = iconMap[type];
    return <IconComponent className="w-4 h-4" />;
  };

  const getColor = (type: Notification['type']) => {
    const colorMap = {
      message: '#00F0FF',
      friend_request: '#FFD700',
      payment_request: '#FF8C42',
      payment_received: '#50C878',
      endorsement: '#A78BFA',
      badge: '#FFD700',
      group_invite: '#00F0FF',
    };
    return colorMap[type];
  };

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={showNotifications}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5 text-zinc-100" aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-5 h-5 bg-pink-400 text-zinc-100 text-xs font-bold rounded-full flex items-center justify-center"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed sm:absolute inset-x-4 sm:left-auto sm:right-0 sm:inset-x-auto top-16 sm:top-12 sm:w-96 max-h-[80vh] sm:max-h-[600px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 flex flex-col"
              role="dialog"
              aria-label="Notifications panel"
              aria-modal="false"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-zinc-500">{unreadCount} unread</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-pink-400 hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#2A2A2F]">
                    {notifications
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((notif) => {
                        const color = getColor(notif.type);
                        return (
                          <div
                            key={notif.id}
                            className={`p-4 hover:bg-zinc-800 transition-colors ${
                              !notif.read ? 'bg-cyan-400/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${color}20` }}
                              >
                                <div style={{ color }}>{getIcon(notif.type)}</div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-zinc-100 text-sm">
                                    {notif.title}
                                  </h4>
                                  {!notif.read && (
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-400 mb-2">
                                  {notif.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-zinc-500">
                                    {new Date(notif.timestamp).toLocaleString()}
                                  </p>
                                  <div className="flex gap-2">
                                    {!notif.read && (
                                      <button
                                        onClick={() => markAsRead(notif.id)}
                                        className="text-xs text-cyan-400 hover:underline"
                                      >
                                        Mark read
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteNotification(notif.id)}
                                      className="text-xs text-pink-400 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper function to add notifications
export function addNotification(address: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(`vfide_notifications_${address}`);
    const notifications: Notification[] = stored ? JSON.parse(stored) : [];
    
    const newNotif: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    
    notifications.unshift(newNotif);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
      notifications.splice(50);
    }
    
    localStorage.setItem(`vfide_notifications_${address}`, JSON.stringify(notifications));
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('vfide-notification', { detail: newNotif }));
  } catch (error) {
    console.error('Failed to add notification:', error);
  }
}
