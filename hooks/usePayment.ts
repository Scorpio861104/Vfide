'use client';

import { useCallback, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { VFIDETokenABI, BurnRouterABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, getContractConfigurationError, isCardBoundVaultMode, isConfiguredContractAddress } from '@/lib/contracts';
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
  const cardBoundMode = isCardBoundVaultMode();
  const hasBurnRouterConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.BurnRouter);
  const hasTokenConfig = isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { data: buyerFeeData } = useReadContract({
    address: CONTRACT_ADDRESSES.BurnRouter as `0x${string}`,
    abi: BurnRouterABI,
    functionName: 'routeFor',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && hasBurnRouterConfig },
  });

  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken as `0x${string}`,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && hasTokenConfig },
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

      if (!hasTokenConfig) {
        throw getContractConfigurationError('VFIDEToken');
      }

      const feeBps = buyerFeeData ? Number(buyerFeeData) : 100;
      const feeAmount = (amount * BigInt(feeBps)) / 10000n;
      const totalRequired = amount + feeAmount;

      if (useVault && !vaultAddress) {
        setError('Vault address is required for vault payments');
        setStatus('error');
        return null;
      }

      if (useVault && cardBoundMode) {
        setError('Vault payments through the legacy execute() path are not supported in CardBound mode. Use a CardBound-native merchant or vault-to-vault payment flow.');
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
        setError('Vault payments require the legacy UserVault execute() path, which is disabled in CardBound mode.');
        setStatus('error');
        return null;
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
  }, [address, publicClient, writeContractAsync, buyerFeeData, balance, cardBoundMode]);

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
