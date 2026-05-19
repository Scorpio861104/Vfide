'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantPaymentLinksError({
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
      title="Payment Links Error"
      message="Something went wrong loading payment links. Retry to fetch the latest data."
      loggerScope="MerchantPaymentLinks"
    />
  );
}
