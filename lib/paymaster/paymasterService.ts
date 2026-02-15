'use client';

/**
 * Paymaster Service for Gasless Transactions
 * 
 * Enables sponsored transactions where the app or a third party
 * pays for gas fees on behalf of users.
 * 
 * Supports:
 * - Pimlico Paymaster
 * - Alchemy Gas Manager
 * - Coinbase Paymaster (for Coinbase Smart Wallet)
 * - zkSync Native Paymaster
 */

import { type Address, type Hex } from 'viem';

// ==================== TYPES ====================

export type PaymasterProvider = 'pimlico' | 'alchemy' | 'coinbase' | 'zksync' | 'custom';

export interface PaymasterConfig {
  provider: PaymasterProvider;
  apiKey?: string;
  endpoint?: string;
  sponsorshipPolicyId?: string;
}

export interface SponsorshipPolicy {
  id: string;
  name: string;
  /** Max gas units to sponsor per transaction */
  maxGasLimit: bigint;
  /** Max total ETH to sponsor per user per day */
  dailyLimitWei: bigint;
  /** Allowed contract addresses (empty = all allowed) */
  allowedContracts: Address[];
  /** Allowed function selectors (empty = all allowed) */
  allowedSelectors: Hex[];
  /** Whether policy is currently active */
  isActive: boolean;
}

export interface SponsorshipRequest {
  userAddress: Address;
  targetContract: Address;
  callData: Hex;
  value?: bigint;
  chainId: number;
  gasLimits?: {
    callGasLimit?: string;
    verificationGasLimit?: string;
    preVerificationGas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export interface SponsorshipResult {
  sponsored: boolean;
  paymasterAndData?: Hex;
  estimatedGas?: bigint;
  estimatedSavingsWei?: bigint;
  reason?: string;
}

export interface UserSponsorshipStats {
  totalSponsored: bigint;
  transactionsSponsored: number;
  dailyUsedWei: bigint;
  dailyLimitWei: bigint;
  remainingToday: bigint;
}

// ==================== PAYMASTER SERVICE ====================

export class PaymasterService {
  private config: PaymasterConfig;
  private policyCache: Map<string, SponsorshipPolicy> = new Map();

  constructor(config: PaymasterConfig) {
    this.config = config;
  }

  /**
   * Check if a transaction can be sponsored
   */
  async canSponsor(request: SponsorshipRequest): Promise<SponsorshipResult> {
    try {
      switch (this.config.provider) {
        case 'pimlico':
          return await this.checkPimlicoSponsorship(request);
        case 'alchemy':
          return await this.checkAlchemySponsorship(request);
        case 'coinbase':
          return await this.checkCoinbaseSponsorship(request);
        case 'zksync':
          return await this.checkZkSyncSponsorship(request);
        default:
          return { sponsored: false, reason: 'Unknown paymaster provider' };
      }
    } catch (error) {
      console.error('Paymaster check failed:', error);
      return { 
        sponsored: false, 
        reason: error instanceof Error ? error.message : 'Sponsorship check failed' 
      };
    }
  }

  /**
   * Get paymaster data for a transaction
   */
  async getPaymasterData(request: SponsorshipRequest): Promise<Hex | null> {
    const result = await this.canSponsor(request);
    return result.sponsored ? result.paymasterAndData ?? null : null;
  }

  /**
   * Get user's sponsorship statistics
   */
  async getUserStats(_userAddress: Address, _chainId: number): Promise<UserSponsorshipStats> {
    if (!this.config.apiKey) {
      // No API key configured — return zeroed stats to indicate unconfigured state
      return {
        totalSponsored: BigInt(0),
        transactionsSponsored: 0,
        dailyUsedWei: BigInt(0),
        dailyLimitWei: BigInt(0),
        remainingToday: BigInt(0),
      };
    }

    // TODO: Query paymaster provider API for actual user stats
    return {
      totalSponsored: BigInt(0),
      transactionsSponsored: 0,
      dailyUsedWei: BigInt(0),
      dailyLimitWei: BigInt(0),
      remainingToday: BigInt(0),
    };
  }

  /**
   * Estimate gas savings from sponsorship
   */
  async estimateSavings(
    request: SponsorshipRequest,
    gasPrice: bigint
  ): Promise<bigint> {
    const result = await this.canSponsor(request);
    if (result.sponsored && result.estimatedGas) {
      return result.estimatedGas * gasPrice;
    }
    return BigInt(0);
  }

  // ==================== PROVIDER-SPECIFIC IMPLEMENTATIONS ====================

  private async checkPimlicoSponsorship(
    request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    if (!this.config.apiKey) {
      return { sponsored: false, reason: 'Pimlico API key not configured' };
    }

    // Pimlico sponsorship check
    // In production, this would call the Pimlico API
    const endpoint = `https://api.pimlico.io/v2/${request.chainId}/rpc?apikey=${this.config.apiKey}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'pm_sponsorUserOperation',
          params: [
            {
              sender: request.userAddress,
              callData: request.callData,
              callGasLimit: request.gasLimits?.callGasLimit ?? '0x100000',
              verificationGasLimit: request.gasLimits?.verificationGasLimit ?? '0x100000',
              preVerificationGas: request.gasLimits?.preVerificationGas ?? '0x100000',
              maxFeePerGas: request.gasLimits?.maxFeePerGas ?? '0x3B9ACA00',
              maxPriorityFeePerGas: request.gasLimits?.maxPriorityFeePerGas ?? '0x3B9ACA00',
            },
            this.config.sponsorshipPolicyId || 'default',
          ],
        }),
      });

      if (!response.ok) {
        return { sponsored: false, reason: `Pimlico returned ${response.status}` };
      }

      const data = await response.json();
      
      if (data.result) {
        return {
          sponsored: true,
          paymasterAndData: data.result.paymasterAndData,
          estimatedGas: BigInt(data.result.callGasLimit || 100000),
        };
      }

      return { sponsored: false, reason: data.error?.message || 'Sponsorship denied' };
    } catch {
      return { sponsored: false, reason: 'Pimlico sponsorship unavailable' };
    }
  }

  private async checkAlchemySponsorship(
    _request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    if (!this.config.apiKey) {
      return { sponsored: false, reason: 'Alchemy API key not configured' };
    }

    // Alchemy Gas Manager check
    // In production, this would call the Alchemy API
    return { sponsored: false, reason: 'Alchemy sponsorship unavailable' };
  }

  private async checkCoinbaseSponsorship(
    _request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    // Coinbase Smart Wallet has built-in sponsorship for certain transactions
    // Reserved for future contract whitelist
    const _eligibleContracts = [
      // Add known Coinbase-sponsored contract addresses
    ];

    // For Coinbase Smart Wallet, sponsorship is provider-managed
    return { sponsored: false, reason: 'Coinbase sponsorship requires provider integration' };
  }

  private async checkZkSyncSponsorship(
    request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    // zkSync Era native paymaster
    if (request.chainId !== 324 && request.chainId !== 300) {
      return { sponsored: false, reason: 'Not a zkSync chain' };
    }

    // zkSync has native paymaster support, but requires configured params
    return { sponsored: false, reason: 'zkSync paymaster not configured' };
  }
}

// ==================== SINGLETON INSTANCE ====================

let paymasterInstance: PaymasterService | null = null;

export function getPaymasterService(config?: PaymasterConfig): PaymasterService {
  if (!paymasterInstance && config) {
    paymasterInstance = new PaymasterService(config);
  }
  
  if (!paymasterInstance) {
    // Default configuration
    // NOTE: PIMLICO_API_KEY is server-side only. If paymaster sponsorship checks
    // are needed from the client, route them through an API endpoint instead.
    paymasterInstance = new PaymasterService({
      provider: 'pimlico',
      apiKey: process.env.PIMLICO_API_KEY,
    });
  }
  
  return paymasterInstance;
}

// ==================== REACT HOOK ====================

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';

export interface UsePaymasterResult {
  /** Check if a transaction can be sponsored */
  canSponsor: (target: Address, callData: Hex, value?: bigint) => Promise<SponsorshipResult>;
  /** Get user's sponsorship stats */
  stats: UserSponsorshipStats | null;
  /** Whether paymaster is available */
  isAvailable: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Refresh stats */
  refresh: () => Promise<void>;
}

export function usePaymaster(config?: PaymasterConfig): UsePaymasterResult {
  const { address } = useAccount();
  const chainId = useChainId();
  const [stats, setStats] = useState<UserSponsorshipStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = getPaymasterService(config);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const userStats = await service.getUserStats(address, chainId);
      setStats(userStats);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, service]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const canSponsor = useCallback(
    async (target: Address, callData: Hex, value?: bigint): Promise<SponsorshipResult> => {
      if (!address) {
        return { sponsored: false, reason: 'Wallet not connected' };
      }

      return service.canSponsor({
        userAddress: address,
        targetContract: target,
        callData,
        value,
        chainId,
      });
    },
    [address, chainId, service]
  );

  return {
    canSponsor,
    stats,
    isAvailable: !!address,
    isLoading,
    refresh: fetchStats,
  };
}

export default PaymasterService;
