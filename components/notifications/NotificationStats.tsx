'use client';

import { motion } from 'framer-motion';
import type { NotificationStats } from '@/config/notification-hub';
import { NotificationType } from '@/config/notification-hub';
import { Bell, AlertCircle, TrendingUp } from 'lucide-react';

interface NotificationStatsProps {
  stats: NotificationStats;
}

export function NotificationStats({ stats }: NotificationStatsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const typeColors: Record<NotificationType, string> = {
    [NotificationType.TRANSACTION]: 'bg-green-500/10 text-green-400 border-green-500/20',
    [NotificationType.SECURITY]: 'bg-red-500/10 text-red-400 border-red-500/20',
    [NotificationType.GOVERNANCE]: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    [NotificationType.REWARD]: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    [NotificationType.ALERT]: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    [NotificationType.SYSTEM]: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    [NotificationType.SOCIAL]: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    [NotificationType.MARKET]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Total */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Total Notifications</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <Bell className="w-8 h-8 text-blue-400 opacity-50" />
        </div>
      </motion.div>

      {/* Unread */}
      <motion.div
        variants={itemVariants}
        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400 mb-1">Unread</p>
            <p className="text-3xl font-bold text-white">{stats.unread}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-blue-400 opacity-50" />
        </div>
      </motion.div>

      {/* Delivery Failures */}
      <motion.div
        variants={itemVariants}
        className={`rounded-lg p-6 border ${
          stats.deliveryFailures > 0
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-slate-900/50 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`text-sm mb-1 ${
                stats.deliveryFailures > 0
                  ? 'text-red-400'
                  : 'text-slate-400'
              }`}
            >
              Failed Deliveries
            </p>
            <p className="text-3xl font-bold text-white">
              {stats.deliveryFailures}
            </p>
          </div>
          <TrendingUp className={`w-8 h-8 opacity-50 ${
            stats.deliveryFailures > 0 ? 'text-red-400' : 'text-slate-400'
          }`} />
        </div>
      </motion.div>

      {/* Top Type */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
      >
        <p className="text-sm text-slate-400 mb-3">Top Notification Type</p>
        <div className="space-y-2">
          {Object.entries(stats.byType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([type, count]) => (
              <div key={type} className="flex justify-between items-center text-sm">
                <span className="text-slate-300 capitalize">{type}</span>
                <span className="font-bold text-white">{count}</span>
              </div>
            ))}
        </div>
      </motion.div>

      {/* Type Breakdown */}
      {Object.entries(stats.byType).map(([type, count]) => (
        count > 0 && (
          <motion.div
            key={`breakdown-${type}`}
            variants={itemVariants}
            className={`rounded-lg p-4 border ${typeColors[type as NotificationType]}`}
          >
            <p className="text-sm font-medium mb-1 capitalize">{type}</p>
            <p className="text-2xl font-bold">{count}</p>
          </motion.div>
        )
      ))}
    </motion.div>
  );
}
