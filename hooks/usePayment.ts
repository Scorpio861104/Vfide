'use client';

import { useCallback, useState } from 'react';
import { formatEther, encodeFunctionData } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { VFIDETokenABI, BurnRouterABI, UserVaultABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';

export type PaymentStatus = 'idle' | 'sending' | 'confirming' | 'complete' | 'error';

export interface PaymentResult {
  txHash: string;
  blockNumber: number;
  feeAmount: string;
  netAmount: string;
}

interface UsePaymentOptions {
  merchantAddress: `0x${string}`;
  amount: bigint;
  useVault?: boolean;
  vaultAddress?: `0x${string}`;
}

export function usePayment() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { data: buyerFeeData } = useReadContract({
    address: CONTRACT_ADDRESSES.BurnRouter as `0x${string}`,
    abi: BurnRouterABI,
    functionName: 'routeFor',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESSES.BurnRouter) },
  });

  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken as `0x${string}`,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESSES.VFIDEToken) },
  });

  const pay = useCallback(async (options: UsePaymentOptions): Promise<PaymentResult | null> => {
    if (!address || !publicClient) {
      setError('Wallet not connected');
      setStatus('error');
      return null;
    }

    const { merchantAddress, amount, useVault = false, vaultAddress } = options;

    try {
      setError(null);
      setStatus('sending');

      const feeBps = buyerFeeData ? Number(buyerFeeData) : 100;
      const feeAmount = (amount * BigInt(feeBps)) / 10000n;
      const totalRequired = amount + feeAmount;

      if (useVault && !vaultAddress) {
        setError('Vault address is required for vault payments');
        setStatus('error');
        return null;
      }

      if (!useVault && typeof balance === 'bigint' && balance < totalRequired) {
        setError(`Insufficient balance. Need ${formatEther(totalRequired)} VFIDE, have ${formatEther(balance)}`);
        setStatus('error');
        return null;
      }

      let hash: `0x${string}`;

      if (useVault && vaultAddress) {
        const transferData = encodeFunctionData({
          abi: VFIDETokenABI,
          functionName: 'transfer',
          args: [merchantAddress, amount],
        });

        hash = await writeContractAsync({
          address: vaultAddress,
          abi: UserVaultABI,
          functionName: 'execute',
          args: [CONTRACT_ADDRESSES.VFIDEToken as `0x${string}`, 0n, transferData],
          chainId: CURRENT_CHAIN_ID,
        });
      } else {
        hash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.VFIDEToken as `0x${string}`,
          abi: VFIDETokenABI,
          functionName: 'transfer',
          args: [merchantAddress, amount],
          chainId: CURRENT_CHAIN_ID,
        });
      }

      setTxHash(hash);
      setStatus('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      setStatus('complete');

      return {
        txHash: hash,
        blockNumber: Number(receipt.blockNumber),
        feeAmount: formatEther(feeAmount),
        netAmount: formatEther(amount),
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Payment failed';
      setError(
        message.includes('User rejected') || message.includes('denied')
          ? 'Transaction cancelled'
          : message.includes('insufficient funds')
            ? 'Insufficient gas for transaction'
            : message
      );
      setStatus('error');
      return null;
    }
  }, [address, publicClient, writeContractAsync, buyerFeeData, balance]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }, []);

  return {
    pay,
    reset,
    status,
    error,
    txHash,
    balance: typeof balance === 'bigint' ? formatEther(balance) : '0',
    feeBps: buyerFeeData ? Number(buyerFeeData) : 100,
  };
}
