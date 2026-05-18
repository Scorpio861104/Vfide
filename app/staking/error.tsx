'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function StakingError({
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
      title="Staking Error"
      message="Something went wrong loading staking data. Your stake on-chain is unaffected."
      loggerScope="Staking"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
