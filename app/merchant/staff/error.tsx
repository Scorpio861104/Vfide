'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantStaffError({
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
      title="Staff Error"
      message="Something went wrong loading staff access. Retry to fetch the latest state."
      loggerScope="MerchantStaff"
    />
  );
}
