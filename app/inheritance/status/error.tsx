'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function InheritanceStatusError({
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
      title="Inheritance Status Error"
      message="Something went wrong loading inheritance status. Your vault state on-chain is unaffected."
      loggerScope="InheritanceStatus"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
