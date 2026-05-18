'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantExpensesError({
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
      title="Expenses Error"
      message="Something went wrong loading expenses. Retry to fetch the latest data."
      loggerScope="MerchantExpenses"
    />
  );
}
