'use client';

import { AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";

/**
 * Demo Mode Banner Component
 * 
 * Displays a banner when wallet is not connected to encourage connection.
 * Works identically on all networks - no testnet-specific behavior.
 * 
 * @returns Banner component or null if wallet is connected
 */
export function DemoModeBanner() {
  const { address } = useAccount();
  
  // Only show if wallet not connected
  if (address) return null;
  
  return (
    <aside
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 px-4 shadow-lg"
      aria-label="Wallet connection notice"
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        <span>Connect your wallet to access all features</span>
      </div>
    </aside>
  );
}
