'use client';

/**
 * /inheritance root hub page.
 * Smart redirect: heirs configured or active state -> /inheritance/status.
 * No heirs + IDLE -> /inheritance/setup.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Loader2, Shield } from 'lucide-react';
import { useInheritance } from '@/hooks/useInheritance';

export default function InheritancePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const inh = useInheritance();

  useEffect(() => {
    if (!isConnected || inh.isLoading) return;
    if (inh.heirs.length > 0 || inh.state !== 0) {
      router.replace('/inheritance/status');
    } else {
      router.replace('/inheritance/setup');
    }
  }, [isConnected, inh.isLoading, inh.heirs.length, inh.state, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <Shield size={36} className="text-gray-500" />
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Inheritance</h1>
        <p className="mt-1 text-sm text-gray-400">
          {!isConnected
            ? 'Connect your wallet to manage inheritance.'
            : 'Loading your inheritance configuration…'}
        </p>
      </div>
      {isConnected && (
        <Loader2 className="animate-spin text-gray-500" size={20} />
      )}
    </div>
  );
}
