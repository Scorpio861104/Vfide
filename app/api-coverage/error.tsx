'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function ApiCoverageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      title="API Coverage Error"
      message="Something went wrong while loading API coverage data. Retry to fetch the latest state."
      loggerScope="APICoverage"
    />
  );
}
