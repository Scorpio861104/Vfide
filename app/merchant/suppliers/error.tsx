'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantSuppliersError({
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
      title="Suppliers Error"
      message="Something went wrong loading suppliers. Retry to fetch the latest data."
      loggerScope="MerchantSuppliers"
    />
  );
}
