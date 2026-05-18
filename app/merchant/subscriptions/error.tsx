'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantSubscriptionsError({
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
      title="Subscriptions Error"
      message="Something went wrong loading subscriptions. Retry to fetch the latest state."
      loggerScope="MerchantSubscriptions"
    />
  );
}
