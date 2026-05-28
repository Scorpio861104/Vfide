'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, KeyRound, X, Loader2 } from 'lucide-react';
import { thresholdWeiToVfide, AppLockMethod } from '@/lib/security/appLock';

interface AppLockModalProps {
  amountWei: bigint;
  label?: string;
  methods: AppLockMethod[];
  pinLockoutUntilMs: number;
  onCancel: () => void;
  onTryWebAuthn: () => Promise<{ ok: boolean; error?: string }>;
  onTryPin: (pin: string) => Promise<{ ok: boolean; error?: string; lockedUntilMs?: number }>;
}

type Tab = 'webauthn' | 'pin';

export function AppLockModal({
  amountWei,
  label,
  methods,
  pinLockoutUntilMs,
  onCancel,
  onTryWebAuthn,
  onTryPin,
}: AppLockModalProps) {
  const hasWebAuthn = methods.includes('webauthn');
  const hasPin = methods.includes('pin');
  const defaultTab: Tab = hasWebAuthn ? 'webauthn' : 'pin';

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number>(pinLockoutUntilMs);
  const [nowTick, setNowTick] = useState(Date.now());
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (tab === 'pin' && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [tab]);

  // Tick every second while lockout is active so the countdown updates.
  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  const lockoutRemainingMs = Math.max(0, lockoutUntil - nowTick);
  const lockoutSecondsLeft = Math.ceil(lockoutRemainingMs / 1000);

  // Auto-trigger WebAuthn prompt when the modal opens on that tab.
  useEffect(() => {
    if (tab !== 'webauthn' || busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await onTryWebAuthn();
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error || 'Biometric verification failed.');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
     
  }, [tab]);

  const submitPin = async () => {
    if (busy) return;
    if (!pin) {
      setError('Enter your PIN.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onTryPin(pin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Incorrect PIN.');
      setPin('');
      if (res.lockedUntilMs) setLockoutUntil(res.lockedUntilMs);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm transaction with App Lock"
      >
        <motion.div
          className="relative w-full max-w-sm rounded-2xl border border-accent/30 bg-gray-900 p-6 shadow-2xl"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
        >
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 text-gray-400 hover:text-white"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>

          <div className="text-center mb-4">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
              {label ?? 'Confirm transaction'}
            </div>
            <div className="text-2xl font-bold text-white">
              {thresholdWeiToVfide(amountWei.toString())} VFIDE
            </div>
            <div className="text-xs text-gray-500 mt-1">
              App Lock is on for this device. Verify to continue.
            </div>
          </div>

          {hasWebAuthn && hasPin && (
            <div className="flex gap-2 mb-4 rounded-lg bg-gray-800 p-1">
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tab === 'webauthn'
                    ? 'bg-accent-dark text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => {
                  setTab('webauthn');
                  setError(null);
                }}
              >
                <Fingerprint size={14} /> Biometric
              </button>
              <button
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  tab === 'pin' ? 'bg-accent-dark text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => {
                  setTab('pin');
                  setError(null);
                }}
              >
                <KeyRound size={14} /> PIN
              </button>
            </div>
          )}

          {tab === 'webauthn' ? (
            <div className="text-center py-6">
              {busy ? (
                <div className="flex flex-col items-center gap-3 text-accent">
                  <Loader2 size={32} className="animate-spin" />
                  <div className="text-sm">Waiting for biometric…</div>
                </div>
              ) : (
                <div className="text-sm text-gray-300">
                  <Fingerprint size={36} className="mx-auto mb-3 text-accent" />
                  Use your device biometric to confirm.
                  {error && (
                    <div className="mt-3 text-red-400 text-xs">{error}</div>
                  )}
                  <button
                    className="mt-4 px-4 py-2 rounded-lg bg-accent-dark hover:bg-accent text-white text-sm font-medium"
                    onClick={async () => {
                      setBusy(true);
                      setError(null);
                      const res = await onTryWebAuthn();
                      setBusy(false);
                      if (!res.ok) setError(res.error || 'Biometric verification failed.');
                    }}
                  >
                    Retry biometric
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={busy || lockoutRemainingMs > 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitPin();
                }}
                placeholder="Enter PIN"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-white text-center text-lg tracking-widest focus:outline-none focus:border-accent disabled:opacity-50"
              />
              {lockoutRemainingMs > 0 ? (
                <div className="mt-3 text-center text-sm text-amber-400">
                  Locked. Try again in {lockoutSecondsLeft}s.
                </div>
              ) : error ? (
                <div className="mt-3 text-center text-sm text-red-400">{error}</div>
              ) : (
                <div className="mt-3 text-center text-xs text-gray-500">
                  6–32 characters. 3 wrong attempts → 5-minute soft lockout.
                </div>
              )}
              <button
                onClick={submitPin}
                disabled={busy || lockoutRemainingMs > 0}
                className="w-full mt-4 py-3 rounded-lg bg-accent-dark hover:bg-accent text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {busy ? 'Verifying…' : 'Unlock'}
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Cancel transaction
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
