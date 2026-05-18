'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantGiftCardsError({
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
      title="Gift Cards Error"
      message="Something went wrong loading gift cards. Retry to fetch the latest state."
      loggerScope="MerchantGiftCards"
    />
  );
}
