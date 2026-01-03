"use client";

import { useAccount } from "wagmi";
import { AlertCircle, Info } from "lucide-react";

export function DemoModeBanner() {
  const { address, chain } = useAccount();
  
  // Show banner if wallet not connected OR if on testnet
  const isTestnet = chain?.testnet ?? false;
  const showBanner = !address || isTestnet;
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#FFA500] to-[#FF4444] text-white py-2 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        <span>
          {!address && "DEMO MODE - Connect wallet to see real data"}
          {address && isTestnet && (
            <>
              TESTNET MODE - Connected to {chain?.name || 'testnet'}
              <span className="mx-2 opacity-75">|</span>
              <Info className="w-3.5 h-3.5 inline" />
              <span className="ml-1 opacity-90">Gas estimates may appear high - mainnet costs are ~$0.01</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
