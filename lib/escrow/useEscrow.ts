/**
 * useEscrow - v6 compatibility shim
 *
 * CommerceEscrow was removed in v6. This hook preserves the previous API
 * surface for call sites while routing createEscrow through MerchantPortal pay.
 */

import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useSignTypedData } from 'wagmi';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { ZERO_ADDRESS, getContractAddresses, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantPortalABI, VaultHubABI, CardBoundVaultABI } from '@/lib/abis';

const MerchantPortalIntentABI = [
  {
    type: 'function',
    name: 'payWithIntent',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'intent',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'merchantPortal', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'merchant', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'walletEpoch', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
          { name: 'chainId', type: 'uint256' },
        ],
      },
      { name: 'signature', type: 'bytes' },
      { name: 'orderId', type: 'string' },
    ],
    outputs: [{ name: 'netAmount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'merchants',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'suspended', type: 'bool' },
      { name: 'businessName', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'registeredAt', type: 'uint64' },
      { name: 'totalVolume', type: 'uint256' },
      { name: 'txCount', type: 'uint256' },
      { name: 'payoutAddress', type: 'address' },
    ],
  },
] as const;

export interface Escrow {
  id: bigint;
  buyer: `0x${string}`;
  merchant: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  releaseTime: bigint;
  state: number;
  orderId: string;
}

export type EscrowState = 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

const STATE_MAP: Record<number, EscrowState> = {
  1: 'CREATED',  // OPEN
  2: 'CREATED',  // FUNDED
  3: 'RELEASED',
  4: 'REFUNDED',
  5: 'DISPUTED',
  6: 'RELEASED', // RESOLVED
};

export function useEscrow() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const contractAddresses = getContractAddresses(chainId);
  const publicClient = usePublicClient();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portalAddress = contractAddresses.MerchantPortal;
  const tokenAddress = contractAddresses.VFIDEToken;
  const hasEscrowConfig =
    isConfiguredContractAddress(portalAddress) &&
    isConfiguredContractAddress(tokenAddress);
  const assertEscrowWriteReady = () => {
    if (!hasEscrowConfig) {
      throw new Error('Merchant payment contracts are not configured');
    }
  };

  // Contract write hooks
  const { writeContractAsync, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // ============ HELPER FUNCTIONS ============

  // Format helpers
  const formatEscrowAmount = useCallback((amount: bigint): string => {
    return formatUnits(amount, 18);
  }, []);

  const getStateLabel = useCallback((state: number): EscrowState => {
    return STATE_MAP[state] || 'CREATED';
  }, []);

  const getTimeRemaining = useCallback((releaseTime: bigint): string => {
    if (releaseTime === 0n) return 'N/A';

    const now = BigInt(Math.floor(Date.now() / 1000));
    const diff = releaseTime - now;
    
    if (diff <= 0) return 'Ready to claim';
    
    const days = Number(diff) / 86400;
    const hours = (Number(diff) % 86400) / 3600;
    
    if (days >= 1) return `${Math.floor(days)}d ${Math.floor(hours)}h`;
    return `${Math.floor(hours)}h`;
  }, []);

  // Check timeout status
  const checkTimeout = useCallback(async (id: bigint): Promise<{
    isNearTimeout: boolean;
    timeRemaining: bigint;
  }> => {
    // v6 compatibility: no timeout windows in MerchantPortal direct settlement.
    void id;
    const isNearTimeout = false;
    const timeRemaining = 0n;

    return {
      isNearTimeout,
      timeRemaining,
    };
  }, []);

  // ============ MAIN FUNCTIONS (use helpers) ============

  // Load all escrows for current user (compatibility no-op)
  const loadEscrows = useCallback(async () => {
    void hasEscrowConfig;
    void address;
    setEscrows([]);
  }, [address, hasEscrowConfig]);

  // Create escrow (v6: direct MerchantPortal pay compatibility path)
  const createEscrow = useCallback(async (
    merchant: `0x${string}`,
    amount: string,
    orderId: string
  ) => {
    if (!address) throw new Error('Wallet not connected');
    assertEscrowWriteReady();
    if (!isAddress(merchant) || merchant === ZERO_ADDRESS) {
      throw new Error('Merchant must be a valid non-zero address');
    }
    if (!amount || Number(amount) <= 0) {
      throw new Error('Escrow amount must be greater than zero');
    }
    
    setLoading(true);
    setError(null);

    try {
      if (!isConfiguredContractAddress(contractAddresses.VaultHub)) {
        throw new Error('VaultHub is not configured');
      }

      const customerVault = await publicClient.readContract({
        address: contractAddresses.VaultHub,
        abi: VaultHubABI,
        functionName: 'vaultOf',
        args: [address],
      }) as `0x${string}`;

      if (!isAddress(customerVault) || customerVault.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('No customer vault found. Please initialize your vault first.');
      }

      const merchantInfo = await publicClient.readContract({
        address: portalAddress,
        abi: MerchantPortalIntentABI,
        functionName: 'merchants',
        args: [merchant],
      }) as readonly [boolean, boolean, string, string, bigint, bigint, bigint, `0x${string}`];

      const payoutAddress = merchantInfo[7];
      const merchantVault = await publicClient.readContract({
        address: contractAddresses.VaultHub,
        abi: VaultHubABI,
        functionName: 'vaultOf',
        args: [merchant],
      }) as `0x${string}`;

      const recipient = payoutAddress && payoutAddress.toLowerCase() !== ZERO_ADDRESS
        ? payoutAddress
        : merchantVault;

      if (!isAddress(recipient) || recipient.toLowerCase() === ZERO_ADDRESS) {
        throw new Error('Merchant recipient vault is not initialized yet.');
      }

      const nonce = await publicClient.readContract({
        address: customerVault,
        abi: CardBoundVaultABI,
        functionName: 'nextNonce',
      }) as bigint;

      const walletEpoch = await publicClient.readContract({
        address: customerVault,
        abi: CardBoundVaultABI,
        functionName: 'walletEpoch',
      }) as bigint;

      const amountWei = parseUnits(amount, 18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const intent = {
        vault: customerVault,
        merchantPortal: portalAddress,
        token: tokenAddress,
        merchant,
        recipient,
        amount: amountWei,
        nonce,
        walletEpoch,
        deadline,
        chainId: BigInt(chainId),
      };

      const signature = await signTypedDataAsync({
        domain: {
          name: 'CardBoundVault',
          version: '1',
          chainId,
          verifyingContract: customerVault,
        },
        types: {
          PayIntent: [
            { name: 'vault', type: 'address' },
            { name: 'merchantPortal', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'merchant', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'walletEpoch', type: 'uint64' },
            { name: 'deadline', type: 'uint64' },
            { name: 'chainId', type: 'uint256' },
          ],
        },
        primaryType: 'PayIntent',
        message: intent,
      });

      const paymentHash = await writeContractAsync({
        address: portalAddress,
        abi: MerchantPortalIntentABI,
        functionName: 'payWithIntent',
        args: [intent, signature, orderId || `order-${Date.now()}`],
        chainId,
      });

      if (!publicClient) {
        throw new Error('Wallet client not available');
      }
      await publicClient.waitForTransactionReceipt({ hash: paymentHash });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create escrow');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, hasEscrowConfig, portalAddress, publicClient, tokenAddress, writeContractAsync, chainId, signTypedDataAsync, contractAddresses.VaultHub]);

  // Release funds to merchant
  const releaseEscrow = useCallback(async (id: bigint) => {
    void id;
    throw new Error('Escrow release is not available in v6. Payments settle through MerchantPortal.');
  }, []);

  // Refund buyer (merchant initiated)
  const refundEscrow = useCallback(async (id: bigint) => {
    void id;
    throw new Error('Escrow refunds are not available in v6. Use MerchantPortal refund flows.');
  }, []);

  // Claim timeout (merchant claims after release time)
  const claimTimeout = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      void id;
      throw new Error('Timeout claim is not supported by CommerceEscrow. Use release, refund, or dispute resolution.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Raise dispute
  const raiseDispute = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      void id;
      throw new Error('Escrow disputes are not available in v6.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolve dispute (DAO arbiter)
  const resolveDispute = useCallback(async (id: bigint, refundBuyer: boolean) => {
    setLoading(true);
    setError(null);

    try {
      void id;
      void refundBuyer;
      throw new Error('Escrow dispute resolution is not available in v6.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolve dispute with split payout (DAO arbiter)
  const resolveDisputePartial = useCallback(async (id: bigint, buyerShareBps: bigint) => {
    setLoading(true);
    setError(null);

    try {
      void id;
      void buyerShareBps;
      throw new Error('Partial dispute resolution is not supported by CommerceEscrow.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve dispute with split payout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Notify near-timeout to trigger event-driven monitoring
  const notifyTimeout = useCallback(async (id: bigint) => {
    setLoading(true);
    setError(null);

    try {
      void id;
      throw new Error('Timeout notifications are not supported by CommerceEscrow.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify timeout');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============ EFFECTS ============

  // Auto-reload after successful transaction
  useEffect(() => {
    if (isSuccess) {
      loadEscrows();
    }
  }, [isSuccess, loadEscrows]);

  // Initial and dependency-driven load
  useEffect(() => {
    loadEscrows();
  }, [loadEscrows]);

  // Error handling
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
    }
  }, [writeError]);

  // ============ COMPUTED VALUES ============

  const activeEscrows = useMemo(() => escrows.filter(e => e.state === 1 || e.state === 2), [escrows]);
  const completedEscrows = useMemo(() => escrows.filter(e => e.state === 3 || e.state === 4 || e.state === 6), [escrows]);
  const disputedEscrows = useMemo(() => escrows.filter(e => e.state === 5), [escrows]);

  return {
    // Data
    escrows,
    loading: loading || isPending || isConfirming,
    error,
    isSuccess,
    
    // Actions
    createEscrow,
    releaseEscrow,
    refundEscrow,
    claimTimeout,
    raiseDispute,
    resolveDispute,
    resolveDisputePartial,
    notifyTimeout,
    checkTimeout,
    refresh: loadEscrows,
    
    // Helpers
    formatEscrowAmount,
    getStateLabel,
    getTimeRemaining,
    
    // State filters
    activeEscrows,
    completedEscrows,
    disputedEscrows,
  };
}
