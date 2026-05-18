'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantLoyaltyError({
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
      title="Loyalty Error"
      message="Something went wrong loading the loyalty program. Retry to fetch the latest state."
      loggerScope="MerchantLoyalty"
    />
  );
}
