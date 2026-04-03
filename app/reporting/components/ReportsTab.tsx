'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original reporting page

export function ReportsTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
    {/* Report Type Filter */}
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
    <h3 className="text-white font-semibold mb-3">Filter by Type</h3>
    <div className="flex flex-wrap gap-2">
    <button
    onClick={() => setSelectedReportType(null)}
    className={`px-4 py-2 rounded-lg transition-all ${
    selectedReportType === null
    ? 'bg-blue-600 text-white'
    : 'bg-slate-800 text-slate-400 hover:text-white'
    }`}
    >
    All Reports
    </button>
    {Object.values(ReportType).map((type) => (
    <button
    key={type}
    onClick={() => setSelectedReportType(type)}
    className={`px-4 py-2 rounded-lg transition-all capitalize ${
    selectedReportType === type
    ? 'bg-blue-600 text-white'
    : 'bg-slate-800 text-slate-400 hover:text-white'
    }`}
    >
    {type}
    </button>
    ))}
    </div>
    </div>

    {/* Reports List */}
    <div className="grid grid-cols-1 gap-6">
    {filteredReports.length > 0 ? (
    filteredReports.map((report, idx) => (
    <motion.div
    key={report.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
    >
    <h3 className="text-white text-lg font-semibold mb-2">{report.title}</h3>
    <p className="text-slate-400 text-sm mb-4">{report.description || 'Report'}</p>
    <div className="grid grid-cols-3 gap-4">
    {report.metrics.slice(0, 3).map((metric) => (
    <div key={metric.id} className="bg-slate-800/50 rounded p-3">
    <p className="text-slate-400 text-xs mb-1">{metric.label}</p>
    <p className="text-white font-semibold">{metric.value}</p>
    </div>
    ))}
    </div>
    </motion.div>
    ))
    ) : (
    <div className="text-center py-8 text-slate-400">
    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
    <p>No reports found for this filter</p>
    </div>
    )}
    </div>
  </div>
    </div>
  );
}
