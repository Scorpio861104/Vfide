'use client';

import { m } from 'framer-motion';
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
      <m.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ErrorTracker
          errors={errors}
          onResolveError={onResolveError}
          onClearAll={onClearAll}
          onExport={onExport}
        />
      </m.div>
    </div>
  );
}
