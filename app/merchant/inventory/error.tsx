'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantInventoryError({
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
      title="Inventory Error"
      message="Something went wrong loading inventory. Retry to fetch the latest data."
      loggerScope="MerchantInventory"
    />
  );
}
