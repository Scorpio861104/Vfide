'use client';

import { useCallback, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { VFIDETokenABI, ProofScoreBurnRouterABI } from '@/lib/abis';
import { getContractAddresses, getContractConfigurationError, isCardBoundVaultMode, isConfiguredContractAddress } from '@/lib/contracts';

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
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const cardBoundMode = isCardBoundVaultMode();
  const contractAddresses = getContractAddresses(chainId);
  const hasBurnRouterConfig = isConfiguredContractAddress(contractAddresses.ProofScoreBurnRouter);
  const hasTokenConfig = isConfiguredContractAddress(contractAddresses.VFIDEToken);
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { data: balance } = useReadContract({
    address: contractAddresses.VFIDEToken,
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

      let feeAmount = 0n;
      if (hasBurnRouterConfig) {
        const feeData = await publicClient.readContract({
          address: contractAddresses.ProofScoreBurnRouter,
          abi: ProofScoreBurnRouterABI,
          functionName: 'computeFees',
          args: [address, merchantAddress, amount],
        });
        const [burnAmount, sanctumAmount, ecosystemAmount] = feeData as readonly [bigint, bigint, bigint, `0x${string}`, `0x${string}`, `0x${string}`];
        feeAmount = burnAmount + sanctumAmount + ecosystemAmount;
      }
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
          address: contractAddresses.VFIDEToken,
          abi: VFIDETokenABI,
          functionName: 'transfer',
          args: [merchantAddress, amount],
          chainId,
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
  }, [address, publicClient, writeContractAsync, balance, cardBoundMode, hasBurnRouterConfig, hasTokenConfig, chainId, contractAddresses]);

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
    feeBps: 0,
  };
}
