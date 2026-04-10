import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  includeHeaders?: boolean;
  dateFormat?: string;
  compression?: boolean;
}

interface DataExportProps<T = Record<string, unknown>> {
  data: T[];
  filename?: string;
  onExport?: (data: T[], options: ExportOptions) => void;
  className?: string;
}

export function DataExport<T = Record<string, unknown>>({
  data,
  filename = 'export',
  onExport,
  className = ''
}: DataExportProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    dateFormat: 'ISO',
    compression: false
  });
  const { playSuccess, playNotification } = useTransactionSounds();

  const convertToCSV = (data: T[]): string => {
    if (data.length === 0) return '';

    const firstRow = data[0];
    if (!firstRow) return '';
    
    const headers = Object.keys(firstRow as object);
    const csvRows = [];

    if (options.includeHeaders) {
      csvRows.push(headers.join(','));
    }

    for (const row of data) {
      const values = headers.map(header => {
        const value = (row as Record<string, unknown>)[header];
        const escaped = ('' + value).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const convertToJSON = (data: T[]): string => {
    return JSON.stringify(data, null, 2);
  };

  const downloadFile = (content: string, mimeType: string, extension: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      if (onExport) {
        onExport(data, options);
      } else {
        // Default export behavior
        let content = '';
        let mimeType = '';
        let extension = '';

        switch (options.format) {
          case 'csv':
            content = convertToCSV(data);
            mimeType = 'text/csv';
            extension = 'csv';
            break;
          case 'json':
            content = convertToJSON(data);
            mimeType = 'application/json';
            extension = 'json';
            break;
          default:
            throw new Error(`Format ${options.format} not supported for default export`);
        }

        downloadFile(content, mimeType, extension);
      }
      
      setShowSuccess(true);
      playSuccess();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          Export Data
        </h3>

        {/* Format selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['csv', 'json', 'pdf', 'excel'] as const).map((format, index) => (
                <motion.button
                  key={format}
                  onClick={() => {
                    setOptions({ ...options, format });
                    playNotification();
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    options.format === format
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {format.toUpperCase()}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Options based on format */}
          {(options.format === 'csv' || options.format === 'excel') && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeHeaders}
                  onChange={(e) =>  setOptions({ ...options, includeHeaders: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Include headers
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Format
            </label>
            <select
              value={options.dateFormat}
              onChange={(e) =>  setOptions({ ...options, dateFormat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="ISO">ISO 8601 (2024-01-04T12:00:00Z)</option>
              <option value="US">US Format (01/04/2024)</option>
              <option value="EU">EU Format (04/01/2024)</option>
              <option value="timestamp">Unix Timestamp</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.compression}
                onChange={(e) =>  setOptions({ ...options, compression: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Compress output (ZIP)
              </span>
            </label>
          </div>
        </div>

        {/* Export info */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>{data.length.toLocaleString()}</strong> records will be exported
          </p>
        </div>

        {/* Export button */}
        <motion.button
          onClick={handleExport}
          disabled={isExporting || data.length === 0}
          className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          whileHover={{ scale: data.length > 0 && !isExporting ? 1.02 : 1 }}
          whileTap={{ scale: data.length > 0 && !isExporting ? 0.98 : 1 }}
        >
          {isExporting ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export Data
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Export Error */}
      <AnimatePresence>
        {exportError && (
          <motion.div
            className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
          >
            {exportError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
          >
            <CheckCircle2 className="w-5 h-5" />
            Export Complete!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
