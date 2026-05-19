'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantInvoicesError({
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
      title="Invoices Error"
      message="Something went wrong loading invoices. Retry to fetch the latest data."
      loggerScope="MerchantInvoices"
    />
  );
}
