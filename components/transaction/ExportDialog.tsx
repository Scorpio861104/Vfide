'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Filter,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';

// ==================== TYPES ====================

export type ExportFormat = 'csv' | 'json' | 'pdf';
export type TransactionType = 'send' | 'receive' | 'swap' | 'approve' | 'all';
export type DateRangePreset = 'last30' | 'last90' | 'last365' | 'ytd' | 'all' | 'custom';
export type TaxFormat = 'basic' | 'turbotax' | 'cointracker' | 'koinly';

export interface ExportOptions {
  format: ExportFormat;
  dateRange: {
    preset: DateRangePreset;
    start: Date;
    end: Date;
  };
  filters: {
    types: TransactionType[];
    tokens: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  includeMetadata: boolean;
  includeFees: boolean;
  includeUsdValue: boolean;
  taxFormat?: TaxFormat;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

// ==================== UTILITIES ====================

function getDateRangeFromPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case 'last30':
      start.setDate(start.getDate() - 30);
      break;
    case 'last90':
      start.setDate(start.getDate() - 90);
      break;
    case 'last365':
      start.setDate(start.getDate() - 365);
      break;
    case 'ytd':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'all':
      start.setFullYear(2015, 0, 1); // Before Ethereum mainnet launch
      break;
    default:
      break;
  }

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// ==================== COMPONENT ====================

export function ExportDialog({ isOpen, onClose, userId }: ExportDialogProps) {
  const { address } = useAccount();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: {
      preset: 'last90',
      ...getDateRangeFromPreset('last90'),
    },
    filters: {
      types: ['all'],
      tokens: [],
    },
    includeMetadata: true,
    includeFees: true,
    includeUsdValue: true,
    taxFormat: undefined,
  });

  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    setOptions((prev) => ({
      ...prev,
      dateRange: {
        preset,
        ...range,
      },
    }));
  }, []);

  const handleExport = useCallback(async () => {
    if (!address && !userId) {
      setErrorMessage('Please connect your wallet to export transactions');
      setExportStatus('error');
      return;
    }

    setIsExporting(true);
    setExportStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/transactions/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address || userId,
          options: {
            ...options,
            dateRange: {
              start: options.dateRange.start.toISOString(),
              end: options.dateRange.end.toISOString(),
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get the blob and download
      const blob = await response.blob();
      const filename = `transactions-${formatDate(new Date())}.${options.format}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus('success');
      
      // Close dialog after success
      setTimeout(() => {
        onClose();
        setExportStatus('idle');
      }, 2000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  }, [address, userId, options, onClose]);

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileSpreadsheet className="w-5 h-5" />,
    json: <FileJson className="w-5 h-5" />,
    pdf: <FileText className="w-5 h-5" />,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Download className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Export Transactions</h2>
                <p className="text-sm text-gray-400">Download your transaction history</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['csv', 'json', 'pdf'] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    onClick={() => setOptions((prev) => ({ ...prev, format }))}
                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                      options.format === format
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                        : 'bg-zinc-800/50 border-zinc-700 text-gray-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {formatIcons[format]}
                    <span className="text-sm font-medium uppercase">{format}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'last30', label: '30 Days' },
                  { value: 'last90', label: '90 Days' },
                  { value: 'last365', label: '1 Year' },
                  { value: 'ytd', label: 'YTD' },
                  { value: 'all', label: 'All Time' },
                  { value: 'custom', label: 'Custom' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handlePresetChange(value as DateRangePreset)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      options.dateRange.preset === value
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                        : 'bg-zinc-800/50 border-zinc-700 text-gray-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Custom Date Range */}
              {options.dateRange.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={formatDate(options.dateRange.start)}
                      onChange={(e) => 
                        setOptions((prev) => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            start: new Date(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={formatDate(options.dateRange.end)}
                      onChange={(e) => 
                        setOptions((prev) => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            end: new Date(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Types Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Transaction Types
              </label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'send', 'receive', 'swap', 'approve'] as TransactionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (type === 'all') {
                        setOptions((prev) => ({
                          ...prev,
                          filters: { ...prev.filters, types: ['all'] },
                        }));
                      } else {
                        setOptions((prev) => {
                          const types = prev.filters.types.filter((t) => t !== 'all');
                          const hasType = types.includes(type);
                          return {
                            ...prev,
                            filters: {
                              ...prev.filters,
                              types: hasType
                                ? types.filter((t) => t !== type)
                                : [...types, type],
                            },
                          };
                        });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      options.filters.types.includes(type) ||
                      (type !== 'all' && options.filters.types.includes('all'))
                        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                        : 'bg-zinc-800/50 border-zinc-700 text-gray-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Include</label>
              <div className="space-y-2">
                {[
                  { key: 'includeMetadata', label: 'Transaction Metadata' },
                  { key: 'includeFees', label: 'Gas Fees' },
                  { key: 'includeUsdValue', label: 'USD Values' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[key as keyof ExportOptions] as boolean}
                      onChange={(e) => 
                        setOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tax Format (for CSV/PDF) */}
            {(options.format === 'csv' || options.format === 'pdf') && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Tax Software Format (Optional)</label>
                <select
                  value={options.taxFormat || ''}
                  onChange={(e) => 
                    setOptions((prev) => ({
                      ...prev,
                      taxFormat: e.target.value as TaxFormat | undefined,
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Standard Format</option>
                  <option value="turbotax">TurboTax</option>
                  <option value="cointracker">CoinTracker</option>
                  <option value="koinly">Koinly</option>
                </select>
              </div>
            )}

            {/* Status Messages */}
            {exportStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-400">{errorMessage}</span>
              </div>
            )}

            {exportStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-400">Export completed successfully!</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ExportDialog;
