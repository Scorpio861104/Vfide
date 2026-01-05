'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Notification, NotificationStatus, formatTimeAgo, getSeverityColor, getNotificationIcon } from '@/config/notification-hub';
import { Check, X, ChevronRight } from 'lucide-react';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  groupByType?: boolean;
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onDismiss,
  groupByType = false,
}: NotificationListProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  };

  if (notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 text-slate-400"
      >
        <p>No notifications</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {notifications.map((notification) => (
        <motion.div
          key={notification.id}
          variants={itemVariants}
          className={`group relative rounded-lg border p-4 backdrop-blur-sm transition-all hover:shadow-lg ${
            notification.status === NotificationStatus.READ
              ? 'bg-slate-900/30 border-slate-800'
              : 'bg-slate-900/50 border-slate-700'
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{
                  backgroundColor: `${getSeverityColor(notification.severity)}15`,
                  color: getSeverityColor(notification.severity),
                }}
              >
                {notification.icon || getNotificationIcon(notification.type)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-white truncate">
                  {notification.title}
                </h3>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {formatTimeAgo(notification.timestamp)}
                </span>
              </div>

              <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                {notification.message}
              </p>

              {notification.actionUrl && (
                <a
                  href={notification.actionUrl}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {notification.actionLabel || 'View'}
                  <ChevronRight className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {notification.status !== NotificationStatus.READ && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4 text-green-400" />
                </button>
              )}

              <button
                onClick={() => onDismiss(notification.id)}
                className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Unread indicator */}
          {notification.status !== NotificationStatus.READ && (
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
