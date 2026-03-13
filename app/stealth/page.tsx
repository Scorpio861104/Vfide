'use client';

import StealthAddressUI from '@/components/StealthAddressUI';

export default function StealthPage() {
  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
      <h1 className="sr-only">Stealth Address</h1>
      <StealthAddressUI />
    </div>
  );
}
