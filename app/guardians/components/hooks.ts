'use client';

import { useState, useEffect } from 'react';
import { isAddress } from 'viem';

import type { WatchedVault, NextOfKinWatchedVault, GuardianAttestationRecord } from './types';
import {
  GUARDIAN_WATCHLIST_KEY,
  NEXT_OF_KIN_WATCHLIST_KEY,
  MAX_WATCHLIST_ENTRIES,
  MAX_WATCHLIST_LABEL_LENGTH,
  MIN_ADD_INTERVAL_MS,
  shortAddress,
} from './types';

// ── useGuardianWatchlist ────────────────────────────────────────────────────
export function useGuardianWatchlist() {
  const [entries, setEntries] = useState<WatchedVault[]>([]);
  const [lastAddAt, setLastAddAt] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(GUARDIAN_WATCHLIST_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Array<{ address: string; label?: string; addedAt?: number }>;
      const normalized = parsed
        .filter((item) => isAddress(item.address))
        .map((item) => ({
          address: item.address.toLowerCase() as `0x${string}`,
          label: (item.label || '').trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH),
          addedAt: item.addedAt || Date.now(),
          source: 'watchlist' as const,
        }));
      setEntries(normalized.slice(0, MAX_WATCHLIST_ENTRIES));
    } catch {
      setEntries([]);
    }
  }, []);

  const save = (next: WatchedVault[]) => {
    setEntries(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUARDIAN_WATCHLIST_KEY, JSON.stringify(next));
    }
  };

  const addEntry = (address: string, label: string) => {
    const now = Date.now();
    if (now - lastAddAt < MIN_ADD_INTERVAL_MS) {
      return { ok: false, message: 'Please wait a moment before adding another vault.' };
    }
    if (entries.length >= MAX_WATCHLIST_ENTRIES) {
      return { ok: false, message: `Watchlist limit reached (${MAX_WATCHLIST_ENTRIES} vaults). Remove one before adding another.` };
    }
    const normalized = address.toLowerCase() as `0x${string}`;
    if (!isAddress(normalized)) return { ok: false, message: 'Enter a valid vault address.' };
    if (entries.some((entry) => entry.address.toLowerCase() === normalized)) {
      return { ok: false, message: 'Vault is already in your guardian watchlist.' };
    }
    const cleanLabel = label.trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH);
    const next = [{ address: normalized, label: cleanLabel, addedAt: now, source: 'watchlist' as const }, ...entries];
    save(next);
    setLastAddAt(now);
    return { ok: true, message: 'Vault added to guardian watchlist.' };
  };

  const removeEntry = (address: string) => {
    const normalized = address.toLowerCase();
    const next = entries.filter((entry) => entry.address.toLowerCase() !== normalized);
    save(next);
  };

  return { entries, addEntry, removeEntry };
}

// ── useNextOfKinWatchlist ───────────────────────────────────────────────────
export function useNextOfKinWatchlist() {
  const [entries, setEntries] = useState<NextOfKinWatchedVault[]>([]);
  const [lastAddAt, setLastAddAt] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(NEXT_OF_KIN_WATCHLIST_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Array<{ address: string; label?: string; addedAt?: number }>;
      const normalized = parsed
        .filter((item) => isAddress(item.address))
        .map((item) => ({
          address: item.address.toLowerCase() as `0x${string}`,
          label: (item.label || '').trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH),
          addedAt: item.addedAt || Date.now(),
        }));
      setEntries(normalized.slice(0, MAX_WATCHLIST_ENTRIES));
    } catch {
      setEntries([]);
    }
  }, []);

  const save = (next: NextOfKinWatchedVault[]) => {
    setEntries(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NEXT_OF_KIN_WATCHLIST_KEY, JSON.stringify(next));
    }
  };

  const addEntry = (address: string, label: string) => {
    const now = Date.now();
    if (now - lastAddAt < MIN_ADD_INTERVAL_MS) {
      return { ok: false, message: 'Please wait a moment before adding another vault.' };
    }
    if (entries.length >= MAX_WATCHLIST_ENTRIES) {
      return { ok: false, message: `Watchlist limit reached (${MAX_WATCHLIST_ENTRIES} vaults). Remove one before adding another.` };
    }
    const normalized = address.toLowerCase() as `0x${string}`;
    if (!isAddress(normalized)) return { ok: false, message: 'Enter a valid vault address.' };
    if (entries.some((entry) => entry.address.toLowerCase() === normalized)) {
      return { ok: false, message: 'Vault is already in your Next of Kin inbox.' };
    }
    const cleanLabel = label.trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH);
    const next = [{ address: normalized, label: cleanLabel, addedAt: now }, ...entries];
    save(next);
    setLastAddAt(now);
    return { ok: true, message: 'Vault added to Next of Kin inbox.' };
  };

  const removeEntry = (address: string) => {
    const normalized = address.toLowerCase();
    const next = entries.filter((entry) => entry.address.toLowerCase() !== normalized);
    save(next);
  };

  return { entries, addEntry, removeEntry };
}

// ── useGuardianAttestations ─────────────────────────────────────────────────
export function useGuardianAttestations(guardianAddress?: `0x${string}`) {
  const [attestations, setAttestations] = useState<GuardianAttestationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!guardianAddress || typeof fetch !== 'function') {
      setAttestations([]);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/security/guardian-attestations?guardian=${guardianAddress}&limit=200`);
        if (!response.ok) return;
        const data = (await response.json()) as { attestations?: GuardianAttestationRecord[] };
        if (!cancelled) {
          setAttestations(Array.isArray(data.attestations) ? data.attestations : []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => { void load(); }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [guardianAddress]);

  return { attestations, isLoading };
}

// ── mergeInboxEntries ───────────────────────────────────────────────────────
export function mergeInboxEntries(watchlist: WatchedVault[], attestations: GuardianAttestationRecord[]) {
  const map = new Map<string, WatchedVault>();

  for (const item of watchlist) {
    map.set(item.address.toLowerCase(), item);
  }

  for (const att of attestations) {
    const key = att.vault.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        address: att.vault,
        label: `Attested by ${shortAddress(att.owner)}`,
        addedAt: att.issuedAt * 1000,
        source: 'attestation',
      });
    }
  }

  return Array.from(map.values());
}
