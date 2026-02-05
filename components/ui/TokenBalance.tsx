'use client';

import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { Skeleton } from './Skeleton';
import { VFIDETokenABI } from '@/lib/abis';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS as `0x${string}`;

interface TokenBalanceProps {
  className?: string;
  showNative?: boolean;
  showToken?: boolean;
}

/**
 * Displays user's ETH and VFIDE token balances
 */
export function TokenBalance({ 
  className = '', 
  showNative = true,
  showToken = true 
}: TokenBalanceProps) {
  const { address, isConnected } = useAccount();

  // Native ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
  });

  // VFIDE token balance
  const { data: tokenBalance, isLoading: tokenLoading } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!TOKEN_ADDRESS && TOKEN_ADDRESS !== '0x',
    },
  });

  if (!isConnected) return null;

  const isLoading = ethLoading || tokenLoading;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton width={80} height={20} rounded="full" />
      </div>
    );
  }

  const formattedEth = ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000';
  const formattedToken = tokenBalance ? parseFloat(formatUnits(tokenBalance as bigint, 18)).toFixed(2) : '0.00';

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {showNative && (
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full">
          <span className="text-zinc-400">Ξ</span>
          <span className="text-zinc-100 font-medium">{formattedEth}</span>
        </div>
      )}
      {showToken && TOKEN_ADDRESS && TOKEN_ADDRESS !== '0x' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 border border-cyan-400/30 rounded-full">
          <span className="text-cyan-400">V</span>
          <span className="text-zinc-100 font-medium">{formattedToken}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact balance display for navbar
 */
export function NavbarBalance() {
  const { isConnected } = useAccount();
  
  if (!isConnected) return null;

  return (
    <TokenBalance 
      className="hidden lg:flex" 
      showNative={true}
      showToken={true}
    />
  );
}
