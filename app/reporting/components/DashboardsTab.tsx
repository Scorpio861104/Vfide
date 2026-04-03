'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original reporting page

export function DashboardsTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
    {dashboards.length > 0 ? (
    dashboards.map((dashboard, idx) => (
    <motion.div
    key={dashboard.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.1 }}
    className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
    >
    <h3 className="text-white text-xl font-semibold mb-2">{dashboard.name}</h3>
    <p className="text-slate-400 text-sm mb-4">{dashboard.description}</p>
    <p className="text-slate-500 text-xs">
    {dashboard.reports.length} report(s)
    </p>
    </motion.div>
    ))
    ) : (
    <div className="text-center py-8 text-slate-400">
    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
    <p>No dashboards created yet</p>
    </div>
    )}
  </div>
    </div>
  );
}
