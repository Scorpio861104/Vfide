'use client';

/**
 * useMerchantProfile — the wizard's bridge to the backend + chain.
 *
 * Flow per VFIDE_MERCHANT_PROFILE_SPEC.md §10 implementation checklist:
 *   1. (Optional) Upload avatar file to /api/avatar → returns CDN URL
 *   2. Build profile JSON { schemaVersion: 1, name, avatar?, bio?, ... }
 *   3. POST profile JSON to /api/profile → returns { hash, cid }
 *   4. On chain:
 *      - If not yet a merchant: call MerchantRegistry.addMerchant(hash)
 *      - If already a merchant: call MerchantRegistry.setMetaHash(hash)
 *
 * Surfaces:
 *   - submit(input)         — runs the full flow, returns { txHash, profileHash, cid }
 *   - registrationStatus    — 'none' | 'active' | 'suspended' | 'delisted' (read live)
 *   - isSubmitting          — true while any step is in flight
 *   - error                 — last error message, null when clean
 *   - resetError()
 *
 * Failure modes the hook handles:
 *   - Avatar upload fails → flow aborts, no chain transaction
 *   - Profile POST fails → flow aborts, no chain transaction
 *   - Chain call rejected by user → backend state is fine; the profile bytes
 *     are stored but no merchant points at them. Garbage collection of
 *     orphan profiles is a backend concern, not a frontend one.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { MerchantRegistryABI } from '@/lib/abis';
import { useContractAddresses } from './useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

export interface ProfileSubmitInput {
  /** Required. 1-48 chars. Will be trimmed. */
  name: string;
  /** Optional. File from <input type="file">. Uploaded to /api/avatar. */
  avatarFile?: File | null;
  /** Optional. If avatarUrl is set directly (e.g. unchanged when editing), skip upload. */
  avatarUrl?: string | null;
  /** Optional. 0-280 chars. */
  bio?: string;
  /** Optional. One of the spec categories. */
  category?: string;
  /** Optional. Up to 3 entries. */
  links?: Array<{ label: string; url: string }>;
}

export interface ProfileSubmitResult {
  txHash: string;
  profileHash: string;
  cid: string;
}

export type RegistrationStatus = 'none' | 'active' | 'suspended' | 'delisted' | 'unknown';

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function useMerchantProfile() {
  const { address } = useAccount();
  const CONTRACT_ADDRESSES = useContractAddresses();
  const registryAddress = CONTRACT_ADDRESSES.MerchantRegistry as Address | undefined;
  const registryAvailable = isConfiguredContractAddress(registryAddress);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    'idle' | 'uploading-avatar' | 'storing-profile' | 'awaiting-signature' | 'confirming-tx' | 'done'
  >('idle');

  // Read current registration state so the wizard can branch on first-time vs editing
  const { data: merchantData, refetch: refetchMerchant } = useReadContract({
    address: registryAddress,
    abi: MerchantRegistryABI,
    functionName: 'merchants',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && registryAvailable) },
  });

  const registrationStatus: RegistrationStatus = useMemo(() => {
    if (!merchantData) return 'unknown';
    let raw: unknown;
    if (Array.isArray(merchantData)) {
      raw = merchantData[2];
    } else if (typeof merchantData === 'object' && merchantData !== null) {
      raw = (merchantData as Record<string, unknown>).status;
    }
    const n = typeof raw === 'number' ? raw : Number(raw);
    switch (n) {
      case 0: return 'none';
      case 1: return 'active';
      case 2: return 'suspended';
      case 3: return 'delisted';
      default: return 'unknown';
    }
  }, [merchantData]);

  const currentMetaHash: string | null = useMemo(() => {
    if (!merchantData) return null;
    let raw: unknown;
    if (Array.isArray(merchantData)) {
      raw = merchantData[5];
    } else if (typeof merchantData === 'object' && merchantData !== null) {
      raw = (merchantData as Record<string, unknown>).metaHash;
    }
    if (typeof raw === 'string' && raw.startsWith('0x') && raw.length === 66) {
      return raw === ZERO_HASH ? null : raw;
    }
    return null;
  }, [merchantData]);

  const { writeContractAsync } = useWriteContract();
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const { data: receipt, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
    query: { enabled: Boolean(pendingTxHash) },
  });

  const resetError = useCallback(() => setError(null), []);

  const submit = useCallback(
    async (input: ProfileSubmitInput): Promise<ProfileSubmitResult> => {
      if (!address) throw new Error('Connect a wallet first.');
      if (!registryAvailable || !registryAddress) {
        throw new Error('MerchantRegistry contract address not configured for this chain.');
      }
      if (registrationStatus === 'delisted') {
        throw new Error('Delisted merchants cannot update their profile.');
      }

      setIsSubmitting(true);
      setError(null);
      try {
        // Step 1: avatar upload (optional)
        let finalAvatarUrl: string | null = input.avatarUrl ?? null;
        if (input.avatarFile) {
          setCurrentStep('uploading-avatar');
          const formData = new FormData();
          formData.append('file', input.avatarFile);
          const avatarRes = await fetch('/api/avatar', {
            method: 'POST',
            body: formData,
          });
          if (!avatarRes.ok) {
            const body = await avatarRes.json().catch(() => ({}));
            throw new Error(
              `Avatar upload failed: ${body.error || avatarRes.statusText}`,
            );
          }
          const avatarJson = (await avatarRes.json()) as { url: string };
          finalAvatarUrl = avatarJson.url;
        }

        // Step 2: build the profile JSON exactly per spec §3
        const profile: Record<string, unknown> = {
          schemaVersion: 1,
          name: input.name.trim(),
          createdAt: new Date().toISOString(),
        };
        if (finalAvatarUrl) profile.avatar = finalAvatarUrl;
        if (input.bio && input.bio.trim().length > 0) profile.bio = input.bio.trim();
        if (input.category) profile.category = input.category;
        if (input.links && input.links.length > 0) {
          const cleaned = input.links
            .filter((l) => l.label.trim().length > 0 && l.url.trim().length > 0)
            .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
          if (cleaned.length > 0) profile.links = cleaned;
        }

        // Step 3: POST to backend
        setCurrentStep('storing-profile');
        const profileRes = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
        if (!profileRes.ok) {
          const body = await profileRes.json().catch(() => ({}));
          throw new Error(
            `Profile validation failed: ${body.error || profileRes.statusText}` +
              (body.details ? ` (${body.details.join('; ')})` : ''),
          );
        }
        const profileJson = (await profileRes.json()) as {
          hash: string;
          cid: string;
          canonicalSize: number;
        };

        // Step 4: chain call — addMerchant for first-time, setMetaHash for update
        setCurrentStep('awaiting-signature');
        const isFirstTime = registrationStatus === 'none' || registrationStatus === 'unknown';
        const txHash = await writeContractAsync({
          address: registryAddress,
          abi: MerchantRegistryABI,
          functionName: isFirstTime ? 'addMerchant' : 'setMetaHash',
          args: [profileJson.hash as `0x${string}`],
        });
        setPendingTxHash(txHash);
        setCurrentStep('confirming-tx');

        // Wait briefly for the receipt watcher to fire; the wizard can also
        // listen for isTxConfirmed if it wants its own UX.
        // Returning the txHash immediately lets the caller move on.
        return {
          txHash,
          profileHash: profileJson.hash,
          cid: profileJson.cid,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setCurrentStep('idle');
        throw e;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, registryAddress, registryAvailable, registrationStatus, writeContractAsync],
  );

  // When the on-chain confirmation lands, refresh the merchants() read so the
  // wizard sees the updated state without a manual reload.
  useEffect(() => {
    if (isTxConfirmed && currentStep === 'confirming-tx') {
      setCurrentStep('done');
      refetchMerchant();
    }
  }, [isTxConfirmed, currentStep, refetchMerchant]);

  return {
    submit,
    isSubmitting,
    currentStep,
    error,
    resetError,
    registrationStatus,
    currentMetaHash,
    isTxConfirmed,
    txHash: pendingTxHash,
    receipt,
  };
}
