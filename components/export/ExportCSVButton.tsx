/**
 * ExportCSVButton — Drop-in export button
 * 
 * Usage:
 *   <ExportCSVButton
 *     filename="transactions"
 *     headers={['Date', 'Amount', 'Status']}
 *     rows={data.map(d => [d.date, d.amount, d.status])}
 *   />
 */
'use client';

import { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { exportCSV } from './csv-export';

interface ExportCSVButtonProps {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
  className?: string;
}

export function ExportCSVButton({
  filename, headers, rows,
  label = 'Export CSV',
  className = '',
}: ExportCSVButtonProps) {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    exportCSV({ filename, headers, rows });
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className={`flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:border-cyan-500/30 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {exported ? (
        <><Check size={16} className="text-emerald-400" /> Exported!</>
      ) : (
        <><Download size={16} /> {label} ({rows.length})</>
      )}
    </button>
  );
}
