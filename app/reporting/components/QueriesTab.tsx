'use client';

import { Settings } from 'lucide-react';

export function QueriesTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 py-12 text-center">
        <Settings className="mx-auto mb-3 h-12 w-12 text-slate-400" />
        <h3 className="mb-2 font-semibold text-white">Query Builder</h3>
        <p className="text-sm text-slate-400">Visual query interface for advanced data analysis.</p>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Create Custom Query
        </button>
      </div>
    </div>
  );
}
