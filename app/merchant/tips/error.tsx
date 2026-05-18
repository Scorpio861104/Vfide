'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantTipsError({
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
      title="Tips Error"
      message="Something went wrong loading tips. Retry to fetch the latest data."
      loggerScope="MerchantTips"
    />
  );
}
