import { useCallback, useEffect, useState } from 'react';
import {
  BiometricConfig,
  BiometricCredential,
  BiometricType,
  SECURITY_STORAGE_KEYS
} from '@/config/security-advanced';

export interface UseBiometricAuthResult {
  config: BiometricConfig;
  isEnabled: boolean;
  hasCredentials: boolean;
  credentials: BiometricCredential[];
  platformSupport: BiometricConfig['platformSupport'];
  
  // Setup methods
  enroll: (name: string, type?: BiometricType) => Promise<BiometricCredential | null>;
  remove: (credentialId: string) => Promise<boolean>;
  
  // Verification
  verify: () => Promise<boolean>;
  
  // Management
  checkSupport: () => Promise<BiometricConfig['platformSupport']>;
  listCredentials: () => BiometricCredential[];
}

const checkPlatformSupport = async (): Promise<BiometricConfig['platformSupport']> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      webauthn: false,
      fingerprint: false,
      faceId: false,
      hardwareKey: false
    };
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    
    return {
      webauthn: true,
      fingerprint: available,
      faceId: available,
      hardwareKey: true // Hardware keys always supported if WebAuthn available
    };
  } catch (error) {
    return {
      webauthn: false,
      fingerprint: false,
      faceId: false,
      hardwareKey: false
    };
  }
};

const loadConfig = (): BiometricConfig => {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      credentials: [],
      platformSupport: {
        webauthn: false,
        fingerprint: false,
        faceId: false,
        hardwareKey: false
      }
    };
  }

  try {
    const stored = localStorage.getItem(SECURITY_STORAGE_KEYS.biometric);
    if (!stored) {
      return {
        enabled: false,
        credentials: [],
        platformSupport: {
          webauthn: false,
          fingerprint: false,
          faceId: false,
          hardwareKey: false
        }
      };
    }

    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      credentials: parsed.credentials.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        lastUsed: c.lastUsed ? new Date(c.lastUsed) : null
      }))
    };
  } catch (error) {
    console.error('Failed to load biometric config', error);
    return {
      enabled: false,
      credentials: [],
      platformSupport: {
        webauthn: false,
        fingerprint: false,
        faceId: false,
        hardwareKey: false
      }
    };
  }
};

const saveConfig = (config: BiometricConfig): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SECURITY_STORAGE_KEYS.biometric, JSON.stringify(config));
};

// Generate random challenge for WebAuthn
const generateChallenge = (): BufferSource => {
  return crypto.getRandomValues(new Uint8Array(32)) as BufferSource;
};

export const useBiometricAuth = (userId?: string): UseBiometricAuthResult => {
  const [config, setConfig] = useState<BiometricConfig>(loadConfig());

  useEffect(() => {
    const init = async () => {
      const support = await checkPlatformSupport();
      const loaded = loadConfig();
      setConfig({ ...loaded, platformSupport: support });
    };
    init();
  }, []);

  const updateConfig = useCallback((updates: Partial<BiometricConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }, []);

  const enroll = useCallback(async (
    name: string,
    type: BiometricType = 'passkey'
  ): Promise<BiometricCredential | null> => {
    if (!config.platformSupport.webauthn) {
      console.error('WebAuthn not supported');
      return null;
    }

    try {
      const challenge = generateChallenge();
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'VFIDE',
          id: typeof window !== 'undefined' ? window.location.hostname : 'vfide.com'
        },
        user: {
          id: new TextEncoder().encode(userId || 'user'),
          name: userId || 'user@vfide.com',
          displayName: name
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: type === 'hardware-key' ? 'cross-platform' : 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) return null;

      const newCredential: BiometricCredential = {
        id: credential.id,
        type,
        name,
        createdAt: new Date(),
        lastUsed: null
      };

      // Store credential ID securely
      const credentials = [...config.credentials, newCredential];
      updateConfig({
        enabled: true,
        credentials
      });

      // In production, send public key to backend for storage
      if (typeof window !== 'undefined') {
        const rawId = Array.from(new Uint8Array(credential.rawId));
        localStorage.setItem(`vfide:biometric:${credential.id}`, JSON.stringify(rawId));
      }

      return newCredential;
    } catch (error) {
      console.error('Failed to enroll biometric', error);
      return null;
    }
  }, [config.platformSupport, config.credentials, userId, updateConfig]);

  const remove = useCallback(async (credentialId: string): Promise<boolean> => {
    try {
      const credentials = config.credentials.filter(c => c.id !== credentialId);
      
      updateConfig({
        enabled: credentials.length > 0,
        credentials
      });

      if (typeof window !== 'undefined') {
        localStorage.removeItem(`vfide:biometric:${credentialId}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to remove biometric', error);
      return false;
    }
  }, [config.credentials, updateConfig]);

  const verify = useCallback(async (): Promise<boolean> => {
    if (!config.platformSupport.webauthn || config.credentials.length === 0) {
      return false;
    }

    try {
      const challenge = generateChallenge();
      
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: config.credentials.map(c => ({
          id: new TextEncoder().encode(c.id),
          type: 'public-key' as const,
          transports: c.type === 'hardware-key' ? ['usb', 'nfc'] : ['internal']
        })),
        timeout: 60000,
        userVerification: 'required'
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) return false;

      // Update last used timestamp
      const credentials = config.credentials.map(c =>
        c.id === assertion.id ? { ...c, lastUsed: new Date() } : c
      );
      
      updateConfig({ credentials });

      // In production, verify signature on backend
      return true;
    } catch (error) {
      console.error('Biometric verification failed', error);
      return false;
    }
  }, [config.platformSupport, config.credentials, updateConfig]);

  const checkSupport = useCallback(async () => {
    const support = await checkPlatformSupport();
    updateConfig({ platformSupport: support });
    return support;
  }, [updateConfig]);

  const listCredentials = useCallback(() => {
    return config.credentials;
  }, [config.credentials]);

  return {
    config,
    isEnabled: config.enabled,
    hasCredentials: config.credentials.length > 0,
    credentials: config.credentials,
    platformSupport: config.platformSupport,
    enroll,
    remove,
    verify,
    checkSupport,
    listCredentials
  };
};
