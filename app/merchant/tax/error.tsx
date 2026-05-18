'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantTaxError({
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
      title="Tax Error"
      message="Something went wrong loading tax data. Retry to fetch the latest state."
      loggerScope="MerchantTax"
    />
  );
}
