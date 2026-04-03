'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BulkPaymentsSection({
  jobs,
  onUpload,
  uploading,
}: {
  jobs: BulkPaymentJob[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  const displayJobs = jobs;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Upload Bulk Payments
        </h2>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            📁 Drop CSV file or click to upload
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={onUpload}
            disabled={uploading}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className={`
            block w-full min-h-12 text-base font-semibold rounded-lg
            transition-all active:scale-95 cursor-pointer text-center
            px-4 py-3 bg-cyan-400 text-zinc-900 hover:bg-cyan-400
            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}>
            {uploading ? '⏳ Uploading...' : '📤 Choose File'}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              CSV format: email, amount, currency, description
          </p>
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Upload History
        </h2>
        <div className="space-y-3">
          {displayJobs.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
              No bulk upload history yet.
            </div>
          ) : null}
          {displayJobs.map((job) => (
            <BulkJobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}
