'use client';

import { motion } from 'framer-motion';
import { ErrorTracker } from '@/components/performance/ErrorTracker';

interface ErrorsTabProps {
  errors: any[];
  onResolveError: (errorId: string) => void;
  onClearAll: () => void;
  onExport: (format: 'json' | 'csv') => void;
}

export function ErrorsTab({ errors, onResolveError, onClearAll, onExport }: ErrorsTabProps) {
  return (
    <div className="space-y-6">
      <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ErrorTracker
          errors={errors}
          onResolveError={onResolveError}
          onClearAll={onClearAll}
          onExport={onExport}
        />
      </motion.div>
    </div>
  );
}
