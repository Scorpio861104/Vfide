'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppLockConfig,
  AppLockMethod,
  endSession,
  getPinLockoutUntil,
  loadConfig,
  recordPinFailure,
  recordPinSuccess,
  requiresUnlock,
  saveConfig,
  startSession,
  verifyPin,
} from '@/lib/security/appLock';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { AppLockModal } from './AppLockModal';

interface PendingPrompt {
  amount: bigint;
  label?: string;
  resolve: (ok: boolean) => void;
}

interface AppLockContextValue {
  config: AppLockConfig;
  /** Persist a config change AND re-emit to subscribers. */
  setConfig: (next: AppLockConfig) => void;
  /**
   * Ask the user to unlock if the amount crosses the threshold.
   * Resolves true if the action may proceed (either no prompt needed
   * or the user successfully authenticated), false if the user
   * cancelled or failed.
   */
  requestUnlock: (amount: bigint, label?: string) => Promise<boolean>;
  /** Immediately end the current unlock session — used when the user
   *  taps "lock now" in settings. */
  lock: () => void;
}

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) {
    throw new Error(
      'useAppLock must be used within an AppLockProvider. Wrap your app root with <AppLockProvider>.',
    );
  }
  return ctx;
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<AppLockConfig>(() => loadConfig());
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const biometric = useBiometricAuth();

  // Cross-tab sync: when AppLock config changes in another tab, mirror it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === 'vfide_app_lock_config') {
        setConfigState(loadConfig());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setConfig = useCallback((next: AppLockConfig) => {
    saveConfig(next);
    setConfigState(next);
  }, []);

  const lock = useCallback(() => {
    endSession();
  }, []);

  const requestUnlock = useCallback(
    (amount: bigint, label?: string): Promise<boolean> => {
      const current = loadConfig();
      // Sync local state in case storage drifted (rare, but cheap).
      setConfigState(current);

      if (!requiresUnlock(amount, current)) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        setPending({ amount, label, resolve });
      });
    },
    [],
  );

  // ─── Modal callbacks ──────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (pending) {
      pending.resolve(false);
      setPending(null);
    }
  }, [pending]);

  const handleWebAuthn = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const ok = await biometric.verify();
      if (ok) {
        const fresh = loadConfig();
        startSession(fresh);
        pending?.resolve(true);
        setPending(null);
        return { ok: true };
      }
      return { ok: false, error: 'Biometric verification failed. Try again or use PIN.' };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Biometric verification error.',
      };
    }
  }, [biometric, pending]);

  const handlePin = useCallback(
    async (pin: string): Promise<{ ok: boolean; error?: string; lockedUntilMs?: number }> => {
      const current = loadConfig();
      const lockedUntil = getPinLockoutUntil(current);
      if (lockedUntil > 0) {
        return { ok: false, error: 'Too many wrong attempts. Try again later.', lockedUntilMs: lockedUntil };
      }
      const ok = await verifyPin(pin, current);
      if (ok) {
        const next = recordPinSuccess(current);
        setConfigState(next);
        startSession(next);
        pending?.resolve(true);
        setPending(null);
        return { ok: true };
      }
      const next = recordPinFailure(current);
      setConfigState(next);
      if (next.lockedUntilMs > Date.now()) {
        return {
          ok: false,
          error: 'Too many wrong attempts. Try again later.',
          lockedUntilMs: next.lockedUntilMs,
        };
      }
      return { ok: false, error: 'Incorrect PIN.' };
    },
    [pending],
  );

  // ─── React-stable ctx value ───────────────────────────────────────────────

  const value = useMemo<AppLockContextValue>(
    () => ({ config, setConfig, requestUnlock, lock }),
    [config, setConfig, requestUnlock, lock],
  );

  const availableMethods: AppLockMethod[] = config.methods;
  const lockoutUntilMs = getPinLockoutUntil(config);

  return (
    <AppLockContext.Provider value={value}>
      {children}
      {pending && (
        <AppLockModal
          amountWei={pending.amount}
          label={pending.label}
          methods={availableMethods}
          pinLockoutUntilMs={lockoutUntilMs}
          onCancel={handleCancel}
          onTryWebAuthn={handleWebAuthn}
          onTryPin={handlePin}
        />
      )}
    </AppLockContext.Provider>
  );
}
