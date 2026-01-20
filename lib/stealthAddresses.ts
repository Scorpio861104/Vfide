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
 * In production, this would use proper elliptic curve operations
 */
export async function generateStealthMetaAddress(): Promise<{
  metaAddress: StealthMetaAddress;
  spendingPrivKey: string;
  viewingPrivKey: string;
}> {
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
 * Simplified - in production would use secp256k1
 */
async function derivePublicKey(privateKey: Uint8Array): Promise<Uint8Array> {
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
      // Check for existing keys in secure storage
      const storedKeys = localStorage.getItem(`vfide-stealth-${userAddress}`);

      if (storedKeys) {
        const { metaAddress, spendingPrivKey: spk, viewingPrivKey: vpk } = JSON.parse(storedKeys);
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

        // Store securely (in production, use encrypted storage)
        localStorage.setItem(
          `vfide-stealth-${userAddress}`,
          JSON.stringify({ metaAddress, spendingPrivKey: spk, viewingPrivKey: vpk })
        );
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
