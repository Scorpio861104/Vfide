import { useCallback, useEffect, useState } from 'react';
import { generateURI, verifySync } from 'otplib';
import {
  TwoFactorConfig,
  TwoFactorMethod,
  TOTPSetup,
  SECURITY_STORAGE_KEYS,
  validateTOTPCode,
  validateBackupCode,
  generateBackupCodes
} from '@/config/security-advanced';
import { logger } from '@/lib/logger';
import { safeLocalStorage } from '@/lib/utils';

export interface UseTwoFactorAuthResult {
  config: TwoFactorConfig;
  isEnabled: boolean;
  method: TwoFactorMethod | null;
  backupCodesRemaining: number;
  
  // Setup methods
  initiateTOTP: () => Promise<TOTPSetup>;
  enableTOTP: (code: string) => Promise<boolean>;
  enableSMS: (phoneNumber: string) => Promise<boolean>;
  enableEmail: (email: string) => Promise<boolean>;
  
  // Verification methods
  verifyTOTP: (code: string) => Promise<boolean>;
  verifySMS: (code: string) => Promise<boolean>;
  verifyEmail: (code: string) => Promise<boolean>;
  verifyBackupCode: (code: string) => Promise<boolean>;
  
  // Management
  disable: () => Promise<void>;
  regenerateBackupCodes: () => Promise<string[]>;
  testVerification: (code: string) => boolean;
}

// Cryptographically secure TOTP secret generation using Web Crypto API.
// Produces a 20-byte (160-bit) secret encoded as Base32, compatible with
// RFC 6238 TOTP and authenticator apps (Google Authenticator, Authy, etc.).
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const generateTOTPSecret = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let secret = '';
  // Base32 encodes 5 bits per character.
  // We accumulate bits from each byte (8 bits) into a running buffer,
  // then emit one Base32 character (5 bits) whenever we have ≥5 bits available.
  let buffer = 0;   // running bit buffer
  let bitsLeft = 0; // how many valid bits are currently in `buffer`
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte; // push the next 8 bits into the buffer
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      // Extract the top 5 bits and map to a Base32 character
      secret += BASE32_CHARS[(buffer >> bitsLeft) & 0x1f];
    }
  }
  return secret;
};

// Verify a TOTP code against the given Base32 secret using RFC 6238.
// `otplib` v13 returns a verification result object, so we normalize that
// to a simple boolean for the rest of the hook.
const verifyTOTPInternal = (secret: string, code: string): boolean => {
  if (!validateTOTPCode(code)) return false;
  try {
    return verifySync({ token: code, secret }).valid;
  } catch {
    return false;
  }
};

const loadConfig = (): TwoFactorConfig => {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      method: null,
      backupCodesRemaining: 0,
      lastVerified: null
    };
  }

  try {
    const stored = safeLocalStorage.getItem(SECURITY_STORAGE_KEYS.twoFactor);
    if (!stored) return {
      enabled: false,
      method: null,
      backupCodesRemaining: 0,
      lastVerified: null
    };

    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      lastVerified: parsed.lastVerified ? new Date(parsed.lastVerified) : null
    };
  } catch (error) {
    logger.error('Failed to load 2FA config', error);
    return {
      enabled: false,
      method: null,
      backupCodesRemaining: 0,
      lastVerified: null
    };
  }
};

const saveConfig = (config: TwoFactorConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    safeLocalStorage.setItem(SECURITY_STORAGE_KEYS.twoFactor, JSON.stringify(config));
  } catch (e) {
    logger.error('Failed to save 2FA config', e);
  }
};

export const useTwoFactorAuth = (userEmail?: string): UseTwoFactorAuthResult => {
  const [config, setConfig] = useState<TwoFactorConfig>(loadConfig());
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    const loaded = loadConfig();
    setConfig(loaded);
  }, []);

  const updateConfig = useCallback((updates: Partial<TwoFactorConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const initiateTOTP = useCallback(async (): Promise<TOTPSetup> => {
    const secret = generateTOTPSecret();
    // Build a valid otpauth:// URI that any authenticator app can scan as a QR code.
    // A unique identifier (wallet address, email, or UUID) is required so that
    // users who register multiple accounts can distinguish them in their app.
    // Callers should always supply `userEmail`; if omitted we fall back to a
    // generated placeholder that remains unique per session via the secret itself.
    const account = userEmail ?? `vfide-user-${secret.slice(0, 8)}`;
    const qrCode = generateURI({
      issuer: 'VFIDE',
      label: account,
      secret,
    });
    const codes = generateBackupCodes();

    setTotpSecret(secret);
    setBackupCodes(codes);

    return {
      secret,
      qrCode,
      backupCodes: codes
    };
  }, [userEmail]);

  const enableTOTP = useCallback(async (code: string): Promise<boolean> => {
    if (!totpSecret) return false;
    if (!verifyTOTPInternal(totpSecret, code)) return false;

    updateConfig({
      enabled: true,
      method: 'totp',
      backupCodesRemaining: backupCodes.length,
      lastVerified: new Date()
    });

    return true;
  }, [totpSecret, backupCodes, updateConfig]);

  const enableSMS = useCallback(async (_phoneNumber: string): Promise<boolean> => {
    return false;
  }, [updateConfig]);

  const enableEmail = useCallback(async (_email: string): Promise<boolean> => {
    return false;
  }, [updateConfig]);

  const verifyTOTP = useCallback(async (code: string): Promise<boolean> => {
    if (!totpSecret) return false;
    const valid = verifyTOTPInternal(totpSecret, code);
    if (valid) {
      updateConfig({ lastVerified: new Date() });
    }
    return valid;
  }, [totpSecret, updateConfig]);

  const verifySMS = useCallback(async (code: string): Promise<boolean> => {
    // In production: Verify via backend API
    const valid = validateTOTPCode(code);
    if (valid) {
      updateConfig({ lastVerified: new Date() });
    }
    return valid;
  }, [updateConfig]);

  const verifyEmail = useCallback(async (code: string): Promise<boolean> => {
    // In production: Verify via backend API
    const valid = validateTOTPCode(code);
    if (valid) {
      updateConfig({ lastVerified: new Date() });
    }
    return valid;
  }, [updateConfig]);

  const verifyBackupCode = useCallback(async (code: string): Promise<boolean> => {
    if (!validateBackupCode(code)) return false;

    const index = backupCodes.indexOf(code);
    if (index === -1) return false;

    const nextCodes = backupCodes.filter((_, i) => i !== index);
    setBackupCodes(nextCodes);
    updateConfig({
      backupCodesRemaining: nextCodes.length,
      lastVerified: new Date()
    });

    return true;
  }, [backupCodes, updateConfig]);

  const disable = useCallback(async (): Promise<void> => {
    setTotpSecret(null);
    setBackupCodes([]);

    updateConfig({
      enabled: false,
      method: null,
      backupCodesRemaining: 0,
      lastVerified: null
    });
  }, [updateConfig]);

  const regenerateBackupCodes = useCallback(async (): Promise<string[]> => {
    const codes = generateBackupCodes();
    setBackupCodes(codes);

    updateConfig({ backupCodesRemaining: codes.length });
    return codes;
  }, [updateConfig]);

  const testVerification = useCallback((code: string): boolean => {
    if (config.method === 'backup') {
      return validateBackupCode(code);
    }
    return validateTOTPCode(code);
  }, [config.method]);

  return {
    config,
    isEnabled: config.enabled,
    method: config.method,
    backupCodesRemaining: config.backupCodesRemaining,
    initiateTOTP,
    enableTOTP,
    enableSMS,
    enableEmail,
    verifyTOTP,
    verifySMS,
    verifyEmail,
    verifyBackupCode,
    disable,
    regenerateBackupCodes,
    testVerification
  };
};
