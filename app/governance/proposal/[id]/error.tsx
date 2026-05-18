'use client';

import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';

export default function GovernanceProposalIdError({
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
      title="Proposal Error"
      message="Something went wrong loading this proposal. Retry to fetch the latest data."
      loggerScope="GovernanceProposal"
    />
  );
}
