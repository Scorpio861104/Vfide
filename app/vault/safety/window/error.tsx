'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function VaultSafetyWindowError({
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
      title="Safety Window Error"
      message="Something went wrong loading the safety window. Your vault state on-chain is unaffected."
      loggerScope="VaultSafetyWindow"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
