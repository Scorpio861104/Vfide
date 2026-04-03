'use client';

import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportsTabProps {
  reports: any[];
  selectedReportType: string | null;
  onSelectReportType: (type: string | null) => void;
  reportTypes: string[];
}

export function ReportsTab({ reports, selectedReportType, onSelectReportType, reportTypes }: ReportsTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 font-semibold text-white">Filter by Type</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectReportType(null)}
            className={`rounded-lg px-4 py-2 transition-all ${
              selectedReportType === null ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Reports
          </button>
          {reportTypes.map((type) => (
            <button
              key={type}
              onClick={() => onSelectReportType(type)}
              className={`rounded-lg px-4 py-2 capitalize transition-all ${
                selectedReportType === type ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reports.length > 0 ? (
          reports.map((report, index) => (
            <motion.div
              key={report.id ?? `${report.title}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-6"
            >
              <h3 className="mb-2 text-lg font-semibold text-white">{report.title}</h3>
              <p className="mb-4 text-sm text-slate-400">{report.description || 'Report'}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(report.metrics ?? []).slice(0, 3).map((metric: any) => (
                  <div key={metric.id ?? metric.label} className="rounded bg-slate-800/50 p-3">
                    <p className="mb-1 text-xs text-slate-400">{metric.label}</p>
                    <p className="font-semibold text-white">{String(metric.value)}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-8 text-center text-slate-400">
            <BarChart3 className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No reports found for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
