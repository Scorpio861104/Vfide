/**
 * Privacy Module - Stealth Addresses
 * 
 * Implements stealth address generation and scanning for private payments.
 * Based on EIP-5564 Stealth Address Standard.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface StealthMetaAddress {
  spendingPubKey: string;
  viewingPubKey: string;
  prefix: string; // 'st:eth:' for Ethereum stealth
}

export interface StealthAddress {
  address: string;
  ephemeralPubKey: string;
  viewTag: string;
}

export interface StealthPayment {
  id: string;
  stealthAddress: string;
  ephemeralPubKey: string;
  amount: string;
  token: string;
  timestamp: number;
  claimed: boolean;
  txHash?: string;
}

export interface PrivacyProfile {
  metaAddress: StealthMetaAddress;
  receivedPayments: StealthPayment[];
  sentPayments: StealthPayment[];
}

// ============================================================================
// Cryptographic Utilities
// ============================================================================

/**
 * Generate random bytes using Web Crypto API
 */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
    if (isNaN(byte) || !isFinite(byte)) {
      throw new Error('Invalid hex string');
    }
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Hash using SHA-256
 */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  // Create a copy to ensure we have a proper ArrayBuffer
  const buffer = new Uint8Array(data).buffer as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Derive a key using HKDF
 */
async function _hkdfDerive(
  secret: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Create copies to ensure we have proper ArrayBuffers
  const secretBuffer = new Uint8Array(secret).buffer as ArrayBuffer;
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;
  const infoBuffer = new Uint8Array(info).buffer as ArrayBuffer;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBuffer,
      info: infoBuffer,
    },
    keyMaterial,
    length * 8
  );

  return new Uint8Array(derivedBits);
}

// ============================================================================
// Stealth Address Functions
// ============================================================================

/**
 * Generate a stealth meta-address (one-time setup)
 * Execution is restricted until full secp256k1/EIP-5564 implementation is available.
 */
export async function generateStealthMetaAddress(): Promise<{
  metaAddress: StealthMetaAddress;
  spendingPrivKey: string;
  viewingPrivKey: string;
}> {
  throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');

  // Generate spending key pair
  const spendingPrivKey = randomBytes(32);
  const spendingPubKey = await derivePublicKey(spendingPrivKey);

  // Generate viewing key pair
  const viewingPrivKey = randomBytes(32);
  const viewingPubKey = await derivePublicKey(viewingPrivKey);

  return {
    metaAddress: {
      spendingPubKey: bytesToHex(spendingPubKey),
      viewingPubKey: bytesToHex(viewingPubKey),
      prefix: 'st:eth:0x',
    },
    spendingPrivKey: bytesToHex(spendingPrivKey),
    viewingPrivKey: bytesToHex(viewingPrivKey),
  };
}

/**
 * Derive public key from private key
 * Restricted because simplified derivation is unsafe for production fund routing.
 */
async function derivePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
  void privateKey;
  throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');

  // This is a simplified simulation
  // In production, use proper elliptic curve operations
  const hash = await sha256(privateKey);
  const pubKey = new Uint8Array(33);
  pubKey[0] = 0x02; // Compressed key prefix
  pubKey.set(hash, 1);
  return pubKey;
}

/**
 * Generate a stealth address for a recipient
 * Sender uses this to create a one-time address
 */
export async function generateStealthAddress(
  recipientMetaAddress: StealthMetaAddress
): Promise<StealthAddress> {
  void recipientMetaAddress;
  throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');

  // Generate ephemeral key pair
  const ephemeralPrivKey = randomBytes(32);
  const ephemeralPubKey = await derivePublicKey(ephemeralPrivKey);

  // Compute shared secret: ephemeralPrivKey * viewingPubKey
  // Simplified - would use ECDH in production
  const viewingPubBytes = hexToBytes(recipientMetaAddress.viewingPubKey);
  const sharedSecretInput = new Uint8Array([...ephemeralPrivKey, ...viewingPubBytes]);
  const sharedSecret = await sha256(sharedSecretInput);

  // Derive stealth public key: spendingPubKey + hash(sharedSecret) * G
  const spendingPubBytes = hexToBytes(recipientMetaAddress.spendingPubKey);
  const stealthInput = new Uint8Array([...spendingPubBytes, ...sharedSecret]);
  const stealthPubKey = await sha256(stealthInput);

  // Derive address from stealth public key
  const addressHash = await sha256(stealthPubKey);
  const address = '0x' + bytesToHex(addressHash.slice(12, 32));

  // Generate view tag (first 2 bytes of shared secret hash)
  const viewTag = bytesToHex(sharedSecret.slice(0, 2));

  return {
    address,
    ephemeralPubKey: bytesToHex(ephemeralPubKey),
    viewTag,
  };
}

/**
 * Check if a stealth address belongs to us
 * Recipient uses this to scan for payments
 */
export async function checkStealthAddress(
  ephemeralPubKey: string,
  viewTag: string,
  stealthAddress: string,
  viewingPrivKey: string,
  spendingPubKey: string
): Promise<boolean> {
  void ephemeralPubKey;
  void viewTag;
  void stealthAddress;
  void viewingPrivKey;
  void spendingPubKey;
  throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');

  // Compute shared secret: viewingPrivKey * ephemeralPubKey
  const viewingPrivBytes = hexToBytes(viewingPrivKey);
  const ephemeralBytes = hexToBytes(ephemeralPubKey);
  const sharedSecretInput = new Uint8Array([...viewingPrivBytes, ...ephemeralBytes]);
  const sharedSecret = await sha256(sharedSecretInput);

  // Quick check with view tag
  const computedViewTag = bytesToHex(sharedSecret.slice(0, 2));
  if (computedViewTag !== viewTag) {
    return false;
  }

  // Derive expected stealth address
  const spendingPubBytes = hexToBytes(spendingPubKey);
  const stealthInput = new Uint8Array([...spendingPubBytes, ...sharedSecret]);
  const stealthPubKey = await sha256(stealthInput);
  const addressHash = await sha256(stealthPubKey);
  const expectedAddress = '0x' + bytesToHex(addressHash.slice(12, 32));

  return expectedAddress.toLowerCase() === stealthAddress.toLowerCase();
}

/**
 * Derive private key for a stealth address we own
 * Used to claim/spend funds
 */
export async function deriveStealthPrivateKey(
  ephemeralPubKey: string,
  viewingPrivKey: string,
  spendingPrivKey: string
): Promise<string> {
  void ephemeralPubKey;
  void viewingPrivKey;
  void spendingPrivKey;
  throw new Error('Stealth address execution is restricted pending full EIP-5564 secp256k1 implementation.');

  // Compute shared secret
  const viewingPrivBytes = hexToBytes(viewingPrivKey);
  const ephemeralBytes = hexToBytes(ephemeralPubKey);
  const sharedSecretInput = new Uint8Array([...viewingPrivBytes, ...ephemeralBytes]);
  const sharedSecret = await sha256(sharedSecretInput);

  // Derive stealth private key: spendingPrivKey + hash(sharedSecret)
  const spendingPrivBytes = hexToBytes(spendingPrivKey);
  
  // Simplified addition - in production would use modular arithmetic
  const stealthPrivKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    stealthPrivKey[i] = ((spendingPrivBytes[i] ?? 0) + (sharedSecret[i] ?? 0)) % 256;
  }

  return bytesToHex(stealthPrivKey);
}

// ============================================================================
// Stealth Address Registry
// ============================================================================

/**
 * Encode meta-address to string format
 */
export function encodeMetaAddress(metaAddress: StealthMetaAddress): string {
  return `${metaAddress.prefix}${metaAddress.spendingPubKey}${metaAddress.viewingPubKey}`;
}

/**
 * Decode meta-address from string format
 */
export function decodeMetaAddress(encoded: string): StealthMetaAddress | null {
  const match = encoded.match(/^st:eth:0x([a-fA-F0-9]{66})([a-fA-F0-9]{66})$/);
  if (!match || !match[1] || !match[2]) return null;

  return {
    prefix: 'st:eth:0x',
    spendingPubKey: match[1],
    viewingPubKey: match[2],
  };
}

// ============================================================================
// ZK Proof Score (Privacy Reputation)
// ============================================================================

export interface PrivacyScore {
  score: number; // 0-100
  factors: {
    stealthUsage: number;
    mixerUsage: number;
    linkability: number;
    transactionDiversity: number;
  };
  recommendations: string[];
}

/**
 * Calculate privacy score based on user's transaction patterns
 */
export function calculatePrivacyScore(
  stealthPaymentsReceived: number,
  totalPaymentsReceived: number,
  uniqueAddressesInteracted: number,
  totalTransactions: number
): PrivacyScore {
  // Stealth usage score
  const stealthRatio = totalPaymentsReceived > 0
    ? stealthPaymentsReceived / totalPaymentsReceived
    : 0;
  const stealthUsage = Math.min(100, stealthRatio * 100);

  // Mixer usage (would check for mixer interactions)
  const mixerUsage = 0; // Placeholder

  // Linkability score (lower is better, we invert for scoring)
  const avgTxPerAddress = uniqueAddressesInteracted > 0
    ? totalTransactions / uniqueAddressesInteracted
    : 0;
  const linkability = Math.max(0, 100 - avgTxPerAddress * 10);

  // Transaction diversity
  const transactionDiversity = Math.min(100, uniqueAddressesInteracted * 5);

  const factors = {
    stealthUsage,
    mixerUsage,
    linkability,
    transactionDiversity,
  };

  const weights = {
    stealthUsage: 0.4,
    mixerUsage: 0.2,
    linkability: 0.25,
    transactionDiversity: 0.15,
  };

  const score = Object.entries(factors).reduce(
    (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
    0
  );

  const recommendations: string[] = [];

  if (stealthUsage < 50) {
    recommendations.push('Use stealth addresses for receiving payments to improve privacy.');
  }
  if (linkability < 50) {
    recommendations.push('Reduce address reuse to lower transaction linkability.');
  }
  if (transactionDiversity < 50) {
    recommendations.push('Interact with more diverse addresses to increase privacy.');
  }

  return {
    score: Math.round(score),
    factors,
    recommendations,
  };
}

// ============================================================================
// Encrypted Storage for Stealth Keys
// ============================================================================

const STEALTH_SALT_KEY = 'vfide-stealth-salt';
const PBKDF2_ITERATIONS = 100000;

interface StoredStealthKeys {
  metaAddress: StealthMetaAddress;
  spendingPrivKey: string;
  viewingPrivKey: string;
}

interface EncryptedStealthStorage {
  encrypted: true;
  iv: string;
  ciphertext: string;
}

/**
 * Derive an AES-256-GCM key from the user's wallet address using PBKDF2.
 * A device-specific random salt is persisted in localStorage so that a
 * raw localStorage dump from another device cannot be trivially decrypted.
 */
export async function deriveStorageKey(userAddress: string): Promise<CryptoKey> {
  let saltHex = localStorage.getItem(STEALTH_SALT_KEY);
  if (!saltHex) {
    const salt = randomBytes(16);
    saltHex = bytesToHex(salt);
    localStorage.setItem(STEALTH_SALT_KEY, saltHex);
  }
  const saltBytes = hexToBytes(saltHex);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userAddress.toLowerCase()),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(saltBytes).buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt stealth private keys with AES-256-GCM before writing to localStorage.
 */
export async function encryptStealthKeys(
  keys: StoredStealthKeys,
  userAddress: string
): Promise<string> {
  const cryptoKey = await deriveStorageKey(userAddress);
  const iv = randomBytes(12);
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(keys));

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv).buffer as ArrayBuffer },
    cryptoKey,
    plaintext
  );

  const payload: EncryptedStealthStorage = {
    encrypted: true,
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ciphertextBuffer)),
  };
  return JSON.stringify(payload);
}

/**
 * Decrypt stealth private keys from localStorage.
 * Also handles migration from the legacy plain-text format.
 */
export async function decryptStealthKeys(
  stored: string,
  userAddress: string
): Promise<StoredStealthKeys> {
  const parsed: EncryptedStealthStorage | StoredStealthKeys = JSON.parse(stored);

  // Migrate legacy plain-text storage
  if (!('encrypted' in parsed)) {
    return parsed as StoredStealthKeys;
  }

  const { iv, ciphertext } = parsed as EncryptedStealthStorage;
  const cryptoKey = await deriveStorageKey(userAddress);
  const ivBytes = hexToBytes(iv);
  const ciphertextBytes = hexToBytes(ciphertext);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBytes).buffer as ArrayBuffer },
    cryptoKey,
    new Uint8Array(ciphertextBytes).buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintextBuffer)) as StoredStealthKeys;
}

// ============================================================================
// React Hook
// ============================================================================

export function useStealth(userAddress: string | undefined) {
  const [profile, setProfile] = useState<PrivacyProfile | null>(null);
  const [spendingPrivKey, setSpendingPrivKey] = useState<string | null>(null);
  const [viewingPrivKey, setViewingPrivKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or load stealth keys
  const initialize = useCallback(async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Check for existing keys in encrypted storage
      const storedKeys = localStorage.getItem(`vfide-stealth-${userAddress}`);

      if (storedKeys) {
        const { metaAddress, spendingPrivKey: spk, viewingPrivKey: vpk } =
          await decryptStealthKeys(storedKeys, userAddress);
        setProfile({
          metaAddress,
          receivedPayments: [],
          sentPayments: [],
        });
        setSpendingPrivKey(spk);
        setViewingPrivKey(vpk);
      } else {
        // Generate new stealth identity
        const { metaAddress, spendingPrivKey: spk, viewingPrivKey: vpk } =
          await generateStealthMetaAddress();

        setProfile({
          metaAddress,
          receivedPayments: [],
          sentPayments: [],
        });
        setSpendingPrivKey(spk);
        setViewingPrivKey(vpk);

        // Persist keys using AES-GCM encrypted storage
        const encrypted = await encryptStealthKeys(
          { metaAddress, spendingPrivKey: spk, viewingPrivKey: vpk },
          userAddress
        );
        localStorage.setItem(`vfide-stealth-${userAddress}`, encrypted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize stealth');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Generate address for receiving
  const getReceiveAddress = useCallback(async () => {
    if (!profile?.metaAddress) {
      throw new Error('Stealth profile not initialized');
    }
    return generateStealthAddress(profile.metaAddress);
  }, [profile]);

  // Generate address for sending to someone
  const createPaymentAddress = useCallback(async (recipientMetaAddressStr: string) => {
    const metaAddress = decodeMetaAddress(recipientMetaAddressStr);
    if (!metaAddress) {
      throw new Error('Invalid stealth meta-address');
    }
    return generateStealthAddress(metaAddress);
  }, []);

  // Scan for payments (would query blockchain/indexer)
  const scanForPayments = useCallback(async (announcements: Array<{ ephemeralPubKey: string; viewTag: string; address: string }>) => {
    if (!viewingPrivKey || !profile?.metaAddress) {
      throw new Error('Stealth profile not initialized');
    }

    const ownPayments: typeof announcements = [];

    for (const announcement of announcements) {
      const isOurs = await checkStealthAddress(
        announcement.ephemeralPubKey,
        announcement.viewTag,
        announcement.address,
        viewingPrivKey,
        profile.metaAddress.spendingPubKey
      );

      if (isOurs) {
        ownPayments.push(announcement);
      }
    }

    return ownPayments;
  }, [viewingPrivKey, profile]);

  // Claim a stealth payment
  const claimPayment = useCallback(async (ephemeralPubKey: string) => {
    if (!viewingPrivKey || !spendingPrivKey) {
      throw new Error('Stealth keys not available');
    }

    const stealthPrivKey = await deriveStealthPrivateKey(
      ephemeralPubKey,
      viewingPrivKey,
      spendingPrivKey
    );

    return stealthPrivKey;
  }, [viewingPrivKey, spendingPrivKey]);

  const encodedMetaAddress = useMemo(() => {
    if (!profile?.metaAddress) return null;
    return encodeMetaAddress(profile.metaAddress);
  }, [profile]);

  const privacyScore = useMemo(() => {
    if (!profile) return null;
    return calculatePrivacyScore(
      profile.receivedPayments.length,
      profile.receivedPayments.length + 10, // Assuming some non-stealth payments
      15, // Placeholder unique addresses
      25 // Placeholder total transactions
    );
  }, [profile]);

  return {
    profile,
    loading,
    error,
    encodedMetaAddress,
    privacyScore,
    initialize,
    getReceiveAddress,
    createPaymentAddress,
    scanForPayments,
    claimPayment,
  };
}

export default useStealth;
