'use client';

import { motion } from 'framer-motion';
import { UserAnalytics } from '@/config/performance-dashboard';
import { Users, TrendingUp, Eye, Clock, LogOut, Target } from 'lucide-react';

interface UserAnalyticsDashboardProps {
  analytics: UserAnalytics;
}

export function UserAnalyticsDashboard({ analytics }: UserAnalyticsDashboardProps) {
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

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={itemVariants}
          className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-blue-400">
                {analytics.totalUsers.toLocaleString()}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-green-500/10 border border-green-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active Users (30m)</p>
              <p className="text-3xl font-bold text-green-400">
                {analytics.activeUsers.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Sessions Today</p>
              <p className="text-3xl font-bold text-purple-400">
                {analytics.sessionsToday.toLocaleString()}
              </p>
            </div>
            <Eye className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Avg Session Duration</p>
              <p className="text-3xl font-bold text-cyan-400">
                {(analytics.averageSessionDuration / 60000).toFixed(1)}
              </p>
              <p className="text-xs text-slate-400">minutes</p>
            </div>
            <Clock className="w-8 h-8 text-cyan-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Bounce Rate</p>
              <p className="text-3xl font-bold text-yellow-400">
                {analytics.bounceRate.toFixed(1)}%
              </p>
            </div>
            <LogOut className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-orange-400">
                {analytics.conversionRate.toFixed(2)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-orange-400 opacity-50" />
          </div>
        </motion.div>
      </motion.div>

      {/* Top Pages */}
      {analytics.topPages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
          <div className="space-y-3">
            {analytics.topPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <div>
                  <p className="text-sm font-medium text-white">{page.page}</p>
                  <p className="text-xs text-slate-400">
                    {page.duration.toFixed(0)}ms avg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-cyan-400">
                    {page.views} views
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Events */}
      {analytics.topEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Top Events</h3>
          <div className="space-y-3">
            {analytics.topEvents.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <p className="text-sm font-medium text-white">{event.eventName}</p>
                <p className="text-sm font-bold text-green-400">
                  {event.count.toLocaleString()} events
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
