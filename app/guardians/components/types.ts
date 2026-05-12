export { shortAddress } from "@/lib/format";
export { ZERO_ADDRESS } from "@/lib/contracts";
// ── Guardian types & constants ──────────────────────────────────────────────

export type TabType = 'overview' | 'my-guardians' | 'recovery' | 'responsibilities' | 'pending';

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

// ── Constants ───────────────────────────────────────────────────────────────
export const GUARDIAN_WATCHLIST_KEY = 'vfide.guardian-watchlist.v1';
export const MAX_WATCHLIST_ENTRIES = 50;
export const MAX_WATCHLIST_LABEL_LENGTH = 40;
export const MIN_ADD_INTERVAL_MS = 800;

// ── Utilities ───────────────────────────────────────────────────────────────
