import React, { useState } from 'react';

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  includeHeaders?: boolean;
  dateFormat?: string;
  compression?: boolean;
}

interface DataExportProps {
  data: any[];
  filename?: string;
  onExport?: (data: any[], options: ExportOptions) => void;
  className?: string;
}

export function DataExport({
  data,
  filename = 'export',
  onExport,
  className = ''
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeHeaders: true,
    dateFormat: 'ISO',
    compression: false
  });

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    if (options.includeHeaders) {
      csvRows.push(headers.join(','));
    }

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + value).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const convertToJSON = (data: any[]): string => {
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
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Export Data
        </h3>

        {/* Format selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['csv', 'json', 'pdf', 'excel'] as const).map(format => (
                <button
                  key={format}
                  onClick={() => setOptions({ ...options, format })}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    options.format === format
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
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
                  onChange={(e) => setOptions({ ...options, includeHeaders: e.target.checked })}
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
              onChange={(e) => setOptions({ ...options, dateFormat: e.target.value })}
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
                onChange={(e) => setOptions({ ...options, compression: e.target.checked })}
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
        <button
          onClick={handleExport}
          disabled={isExporting || data.length === 0}
          className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </>
          )}
        </button>
      </div>
    </div>
  );
};
