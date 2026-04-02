export { shortAddress } from "@/lib/format";
// ── Guardian types & constants ──────────────────────────────────────────────

export type TabType = 'overview' | 'my-guardians' | 'next-of-kin' | 'recovery' | 'responsibilities' | 'pending';

export type WatchedVault = {
  address: `0x${string}`;
  label: string;
  addedAt: number;
  source: 'watchlist' | 'attestation';
};

export type GuardianAttestationRecord = {
  owner: `0x${string}`;
  vault: `0x${string}`;
  guardian: `0x${string}`;
  issuedAt: number;
  expiresAt: number;
};

export type NextOfKinWatchedVault = {
  address: `0x${string}`;
  label: string;
  addedAt: number;
};

// ── Constants ───────────────────────────────────────────────────────────────
export const GUARDIAN_WATCHLIST_KEY = 'vfide.guardian-watchlist.v1';
export const NEXT_OF_KIN_WATCHLIST_KEY = 'vfide.next-of-kin-watchlist.v1';
export const MAX_WATCHLIST_ENTRIES = 50;
export const MAX_WATCHLIST_LABEL_LENGTH = 40;
export const MIN_ADD_INTERVAL_MS = 800;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ── Utilities ───────────────────────────────────────────────────────────────
