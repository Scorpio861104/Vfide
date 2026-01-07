'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MessageCircle,
  UserPlus,
  DollarSign,
  Award,
  Users,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Notification } from '@/types/socialIntegration';
import { formatAddress } from '@/lib/messageEncryption';

export function NotificationCenter() {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications
  useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`vfide_notifications_${address}`);
    if (stored) {
      try {
        const notifs: Notification[] = JSON.parse(stored);
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      }
    }
  }, [address]);

  // Save notifications
  useEffect(() => {
    if (!address || notifications.length === 0) return;
    localStorage.setItem(`vfide_notifications_${address}`, JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [address, notifications]);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

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
        className="relative p-2 hover:bg-[#2A2A3F] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-[#F5F3E8]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B9D] text-[#F5F3E8] text-xs font-bold rounded-full flex items-center justify-center">
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
              className="absolute right-0 top-12 w-96 max-h-[600px] bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-[#2A2A2F] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#F5F3E8]">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-[#6B6B78]">{unreadCount} unread</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-[#00F0FF] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-[#FF6B9D] hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#6B6B78]">
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
                            className={`p-4 hover:bg-[#2A2A3F] transition-colors ${
                              !notif.read ? 'bg-[#00F0FF]/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${color}20` }}
                              >
                                <div style={{ color }}>{getIcon(notif.type)}</div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className="font-semibold text-[#F5F3E8] text-sm">
                                    {notif.title}
                                  </h4>
                                  {!notif.read && (
                                    <div className="w-2 h-2 bg-[#00F0FF] rounded-full flex-shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className="text-sm text-[#A0A0A5] mb-2">
                                  {notif.message}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-[#6B6B78]">
                                    {new Date(notif.timestamp).toLocaleString()}
                                  </p>
                                  <div className="flex gap-2">
                                    {!notif.read && (
                                      <button
                                        onClick={() => markAsRead(notif.id)}
                                        className="text-xs text-[#00F0FF] hover:underline"
                                      >
                                        Mark read
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteNotification(notif.id)}
                                      className="text-xs text-[#FF6B9D] hover:underline"
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
}
