'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function PayLinkIdError({
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
      title="Payment Link Error"
      message="Something went wrong loading this payment link. The link itself is on-chain and unaffected."
      loggerScope="PaymentLink"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
