import { useCallback, useEffect, useState } from 'react';
import {
  TwoFactorConfig,
  TwoFactorMethod,
  TOTPSetup,
  SECURITY_STORAGE_KEYS,
  validateTOTPCode,
  validateBackupCode,
  generateBackupCodes
} from '@/config/security-advanced';

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

// Mock TOTP secret generation (in production, use a library like otplib)
const generateTOTPSecret = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
};

// Mock TOTP QR code generation
const generateTOTPQR = (secret: string, email: string): string => {
  const issuer = 'VFIDE';
  const otpauth = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
  // In production, use a QR code library like qrcode or similar
  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="10" y="100" font-size="12">${otpauth}</text></svg>`;
};

// Mock TOTP verification (in production, use otplib or speakeasy)
const verifyTOTPInternal = (secret: string, code: string): boolean => {
  // Simple mock: accept code if it's 6 digits and matches pattern
  // In production, verify against time-based algorithm
  return validateTOTPCode(code);
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
    const qrCode = generateTOTPQR(secret, userEmail || 'user@vfide.com');
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
      localStorage.setItem('vfide:2fa:secret', totpSecret);
      localStorage.setItem('vfide:2fa:backup-codes', JSON.stringify(backupCodes));
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
    // In production: Send SMS verification code via Twilio/SNS
    // For now, mock implementation
    const codes = generateBackupCodes();
    setBackupCodes(codes);

    if (typeof window !== 'undefined') {
      localStorage.setItem('vfide:2fa:phone', phoneNumber);
      localStorage.setItem('vfide:2fa:backup-codes', JSON.stringify(codes));
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
    // In production: Send email verification code via SendGrid/SES
    const codes = generateBackupCodes();
    setBackupCodes(codes);

    if (typeof window !== 'undefined') {
      localStorage.setItem('vfide:2fa:email', email);
      localStorage.setItem('vfide:2fa:backup-codes', JSON.stringify(codes));
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
    const secret = localStorage.getItem('vfide:2fa:secret');
    if (!secret) return false;

    const valid = verifyTOTPInternal(secret, code);
    if (valid) {
      updateConfig({ lastVerified: new Date() });
    }
    return valid;
  }, [updateConfig]);

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
    if (typeof window === 'undefined') return false;
    if (!validateBackupCode(code)) return false;

    const stored = localStorage.getItem('vfide:2fa:backup-codes');
    if (!stored) return false;

    try {
      const codes: string[] = JSON.parse(stored);
      const index = codes.indexOf(code);
      if (index === -1) return false;

      // Remove used code
      codes.splice(index, 1);
      localStorage.setItem('vfide:2fa:backup-codes', JSON.stringify(codes));

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
      localStorage.removeItem('vfide:2fa:secret');
      localStorage.removeItem('vfide:2fa:phone');
      localStorage.removeItem('vfide:2fa:email');
      localStorage.removeItem('vfide:2fa:backup-codes');
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
      localStorage.setItem('vfide:2fa:backup-codes', JSON.stringify(codes));
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
