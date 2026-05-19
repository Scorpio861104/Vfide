'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantCustomersError({
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
      title="Customers Error"
      message="Something went wrong loading customer data. Retry to fetch the latest state."
      loggerScope="MerchantCustomers"
    />
  );
}
