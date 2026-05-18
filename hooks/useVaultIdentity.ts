'use client';

/**
 * useVaultIdentity(address) — resolve a vault address to display identity.
 *
 * Implements the resolver semantics from VFIDE_MERCHANT_PROFILE_SPEC.md §7.
 *
 * Resolution order:
 *   1. MerchantRegistry.merchants(address) on-chain
 *      - status == NONE     → individual fallback (truncated address + identicon)
 *      - status == DELISTED → "[Delisted Merchant]" + identicon (NO profile fetch)
 *      - status == ACTIVE | SUSPENDED + metaHash != 0 → fetch profile from backend
 *      - status == ACTIVE | SUSPENDED + metaHash == 0 → truncated address + identicon
 *   2. GET /api/profile?hash={metaHash} returns canonical JSON
 *   3. Parse, validate schema, render fields. On any failure → fallback to step 1.
 *
 * Every place in the frontend that renders a vault address swaps to a component
 * driven by this hook. The chain is always queried; the backend is queried only
 * for ACTIVE/SUSPENDED merchants that have a nonzero metaHash.
 *
 * Caching: react-query (built into wagmi) handles cache + revalidation on the
 * chain-read side. The backend fetch is cached in-memory per metaHash for the
 * session; CIDs are immutable so this is safe.
 */

import { useEffect, useMemo, useState } from 'react';
import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { MerchantRegistryABI } from '@/lib/abis';
import { useContractAddresses } from './useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

// ──────────────────────────────────────────────────────────────────────
// Types — mirror the spec §3 schema + spec §7 resolved shape
// ──────────────────────────────────────────────────────────────────────

export type MerchantStatus = 'individual' | 'active' | 'suspended' | 'delisted';

export interface VaultIdentity {
  /** The address that was resolved. Echoed for convenience. */
  address: string;
  /** What to render. "Maya's Hair Studio", "[Delisted Merchant]", or "0x1234…5678". */
  displayName: string;
  /** Avatar URL (https or ipfs://) if the profile has one, null otherwise. */
  avatarUrl: string | null;
  /** True iff resolution reached the backend and a profile was successfully fetched. */
  hasProfile: boolean;
  /** True iff MerchantRegistry.status != NONE. */
  isMerchant: boolean;
  /** Verified = isMerchant AND status == ACTIVE. Reserved field for future attestation logic. */
  isVerified: boolean;
  /** Granular status string for badge / pill rendering. */
  status: MerchantStatus;
  /** Optional bio for detail screens. Empty string if not present. */
  bio: string;
  /** Optional category for filter chips. Empty string if not present. */
  category: string;
}

// Internal — what we expect back from /api/profile
interface BackendProfile {
  schemaVersion: number;
  name: string;
  avatar?: string;
  bio?: string;
  category?: string;
}

// ──────────────────────────────────────────────────────────────────────
// In-memory cache for backend fetches.
//
// Profile bytes are content-addressed by metaHash; once fetched, the result
// never changes. A simple per-session cache covers most identity rendering
// (the same merchant appears many times on a page; we don't want N requests).
// ──────────────────────────────────────────────────────────────────────

const profileCache = new Map<
  string,
  { profile: BackendProfile | null; fetchedAt: number }
>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to dedupe, short enough that moderation flags catch up

async function fetchProfile(metaHash: string, signal?: AbortSignal): Promise<BackendProfile | null> {
  const cached = profileCache.get(metaHash);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.profile;
  }

  try {
    const res = await fetch(`/api/profile?hash=${encodeURIComponent(metaHash)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (res.status === 404 || res.status === 451) {
      // Not found or moderated → render as "merchant with no profile"
      profileCache.set(metaHash, { profile: null, fetchedAt: Date.now() });
      return null;
    }
    if (!res.ok) {
      // Other server errors — don't cache; let the next render try again
      return null;
    }
    const data = (await res.json()) as BackendProfile;
    // Light schema check before trusting it. Heavy validation happens on the
    // upload side; this is just "don't render garbage if the backend gets
    // confused or the schema drifts."
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.name !== 'string' || data.name.length === 0) return null;
    if (data.schemaVersion !== 1) return null;
    profileCache.set(metaHash, { profile: data, fetchedAt: Date.now() });
    return data;
  } catch {
    // Network error / abort / parse error — return null and let the UI fall back
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────

function truncate(address: string): string {
  if (!address || address.length < 12) return address || '0x…';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function useVaultIdentity(address: string | undefined): {
  identity: VaultIdentity | null;
  isLoading: boolean;
} {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const registryAddress = CONTRACT_ADDRESSES.MerchantRegistry;
  const registryAvailable = isConfiguredContractAddress(registryAddress);

  // Read MerchantRegistry.merchants(address). Returns the full Merchant struct:
  // { owner, vault, status (enum 0-3), refunds, disputes, metaHash }
  const {
    data: merchantData,
    isLoading: isReadingChain,
  } = useReadContract({
    address: registryAddress as Address | undefined,
    abi: MerchantRegistryABI,
    functionName: 'merchants',
    args: address ? [address as Address] : undefined,
    query: {
      // Don't bother querying if we have no address or no registry configured
      enabled: Boolean(address && registryAvailable),
      // Merchant state changes infrequently; 30s cache is plenty
      staleTime: 30_000,
    },
  });

  // Parse the on-chain read. ABI returns a tuple shape for struct getters.
  const chainStatus: 'NONE' | 'ACTIVE' | 'SUSPENDED' | 'DELISTED' | null = useMemo(() => {
    if (!merchantData) return null;
    // The struct getter returns positional values; status is index 2.
    // Some wagmi versions return objects with field names; handle both.
    let raw: unknown;
    if (Array.isArray(merchantData)) {
      raw = merchantData[2];
    } else if (typeof merchantData === 'object' && merchantData !== null) {
      raw = (merchantData as Record<string, unknown>).status;
    }
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) return null;
    switch (n) {
      case 0: return 'NONE';
      case 1: return 'ACTIVE';
      case 2: return 'SUSPENDED';
      case 3: return 'DELISTED';
      default: return null;
    }
  }, [merchantData]);

  const metaHash: string | null = useMemo(() => {
    if (!merchantData) return null;
    let raw: unknown;
    if (Array.isArray(merchantData)) {
      raw = merchantData[5];
    } else if (typeof merchantData === 'object' && merchantData !== null) {
      raw = (merchantData as Record<string, unknown>).metaHash;
    }
    if (typeof raw === 'string' && raw.startsWith('0x') && raw.length === 66) {
      return raw;
    }
    return null;
  }, [merchantData]);

  // Fetch profile from backend, but ONLY when status is ACTIVE or SUSPENDED
  // AND metaHash is nonzero. Per spec §7: DELISTED merchants short-circuit
  // before the profile fetch happens. NONE and zero-hash skip the fetch too.
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const shouldFetchProfile = Boolean(
    address &&
    (chainStatus === 'ACTIVE' || chainStatus === 'SUSPENDED') &&
    metaHash &&
    metaHash !== ZERO_HASH,
  );

  useEffect(() => {
    if (!shouldFetchProfile || !metaHash) {
      setProfile(null);
      return;
    }
    const ac = new AbortController();
    setIsFetchingProfile(true);
    fetchProfile(metaHash, ac.signal)
      .then((p) => {
        if (!ac.signal.aborted) setProfile(p);
      })
      .finally(() => {
        if (!ac.signal.aborted) setIsFetchingProfile(false);
      });
    return () => ac.abort();
  }, [metaHash, shouldFetchProfile]);

  // Compose the resolved identity. This is where spec §7 lives in code.
  const identity = useMemo<VaultIdentity | null>(() => {
    if (!address) return null;

    // Step 1: not a merchant or registry not configured → individual fallback
    if (!registryAvailable || chainStatus === null || chainStatus === 'NONE') {
      return {
        address,
        displayName: truncate(address),
        avatarUrl: null,
        hasProfile: false,
        isMerchant: false,
        isVerified: false,
        status: 'individual',
        bio: '',
        category: '',
      };
    }

    // Step 2: DELISTED short-circuit per spec §7 step 2 and §8 "Delisted merchants"
    if (chainStatus === 'DELISTED') {
      return {
        address,
        displayName: '[Delisted Merchant]',
        avatarUrl: null,
        hasProfile: false,
        isMerchant: true,
        isVerified: false,
        status: 'delisted',
        bio: '',
        category: '',
      };
    }

    // Step 3: ACTIVE or SUSPENDED merchant, but no profile pointed-to yet
    if (!metaHash || metaHash === ZERO_HASH) {
      return {
        address,
        displayName: truncate(address),
        avatarUrl: null,
        hasProfile: false,
        isMerchant: true,
        isVerified: chainStatus === 'ACTIVE',
        status: chainStatus === 'ACTIVE' ? 'active' : 'suspended',
        bio: '',
        category: '',
      };
    }

    // Step 4: profile fetch succeeded → render full identity
    if (profile) {
      return {
        address,
        displayName: profile.name,
        avatarUrl: profile.avatar ?? null,
        hasProfile: true,
        isMerchant: true,
        isVerified: chainStatus === 'ACTIVE',
        status: chainStatus === 'ACTIVE' ? 'active' : 'suspended',
        bio: profile.bio ?? '',
        category: profile.category ?? '',
      };
    }

    // Step 5: profile fetch in flight or failed → graceful fallback (spec §7 step 4)
    return {
      address,
      displayName: truncate(address),
      avatarUrl: null,
      hasProfile: false,
      isMerchant: true,
      isVerified: chainStatus === 'ACTIVE',
      status: chainStatus === 'ACTIVE' ? 'active' : 'suspended',
      bio: '',
      category: '',
    };
  }, [address, registryAvailable, chainStatus, metaHash, profile]);

  return {
    identity,
    isLoading: isReadingChain || isFetchingProfile,
  };
}
