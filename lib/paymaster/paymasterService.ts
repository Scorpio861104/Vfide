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
      logger.error('Paymaster check failed:', error);
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
    // In production, this would query the paymaster API
    // For now, return default stats
    const dailyLimit = BigInt(0.1 * 1e18); // 0.1 ETH daily limit
    
    return {
      totalSponsored: BigInt(0),
      transactionsSponsored: 0,
      dailyUsedWei: BigInt(0),
      dailyLimitWei: dailyLimit,
      remainingToday: dailyLimit,
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
              callGasLimit: '0x100000',
              verificationGasLimit: '0x100000',
              preVerificationGas: '0x100000',
              maxFeePerGas: '0x3B9ACA00',
              maxPriorityFeePerGas: '0x3B9ACA00',
            },
            this.config.sponsorshipPolicyId || 'default',
          ],
        }),
      });

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
    request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    if (!this.config.apiKey) {
      return { sponsored: false, reason: 'Alchemy API key not configured' };
    }

    void request;
    return { sponsored: false, reason: 'Alchemy Gas Manager not configured for this deployment' };
  }

  private async checkCoinbaseSponsorship(
    request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    // Coinbase Smart Wallet has built-in sponsorship for certain transactions
    // Reserved for future contract whitelist
    const _eligibleContracts = [
      // Add known Coinbase-sponsored contract addresses
    ];

    void request;
    return { sponsored: false, reason: 'Coinbase paymaster not configured for this deployment' };
  }

  private async checkZkSyncSponsorship(
    request: SponsorshipRequest
  ): Promise<SponsorshipResult> {
    // zkSync Era native paymaster
    if (request.chainId !== 324 && request.chainId !== 300) {
      return { sponsored: false, reason: 'Not a zkSync chain' };
    }

    return { sponsored: false, reason: 'zkSync native paymaster not configured for this deployment' };
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
    paymasterInstance = new PaymasterService({
      provider: 'pimlico',
      // N-H22 FIX: Do not expose paymaster API keys via NEXT_PUBLIC envs.
      apiKey: process.env.PIMLICO_API_KEY,
    });
  }
  
  return paymasterInstance;
}

// ==================== REACT HOOK ====================

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { logger } from '@/lib/logger';

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
