'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantProfileEditError({
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
      title="Profile Error"
      message="Something went wrong loading your profile editor. Retry to fetch the latest data."
      loggerScope="MerchantProfile"
    />
  );
}
