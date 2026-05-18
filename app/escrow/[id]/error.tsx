'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function EscrowIdError({
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
      title="Escrow Detail Error"
      message="Something went wrong loading this escrow. The on-chain state is unaffected — retrying re-reads it from the contract."
      loggerScope="EscrowDetail"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
