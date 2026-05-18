'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantInstallmentsError({
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
      title="Installments Error"
      message="Something went wrong loading installments. Retry to fetch the latest data."
      loggerScope="MerchantInstallments"
    />
  );
}
