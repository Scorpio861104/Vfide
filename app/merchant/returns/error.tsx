'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantReturnsError({
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
      title="Returns Error"
      message="Something went wrong loading returns. Retry to fetch the latest data."
      loggerScope="MerchantReturns"
    />
  );
}
