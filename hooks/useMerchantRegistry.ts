'use client';

/**
 * useMerchantRegistry — read-only identity layer for inspecting any merchant.
 *
 * Reads merchant status and info for any address, plus protocol parameters
 * (minScore, autoSuspend thresholds). Use this hook to inspect OTHER merchants
 * (e.g., "who am I paying to" displays) and to surface eligibility/strike
 * thresholds for UI warnings.
 *
 * DOES NOT handle merchant registration. The registration flow involves
 * avatar upload + backend profile storage + on-chain addMerchant in a
 * coordinated sequence. That full flow already lives in `useMerchantProfile`
 * — use it for any registration or profile update work. This hook is
 * deliberately read-only to avoid two parallel write paths drifting.
 *
 * Architectural note from Phase 0 Decision 1:
 *   MerchantRegistry and MerchantPortal both exist and track merchant state
 *   independently with no on-chain synchronization. MerchantRegistry has its
 *   own `Merchant` struct + `merchants` mapping; MerchantPortal has its own
 *   `MerchantInfo` struct + `merchants` mapping. Decision was to wire the
 *   frontend to both in Phase 3 and defer the contract refactor to Tier 2.
 *   This hook is the registry side. MerchantPortal-side identity reads
 *   already exist; the Phase 3 plan is to add cross-system display logic
 *   in the merchant UI components so users see both sources when relevant.
 *
 * Audit finding (Phase 3a Turn 2):
 *   The original Turn 1 version of this hook included addMerchant and
 *   setMetaHash writes. Turn 2 audit-before-action discovered
 *   useMerchantProfile already handles those writes as part of the full
 *   registration flow (uploaded to /api/avatar, posted to /api/profile,
 *   then on-chain), and is consumed by MerchantProfileWizard which is
 *   consumed by /merchant/profile/setup and /merchant/profile/edit.
 *   Removing the duplicate writes here is the right move — keep this
 *   hook focused on reads and status helpers.
 *
 * Status enum (from contract):
 *   0 = NONE       — address has never registered
 *   1 = ACTIVE     — registered and able to accept payments
 *   2 = SUSPENDED  — temporarily disabled by DAO action; can be unsuspended
 *   3 = DELISTED   — permanently banned; cannot be unsuspended (DAO-only)
 *
 * POW-1 decay note:
 *   refunds and disputes are NOT raw lifetime counts — the contract applies
 *   a decay function that subtracts one from each counter for every full
 *   90-day window of clean operation. The values returned by info() are
 *   the on-chain stored values, not the post-decay effective values. The
 *   contract uses _applyRefundDecay / _applyDisputeDecay internally when
 *   checking thresholds. For display purposes, the raw values are still
 *   the most accurate "what the contract sees" snapshot.
 */

import { useAccount, useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { MerchantRegistryABI } from '@/lib/abis';

export enum MerchantStatus {
  None = 0,
  Active = 1,
  Suspended = 2,
  Delisted = 3,
}

export function statusLabel(status: MerchantStatus): string {
  switch (status) {
    case MerchantStatus.None: return 'Not registered';
    case MerchantStatus.Active: return 'Active';
    case MerchantStatus.Suspended: return 'Suspended';
    case MerchantStatus.Delisted: return 'Delisted';
  }
}

export interface MerchantInfo {
  owner: Address;
  vault: Address;
  status: MerchantStatus;
  refunds: number;
  disputes: number;
  metaHash: `0x${string}`;
}

export interface UseMerchantRegistryOptions {
  /**
   * Address to read merchant info for. Defaults to the connected wallet.
   * Useful for inspecting other merchants (e.g., when displaying who you're
   * paying to, or in a DAO admin view).
   */
  targetAddress?: Address;
}

/**
 * Decode the info(address) return.
 * The contract returns:
 *   struct Merchant { address owner; address vault; Status status;
 *     uint32 refunds; uint32 disputes; bytes32 metaHash; }
 * viem decodes this as an object with named fields (or array if no names
 * available — we handle both).
 */
function decodeMerchant(raw: unknown): MerchantInfo | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'owner' in (raw as any)) {
    const m = raw as any;
    return {
      owner: m.owner as Address,
      vault: m.vault as Address,
      status: Number(m.status) as MerchantStatus,
      refunds: Number(m.refunds ?? 0),
      disputes: Number(m.disputes ?? 0),
      metaHash: m.metaHash as `0x${string}`,
    };
  }
  if (Array.isArray(raw) && raw.length >= 6) {
    return {
      owner: raw[0] as Address,
      vault: raw[1] as Address,
      status: Number(raw[2]) as MerchantStatus,
      refunds: Number(raw[3] ?? 0),
      disputes: Number(raw[4] ?? 0),
      metaHash: raw[5] as `0x${string}`,
    };
  }
  return null;
}

export function useMerchantRegistry(options: UseMerchantRegistryOptions = {}) {
  const { address: connectedAddress } = useAccount();

  const target = options.targetAddress ?? connectedAddress;
  const registryAddress = CONTRACT_ADDRESSES.MerchantRegistry;
  const registryConfigured = isConfiguredContractAddress(registryAddress);

  // ─────────────────────────────────────────────────────────────────
  // Read merchant info for the target address.
  // ─────────────────────────────────────────────────────────────────
  const {
    data: infoRaw,
    isLoading: isLoadingInfo,
    refetch: refetchInfo,
  } = useReadContract({
    address: registryAddress,
    abi: MerchantRegistryABI,
    functionName: 'info',
    args: target ? [target] : undefined,
    query: { enabled: registryConfigured && !!target },
  });

  const merchant = decodeMerchant(infoRaw);
  const isRegistered = !!merchant && merchant.status !== MerchantStatus.None;
  const isActive = merchant?.status === MerchantStatus.Active;
  const isSuspended = merchant?.status === MerchantStatus.Suspended;
  const isDelisted = merchant?.status === MerchantStatus.Delisted;

  // ─────────────────────────────────────────────────────────────────
  // Read protocol-level eligibility constants.
  //
  // minScore is the minimum ProofScore required to register as a merchant.
  // The Seer contract publishes this and MerchantRegistry caches it in its
  // constructor. We read from MerchantRegistry directly since it's the
  // value that will actually be enforced.
  // ─────────────────────────────────────────────────────────────────
  const { data: minScoreRaw } = useReadContract({
    address: registryAddress,
    abi: MerchantRegistryABI,
    functionName: 'minScore',
    query: { enabled: registryConfigured },
  });
  const minScore = minScoreRaw !== undefined ? Number(minScoreRaw) : undefined;

  // Auto-suspend thresholds — informational, useful for "you're at 4/5 strikes"
  // type warnings in the merchant dashboard.
  const { data: autoSuspendRefundsRaw } = useReadContract({
    address: registryAddress,
    abi: MerchantRegistryABI,
    functionName: 'autoSuspendRefunds',
    query: { enabled: registryConfigured },
  });
  const { data: autoSuspendDisputesRaw } = useReadContract({
    address: registryAddress,
    abi: MerchantRegistryABI,
    functionName: 'autoSuspendDisputes',
    query: { enabled: registryConfigured },
  });
  const autoSuspendRefunds = autoSuspendRefundsRaw !== undefined ? Number(autoSuspendRefundsRaw) : undefined;
  const autoSuspendDisputes = autoSuspendDisputesRaw !== undefined ? Number(autoSuspendDisputesRaw) : undefined;

  return {
    // Identity state
    target,
    merchant,
    isLoadingInfo,
    isRegistered,
    isActive,
    isSuspended,
    isDelisted,

    // Protocol parameters (informational)
    minScore,
    autoSuspendRefunds,
    autoSuspendDisputes,

    // Misc
    registryConfigured,
    refetch: refetchInfo,
  };
}
