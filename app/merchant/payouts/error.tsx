'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function MerchantPayoutsError({
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
      title="Payouts Error"
      message="Something went wrong loading payouts. On-chain payout state is unaffected."
      loggerScope="MerchantPayouts"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
