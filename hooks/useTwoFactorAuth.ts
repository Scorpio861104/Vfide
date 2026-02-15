import { useCallback, useState } from 'react';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';
import { getEncryptedItem, removeEncryptedItem, setEncryptedItem } from '@/lib/storage/encryptedStorage';
import {
  TwoFactorConfig,
  TwoFactorMethod,
  TOTPSetup,
  SECURITY_STORAGE_KEYS,
  validateTOTPCode,
  validateBackupCode,
  generateBackupCodes
} from '@/config/security-advanced';

/**
 * SECURITY WARNING: TOTP 2FA in this module is CLIENT-SIDE ONLY.
 * The TOTP secret is generated and stored in the browser (localStorage/encryptedStorage).
 * Verification happens entirely in JavaScript without server validation.
 * This does NOT provide real 2FA security - it can be bypassed by clearing localStorage.
 * For production security, TOTP secrets must be generated and verified server-side.
 * SMS and Email 2FA methods do use server-side verification via /api/security/2fa/*.
 */

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

const generateTOTPSecret = (): string => {
  return authenticator.generateSecret();
};

const generateTOTPQR = async (secret: string, email: string): Promise<string> => {
  const issuer = 'VFIDE';
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth);
};

const verifyTOTPInternal = (secret: string, code: string): boolean => {
  if (!validateTOTPCode(code)) return false;
  return authenticator.check(code, secret);
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
    const stored = localStorage.getItem(SECURITY_STORAGE_KEYS.twoFactor);
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
    console.error('Failed to load 2FA config', error);
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
  localStorage.setItem(SECURITY_STORAGE_KEYS.twoFactor, JSON.stringify(config));
};

export const useTwoFactorAuth = (userEmail?: string): UseTwoFactorAuthResult => {
  const [config, setConfig] = useState<TwoFactorConfig>(loadConfig());
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const updateConfig = useCallback((updates: Partial<TwoFactorConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const initiateTOTP = useCallback(async (): Promise<TOTPSetup> => {
    const secret = generateTOTPSecret();
    const qrCode = await generateTOTPQR(secret, userEmail || 'user@vfide.com');
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

    // Store secret securely (in production, encrypt or use secure storage)
    if (typeof window !== 'undefined') {
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorSecret, totpSecret);
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes, JSON.stringify(backupCodes));
    }

    updateConfig({
      enabled: true,
      method: 'totp',
      backupCodesRemaining: backupCodes.length,
      lastVerified: new Date()
    });

    return true;
  }, [totpSecret, backupCodes, updateConfig]);

  const enableSMS = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    const response = await fetch('/api/security/2fa/initiate', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ method: 'sms', destination: phoneNumber }),
    });

    if (!response.ok) {
      return false;
    }

    const codes = generateBackupCodes();
    setBackupCodes(codes);

    if (typeof window !== 'undefined') {
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorPhone, phoneNumber);
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes, JSON.stringify(codes));
    }

    updateConfig({
      enabled: true,
      method: 'sms',
      backupCodesRemaining: codes.length,
      lastVerified: new Date()
    });

    return true;
  }, [updateConfig]);

  const enableEmail = useCallback(async (email: string): Promise<boolean> => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    const response = await fetch('/api/security/2fa/initiate', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ method: 'email', destination: email }),
    });

    if (!response.ok) {
      return false;
    }

    const codes = generateBackupCodes();
    setBackupCodes(codes);

    if (typeof window !== 'undefined') {
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorEmail, email);
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes, JSON.stringify(codes));
    }

    updateConfig({
      enabled: true,
      method: 'email',
      backupCodesRemaining: codes.length,
      lastVerified: new Date()
    });

    return true;
  }, [updateConfig]);

  const verifyTOTP = useCallback(async (code: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const secret = await getEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorSecret);
    if (!secret) return false;

    const valid = verifyTOTPInternal(secret, code);
    if (valid) {
      updateConfig({ lastVerified: new Date() });
    }
    return valid;
  }, [updateConfig]);

  const verifySMS = useCallback(async (code: string): Promise<boolean> => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    const response = await fetch('/api/security/2fa/verify', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ method: 'sms', code }),
    });

    if (!response.ok) return false;
    updateConfig({ lastVerified: new Date() });
    return true;
  }, [updateConfig]);

  const verifyEmail = useCallback(async (code: string): Promise<boolean> => {
    const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
    const response = await fetch('/api/security/2fa/verify', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ method: 'email', code }),
    });

    if (!response.ok) return false;
    updateConfig({ lastVerified: new Date() });
    return true;
  }, [updateConfig]);

  const verifyBackupCode = useCallback(async (code: string): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!validateBackupCode(code)) return false;

    const stored = await getEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes);
    if (!stored) return false;

    try {
      const codes: string[] = JSON.parse(stored);
      const index = codes.indexOf(code);
      if (index === -1) return false;

      // Remove used code
      codes.splice(index, 1);
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes, JSON.stringify(codes));

      updateConfig({
        backupCodesRemaining: codes.length,
        lastVerified: new Date()
      });

      return true;
    } catch (_error) {
      return false;
    }
  }, [updateConfig]);

  const disable = useCallback(async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      removeEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorSecret);
      removeEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorPhone);
      removeEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorEmail);
      removeEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes);
    }

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

    if (typeof window !== 'undefined') {
      await setEncryptedItem(SECURITY_STORAGE_KEYS.twoFactorBackupCodes, JSON.stringify(codes));
    }

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
