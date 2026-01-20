'use client';

import { motion } from 'framer-motion';
import { ErrorLog, ErrorCategory, getErrorCategoryLabel } from '@/config/performance-dashboard';
import { Trash2, Download, Filter, X } from 'lucide-react';
import { useState, useMemo } from 'react';

interface ErrorTrackerProps {
  errors: ErrorLog[];
  onResolveError: (errorId: string) => void;
  onClearAll: () => void;
  onExport: (format: 'json' | 'csv') => void;
}

export function ErrorTracker({
  errors,
  onResolveError,
  onClearAll,
  onExport,
}: ErrorTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const filteredErrors = useMemo(() => {
    return errors.filter((error) => {
      const categoryMatch = selectedCategory === 'all' || error.category === selectedCategory;
      const severityMatch = selectedSeverity === 'all' || error.severity === selectedSeverity;
      return categoryMatch && severityMatch && !error.resolved;
    });
  }, [errors, selectedCategory, selectedSeverity]);

  const stats = {
    total: errors.filter((e) => !e.resolved).length,
    critical: errors.filter((e) => !e.resolved && e.severity === 'high').length,
    warning: errors.filter((e) => !e.resolved && e.severity === 'medium').length,
    info: errors.filter((e) => !e.resolved && e.severity === 'low').length,
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const toggleExpanded = (errorId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedErrors(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800 rounded-lg p-4"
        >
          <div className="text-xs text-slate-400 mb-2">Total Errors</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
        >
          <div className="text-xs text-red-400 mb-2">Critical</div>
          <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4"
        >
          <div className="text-xs text-yellow-400 mb-2">Warning</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.warning}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
        >
          <div className="text-xs text-blue-400 mb-2">Info</div>
          <div className="text-2xl font-bold text-blue-400">{stats.info}</div>
        </motion.div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400" />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as ErrorCategory | 'all')}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.values(ErrorCategory).map((cat) => (
            <option key={cat} value={cat}>
              {getErrorCategoryLabel(cat)}
            </option>
          ))}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value as 'all' | 'low' | 'medium' | 'high')}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={() => onExport('json')}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          JSON
        </button>

        <button
          onClick={() => onExport('csv')}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>

        <button
          onClick={onClearAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {filteredErrors.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-400"
          >
            <p>No errors found</p>
          </motion.div>
        ) : (
          filteredErrors.map((error) => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-lg border p-4 backdrop-blur-sm cursor-pointer transition-all hover:shadow-lg ${getSeverityBg(
                error.severity
              )}`}
              onClick={() => toggleExpanded(error.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${getSeverityColor(
                        error.severity
                      )}`}
                    >
                      {error.severity}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getErrorCategoryLabel(error.category)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">
                    {error.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(error.timestamp).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolveError(error.id);
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs text-white transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                  Resolve
                </button>
              </div>

              {/* Expanded Details */}
              {expandedErrors.has(error.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-xs text-slate-300"
                >
                  <div>
                    <span className="text-slate-400">URL:</span> {error.url}
                  </div>
                  <div>
                    <span className="text-slate-400">User Agent:</span>{' '}
                    {error.userAgent.substring(0, 60)}...
                  </div>
                  {error.stackTrace && (
                    <div>
                      <span className="text-slate-400 block mb-1">Stack Trace:</span>
                      <pre className="bg-slate-800/50 p-2 rounded overflow-auto text-slate-300">
                        {error.stackTrace.substring(0, 500)}
                      </pre>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
