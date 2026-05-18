'use client';

/**
 * useEnterpriseTreasury — foundation hook for the protocol treasury surface.
 *
 * Combines reads from three sources:
 *
 *   1. **EcoTreasuryVault** (the VFIDE-only treasury aggregator)
 *      - `getTreasurySummary()` returns (currentBalance, totalIn, totalOut, netPosition)
 *      - `vfideBalance()` is the live VFIDE on hand
 *      - `getMultiTokenBalances(tokens[])` for arbitrary ERC-20 balances
 *
 *   2. **EcosystemVault** (where fee revenue lands + is allocated to pools)
 *      - Pool totals: councilPool, headhunterPool, merchantPool, operationsPool
 *      - Flow totals: totalReceived, totalBurned, totalCouncilPaid, totalExpensesPaid,
 *        totalHeadhunterPaid, totalMerchantBonusesPaid
 *      - stablecoinReserves (stable-asset holdings)
 *      - pendingWithdrawTotal (claims queue)
 *
 *   3. **VFIDEToken** (sanity-check balances at the token level if needed)
 *
 * Exposed write paths (this hook):
 *   • (none — all writes flow through DAO governance proposals)
 *
 * INTENTIONALLY NOT IN THIS HOOK:
 *   • sendVFIDE(to, amount, reason)       — DAO-only on EcoTreasuryVault.
 *     Reached via CreateTab DAO template (Tier 2 Phase 4 Turn 1).
 *   • rescueToken(token, to, amount)      — DAO-only on EcoTreasuryVault.
 *     Reached via CreateTab DAO template (Tier 2 Phase 4 Turn 1).
 *   • setModules / acceptDAO / cancelModules / clearExpiredModules — DAO timelock
 *     for module wiring on EcoTreasuryVault. Tier 2 ops concern.
 *   • setNotifier / applyNotifier / cancelNotifier — authorized-notifier governance.
 *     Tier 2 ops concern.
 *   • noteVFIDE — called internally by VFIDEToken on inflows. Not a user-facing
 *     UI action.
 *
 * EcosystemVault's write surface (allocation changes, manager updates, pool
 * redistribution, etc.) is also entirely DAO-gated and out of scope for this
 * dashboard. Those reach CreateTab via the custom-mode path until templates
 * are added.
 */

import {
  useReadContract,
  useReadContracts,
} from 'wagmi';
import { type Address, type Abi } from 'viem';
import { EcoTreasuryVaultABI, EcosystemVaultABI, VFIDETokenABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Aggregated VFIDE-treasury summary. Mirrors the tuple returned by
 * `EcoTreasuryVault.getTreasurySummary()`.
 */
export interface TreasurySummary {
  currentBalance: bigint;   // What's on hand right now
  totalIn: bigint;          // Lifetime VFIDE flowed in
  totalOut: bigint;         // Lifetime VFIDE flowed out
  netPosition: bigint;      // totalIn − totalOut (cumulative net)
}

/**
 * Pool composition read from EcosystemVault. The Ecosystem Vault holds the
 * burn-fee inflow share and partitions it across these 4 pools by reserve bps.
 */
export interface PoolBalances {
  councilPool: bigint;
  headhunterPool: bigint;
  merchantPool: bigint;
  operationsPool: bigint;
  stablecoinReserves: bigint;
  pendingWithdrawTotal: bigint;
}

/**
 * Cumulative paid-out totals across each pool. Useful for "how much has the
 * protocol disbursed lifetime?" rollups.
 */
export interface PaidTotals {
  totalCouncilPaid: bigint;
  totalExpensesPaid: bigint;
  totalHeadhunterPaid: bigint;
  totalMerchantBonusesPaid: bigint;
}

/**
 * Top-level ecosystem inflow/outflow at the EcosystemVault level. `totalBurned`
 * is the cumulative VFIDE destroyed by the burn-fee mechanism (separate from
 * `totalOut`, which counts only EcoTreasuryVault disbursements).
 */
export interface EcosystemFlow {
  totalReceived: bigint;
  totalBurned: bigint;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getEcoTreasuryVaultAddress(): Address | undefined {
  const addr = CONTRACT_ADDRESSES.EcoTreasuryVault;
  if (!isConfiguredContractAddress(addr)) return undefined;
  return addr as Address;
}

function getEcosystemVaultAddress(): Address | undefined {
  const addr = CONTRACT_ADDRESSES.EcosystemVault;
  if (!isConfiguredContractAddress(addr)) return undefined;
  return addr as Address;
}

function getVFIDETokenAddress(): Address | undefined {
  const addr = CONTRACT_ADDRESSES.VFIDEToken;
  if (!isConfiguredContractAddress(addr)) return undefined;
  return addr as Address;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * @param extraTokens  Optional addresses of additional ERC-20 tokens to query
 *                     `EcoTreasuryVault.balanceOf(token)` for. Used by
 *                     FinanceTab if the operator wants to display non-VFIDE
 *                     holdings (e.g. USDC, ETH wrapped).
 */
export function useEnterpriseTreasury(extraTokens: readonly Address[] = []) {
  const ecoTreasuryAddress = getEcoTreasuryVaultAddress();
  const ecosystemVaultAddress = getEcosystemVaultAddress();
  const vfideTokenAddress = getVFIDETokenAddress();

  const ecoTreasuryConfigured = Boolean(ecoTreasuryAddress);
  const ecosystemVaultConfigured = Boolean(ecosystemVaultAddress);
  const anyConfigured = ecoTreasuryConfigured || ecosystemVaultConfigured;

  // ─── EcoTreasuryVault — VFIDE-side treasury aggregator ──────────────────

  const { data: treasurySummaryRaw, isLoading: summaryLoading } = useReadContract({
    address: ecoTreasuryAddress,
    abi: EcoTreasuryVaultABI,
    functionName: 'getTreasurySummary',
    query: { enabled: ecoTreasuryConfigured },
  });

  const treasurySummary: TreasurySummary | undefined = treasurySummaryRaw
    ? (() => {
        const tuple = treasurySummaryRaw as readonly [bigint, bigint, bigint, bigint];
        return {
          currentBalance: tuple[0],
          totalIn: tuple[1],
          totalOut: tuple[2],
          netPosition: tuple[3],
        } satisfies TreasurySummary;
      })()
    : undefined;

  const { data: vfideBalanceRaw } = useReadContract({
    address: ecoTreasuryAddress,
    abi: EcoTreasuryVaultABI,
    functionName: 'vfideBalance',
    query: { enabled: ecoTreasuryConfigured },
  });

  // Multi-token balance reads (only if caller provided tokens to query).
  const tokensList = extraTokens.length > 0 ? extraTokens : [];
  const { data: multiTokenBalancesRaw, isLoading: multiTokenLoading } = useReadContract({
    address: ecoTreasuryAddress,
    abi: EcoTreasuryVaultABI,
    functionName: 'getMultiTokenBalances',
    args: tokensList.length > 0 ? [tokensList] : undefined,
    query: { enabled: ecoTreasuryConfigured && tokensList.length > 0 },
  });

  // Build a `{address → balance}` map keyed by lowercase address for callers.
  const extraTokenBalances = new Map<string, bigint>();
  if (Array.isArray(multiTokenBalancesRaw)) {
    const balances = multiTokenBalancesRaw as readonly bigint[];
    for (let i = 0; i < tokensList.length; i++) {
      const balance = balances[i];
      const token = tokensList[i];
      if (balance !== undefined && token) {
        extraTokenBalances.set(token.toLowerCase(), balance);
      }
    }
  }

  // ─── EcosystemVault — pool composition + flows ──────────────────────────

  // Batch the 6 pool/flow reads via useReadContracts so they all fetch in
  // one network round-trip (Multicall). Skips entirely when EcosystemVault
  // isn't configured.
  const ecosystemReadCalls = ecosystemVaultConfigured
    ? ([
        // Pool balances
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'councilPool' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'headhunterPool' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'merchantPool' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'operationsPool' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'stablecoinReserves' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'pendingWithdrawTotal' as const },
        // Paid totals
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalCouncilPaid' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalExpensesPaid' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalHeadhunterPaid' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalMerchantBonusesPaid' as const },
        // Top-level flow
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalReceived' as const },
        { address: ecosystemVaultAddress!, abi: EcosystemVaultABI, functionName: 'totalBurned' as const },
      ] as const)
    : [];

  const { data: ecosystemReadResults, isLoading: ecosystemLoading } = useReadContracts({
    contracts: ecosystemReadCalls as readonly {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: readonly unknown[];
    }[],
    query: { enabled: ecosystemVaultConfigured },
  });

  // Decode the 12 results into typed objects. Each entry may have status
  // 'failure' if its individual call reverted (e.g. on a partially-deployed
  // EcosystemVault), so we default-to-zero per field rather than discarding
  // the whole bundle.
  const r = ecosystemReadResults ?? [];
  const decodeBigint = (idx: number): bigint => {
    const entry = r[idx];
    if (!entry || entry.status !== 'success') return 0n;
    return (entry.result as bigint) ?? 0n;
  };

  const pools: PoolBalances = {
    councilPool: decodeBigint(0),
    headhunterPool: decodeBigint(1),
    merchantPool: decodeBigint(2),
    operationsPool: decodeBigint(3),
    stablecoinReserves: decodeBigint(4),
    pendingWithdrawTotal: decodeBigint(5),
  };

  const paidTotals: PaidTotals = {
    totalCouncilPaid: decodeBigint(6),
    totalExpensesPaid: decodeBigint(7),
    totalHeadhunterPaid: decodeBigint(8),
    totalMerchantBonusesPaid: decodeBigint(9),
  };

  const ecosystemFlow: EcosystemFlow = {
    totalReceived: decodeBigint(10),
    totalBurned: decodeBigint(11),
  };

  // ─── VFIDEToken — totalSupply for ratio displays (e.g. "X% of supply") ──

  const { data: vfideTotalSupply } = useReadContract({
    address: vfideTokenAddress,
    abi: VFIDETokenABI,
    functionName: 'totalSupply',
    query: { enabled: Boolean(vfideTokenAddress) },
  });

  // ─── Returned surface ────────────────────────────────────────────────────

  const loading = summaryLoading || ecosystemLoading || multiTokenLoading;

  return {
    // Address + config flags
    ecoTreasuryAddress,
    ecosystemVaultAddress,
    vfideTokenAddress,
    ecoTreasuryConfigured,
    ecosystemVaultConfigured,
    /** Convenience: at least one of the treasury contracts is configured. */
    anyConfigured,

    // EcoTreasuryVault — VFIDE-only treasury aggregator
    treasurySummary,
    vfideBalance: (vfideBalanceRaw as bigint | undefined) ?? 0n,

    // Per-token balances (the extraTokens arg)
    extraTokenBalances,

    // EcosystemVault — pool composition + flows
    pools,
    paidTotals,
    ecosystemFlow,

    // Token-wide
    vfideTotalSupply: (vfideTotalSupply as bigint | undefined) ?? 0n,

    // Aggregate state
    loading,
  };
}
