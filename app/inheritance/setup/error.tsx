'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function InheritanceSetupError({
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
      title="Inheritance Setup Error"
      message="Something went wrong loading inheritance setup. Retry to fetch your current configuration."
      loggerScope="InheritanceSetup"
      extraContent={
        <p className="text-sm text-emerald-400/90 mt-2">
          Your funds and on-chain state are safe — only the UI failed to load.
        </p>
      }
    />
  );
}
