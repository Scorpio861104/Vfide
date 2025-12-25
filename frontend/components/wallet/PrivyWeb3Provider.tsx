"use client";

import dynamic from 'next/dynamic';
import { ReactNode, useState, useEffect } from 'react';

// Dynamically import Privy to avoid SSR issues
const PrivyProviderDynamic = dynamic(
  () => import('./PrivyProviderInner').then(mod => mod.PrivyProviderInner),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }
);

interface Props {
  children: ReactNode;
}

export function PrivyWeb3Provider({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading VFIDE...</p>
        </div>
      </div>
    );
  }

  return <PrivyProviderDynamic>{children}</PrivyProviderDynamic>;
}
