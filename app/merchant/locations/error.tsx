'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantLocationsError({
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
      title="Locations Error"
      message="Something went wrong loading locations. Retry to fetch the latest data."
      loggerScope="MerchantLocations"
    />
  );
}
