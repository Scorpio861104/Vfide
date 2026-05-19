'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function VaultRecoverStatusError({
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
      title="Recovery Status Error"
      message="Something went wrong loading recovery status. The on-chain claim state is unaffected."
      loggerScope="VaultRecoveryStatus"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
