'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantBookingsError({
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
      title="Bookings Error"
      message="Something went wrong loading bookings. Retry to fetch the latest data."
      loggerScope="MerchantBookings"
    />
  );
}
