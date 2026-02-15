'use client';

import { formatSecurityEventType } from '@/config/security-advanced';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Trash2, Search, Filter, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface SecurityLogsDashboardProps {
  className?: string;
}

export function SecurityLogsDashboard({ className = '' }: SecurityLogsDashboardProps) {
  const logs = useSecurityLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  const handleExport = () => {
    const data = logs.exportLogs('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playSuccess();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Filters */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-500" />
              Security Logs
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {logs.filteredLogs.length} of {logs.logs.length} events
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="w-4 h-4" /> Export
            </motion.button>
            <motion.button
              onClick={() => {
                logs.clearLogs();
                playError();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                logs.search(e.target.value);
              }}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            onChange={(e) => {
              logs.filterBySeverity((e.target.value || null) as 'info' | 'warning' | 'critical' | null);
              playNotification();
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <motion.button
            onClick={() => {
              logs.clearFilters();
              setSearchQuery('');
              playNotification();
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="w-4 h-4" /> Clear Filters
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Info', count: logs.getLogCount('info'), color: 'blue', icon: Info },
            { label: 'Warnings', count: logs.getLogCount('warning'), color: 'yellow', icon: AlertTriangle },
            { label: 'Critical', count: logs.getLogCount('critical'), color: 'red', icon: AlertCircle }
          ].map((stat, index) => (
            <motion.div 
              key={stat.label}
              className={`p-4 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 rounded-lg`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400 flex items-center gap-2`}>
                <stat.icon className="w-5 h-5" />
                {stat.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Logs List */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="max-h-[37.5rem] overflow-y-auto">
          {logs.filteredLogs.length === 0 ? (
            <motion.div 
              className="p-12 text-center text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-4xl mb-3">📝</div>
              <p>No security logs found</p>
            </motion.div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
              {logs.filteredLogs.map((log, index) => (
                <motion.div 
                  key={log.id} 
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className="flex items-start gap-3">
                    <motion.div 
                      className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                        log.severity === 'critical' ? 'bg-red-500' :
                        log.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatSecurityEventType(log.type)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          log.severity === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {log.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{log.message}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>🕒 {log.timestamp.toLocaleString()}</span>
                        {log.ipAddress && <span>🌐 {log.ipAddress}</span>}
                        {log.location && <span>📍 {log.location}</span>}
                        {log.deviceId && <span>📱 {log.deviceId}</span>}
                      </div>
                      {Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
