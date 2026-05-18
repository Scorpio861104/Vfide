'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantCouponsError({
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
      title="Coupons Error"
      message="Something went wrong loading coupons. Retry to fetch the latest data."
      loggerScope="MerchantCoupons"
    />
  );
}
