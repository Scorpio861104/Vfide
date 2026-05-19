'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantWholesaleError({
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
      title="Wholesale Error"
      message="Something went wrong loading wholesale data. Retry to fetch the latest state."
      loggerScope="MerchantWholesale"
    />
  );
}
