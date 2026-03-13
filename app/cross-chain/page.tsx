'use client';

import CrossChainTransfer from '@/components/CrossChainTransfer';

export default function CrossChainPage() {
  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
      <h1 className="sr-only">Cross-Chain Transfer</h1>
      <CrossChainTransfer />
    </div>
  );
}
