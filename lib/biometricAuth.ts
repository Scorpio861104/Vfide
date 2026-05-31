/**
 * Biometric Authentication using WebAuthn (Passkeys)
 * 
 * Enables fingerprint, Face ID, Windows Hello login for wallet connection
 * Stores credential linked to wallet address for seamless reconnection
 */

import { safeLocalStorage } from './utils';
import { logger } from '@/lib/logger';

// Storage keys
const PASSKEY_CREDENTIAL_KEY = 'vfide-passkey-credential';
const PASSKEY_ENABLED_KEY = 'vfide-passkey-enabled';
const LINKED_WALLETS_KEY = 'vfide-linked-wallets';
const PASSKEY_CREDENTIAL_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

interface StoredCredential {
  credentialId: string;
  walletAddress: string;
  lastUsed: number;
  expiresAt: number;
}

interface LinkedWallet {
  address: string;
  label?: string;
  isPrimary: boolean;
  linkedAt: number;
}

/**
 * Check if WebAuthn is supported in this browser
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator (biometrics) is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Check if passkey is enabled for this device
 */
export function isPasskeyEnabled(): boolean {
  return safeLocalStorage.getItem(PASSKEY_ENABLED_KEY) === 'true';
}

/**
 * Get stored passkey credential
 */
export function getStoredCredential(): StoredCredential | null {
  const stored = safeLocalStorage.getItem(PASSKEY_CREDENTIAL_KEY);
  if (!stored) return null;
  
  try {
    const parsed = JSON.parse(stored) as Partial<StoredCredential>;
    const now = Date.now();
    const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : now + PASSKEY_CREDENTIAL_MAX_AGE_MS;
    if (expiresAt <= now) {
      removePasskey();
      return null;
    }

    if (typeof parsed.credentialId !== 'string' || typeof parsed.walletAddress !== 'string') {
      removePasskey();
      return null;
    }

    const normalized: StoredCredential = {
      credentialId: parsed.credentialId,
      walletAddress: parsed.walletAddress,
      lastUsed: typeof parsed.lastUsed === 'number' ? parsed.lastUsed : now,
      expiresAt,
    };

    return normalized;
  } catch {
    return null;
  }
}

/**
 * Generate a random challenge for WebAuthn
 */
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

/**
 * Register a passkey for the current wallet address
 */
export async function registerPasskey(walletAddress: string): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const hasBiometric = await isBiometricAvailable();
  if (!hasBiometric) {
    throw new Error('Biometric authentication is not available on this device');
  }

  try {
    const challenge = generateChallenge() as BufferSource;
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'VFIDE',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(walletAddress),
          name: `VFIDE Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          displayName: 'VFIDE Wallet',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device biometrics
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create passkey');
    }

    // Store credential info
    const storedCredential: StoredCredential = {
      credentialId: bufferToBase64(credential.rawId),
      walletAddress,
      lastUsed: Date.now(),
      expiresAt: Date.now() + PASSKEY_CREDENTIAL_MAX_AGE_MS,
    };

    safeLocalStorage.setItem(PASSKEY_CREDENTIAL_KEY, JSON.stringify(storedCredential));
    safeLocalStorage.setItem(PASSKEY_ENABLED_KEY, 'true');

    return true;
  } catch (error) {
    logger.error('Passkey registration failed:', error);
    throw error;
  }
}

/**
 * Authenticate using passkey and return the linked wallet address
 *
 * F-FE-020 FIX: This function is currently NOT WIRED into authentication.
 * The previous implementation (kept in source history) generated a challenge
 * client-side, called navigator.credentials.get to surface the passkey UI,
 * received an assertion from the authenticator, then DISCARDED THE ASSERTION
 * and trusted whatever wallet address was sitting in localStorage under
 * PASSKEY_CREDENTIAL_KEY. There was no server-side WebAuthn verification of
 * the assertion, so the authenticator step was security theater — anyone
 * with write access to the localStorage of the browser could mint an
 * "authenticated" return value.
 *
 * Until a real /api/auth/webauthn/verify endpoint exists that:
 *   1. consumes a server-issued challenge,
 *   2. verifies the authenticator-supplied signature against the stored
 *      credential public key, and
 *   3. mints the JWT/session,
 * this function intentionally throws so a future caller cannot accidentally
 * re-introduce the discarded-assertion flow as if it were a real auth path.
 */
export async function authenticateWithPasskey(): Promise<string | null> {
  throw new Error(
    'authenticateWithPasskey is disabled: server-side WebAuthn verification is not implemented. ' +
      'Use SIWE wallet authentication instead.',
  );
}

/**
 * Remove passkey and disable biometric login
 */
export function removePasskey(): void {
  safeLocalStorage.removeItem(PASSKEY_CREDENTIAL_KEY);
  safeLocalStorage.removeItem(PASSKEY_ENABLED_KEY);
}

// ==================== MULTI-WALLET LINKING ====================

/**
 * Get all linked wallets
 */
export function getLinkedWallets(): LinkedWallet[] {
  const stored = safeLocalStorage.getItem(LINKED_WALLETS_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Add a wallet to linked wallets
 */
export function linkWallet(address: string, label?: string): void {
  const wallets = getLinkedWallets();
  
  // Check if already linked
  if (wallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
    return;
  }

  // First wallet is primary
  const isPrimary = wallets.length === 0;

  wallets.push({
    address,
    label,
    isPrimary,
    linkedAt: Date.now(),
  });

  safeLocalStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify(wallets));
}

/**
 * Remove a wallet from linked wallets
 */
export function unlinkWallet(address: string): void {
  let wallets = getLinkedWallets();
  wallets = wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  
  // If removed wallet was primary, make first remaining wallet primary
  if (wallets.length > 0 && !wallets.some(w => w.isPrimary)) {
    const firstWallet = wallets[0];
    if (firstWallet) {
      firstWallet.isPrimary = true;
    }
  }

  safeLocalStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify(wallets));
}

/**
 * Set a wallet as primary
 */
export function setPrimaryWallet(address: string): void {
  const wallets = getLinkedWallets();
  
  wallets.forEach(w => {
    w.isPrimary = w.address.toLowerCase() === address.toLowerCase();
  });

  safeLocalStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify(wallets));
}

/**
 * Get primary wallet address
 */
export function getPrimaryWallet(): string | null {
  const wallets = getLinkedWallets();
  const primary = wallets.find(w => w.isPrimary);
  return primary?.address || wallets[0]?.address || null;
}

/**
 * Update wallet label
 */
export function updateWalletLabel(address: string, label: string): void {
  const wallets = getLinkedWallets();
  const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  
  if (wallet) {
    wallet.label = label;
    safeLocalStorage.setItem(LINKED_WALLETS_KEY, JSON.stringify(wallets));
  }
}
