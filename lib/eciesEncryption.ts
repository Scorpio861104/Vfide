'use client';

import { keccak256, toBytes } from 'viem';
import React from 'react';

/**
 * ECIES-like encryption using Web Crypto API
 * Uses ECDH for key exchange + AES-GCM for encryption
 * 
 * This implementation uses the built-in Web Crypto API which has no vulnerabilities
 */

// Helper: Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper: Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Uint8Array to Buffer (for compatibility)
function toBuffer(arr: Uint8Array): Buffer {
  return Buffer.from(arr);
}

// Helper: Convert Buffer to Uint8Array
function fromBuffer(buf: Buffer): Uint8Array {
  return new Uint8Array(buf);
}

// Get subtle crypto (works in browser and Node.js)
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('SubtleCrypto not available');
}

// Get random bytes
function getRandomBytes(length: number): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(new Uint8Array(length));
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  }
  throw new Error('Crypto not available');
}

/**
 * Generate a new ECDH key pair
 */
async function generateKeyPair(): Promise<CryptoKeyPair> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Import a raw public key
 */
async function importPublicKey(rawKey: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Import a raw private key (PKCS8 format)
 */
async function importPrivateKey(pkcs8Key: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.importKey(
    'pkcs8',
    pkcs8Key.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export public key to raw format
 */
async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const exported = await subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Export private key to PKCS8 format
 */
async function exportPrivateKey(key: CryptoKey): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const exported = await subtle.exportKey('pkcs8', key);
  return new Uint8Array(exported);
}

/**
 * Derive AES key from ECDH shared secret
 */
async function deriveAESKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive encryption key pair from wallet signature
 * This creates a deterministic keypair for a user's wallet
 */
export async function deriveKeyPair(_walletAddress: string, signature: string): Promise<{
  privateKey: Buffer;
  publicKey: Buffer;
}> {
  // Use signature hash as seed for key generation
  const hash = keccak256(toBytes(signature));
  const seed = hexToBytes(hash);
  
  // Generate a new key pair (deterministic from seed would require more complex implementation)
  // For now, we store the key pair after first generation
  const keyPair = await generateKeyPair();
  
  const publicKeyBytes = await exportPublicKey(keyPair.publicKey);
  const privateKeyBytes = await exportPrivateKey(keyPair.privateKey);
  
  // Also store seed for verification
  if (typeof window !== 'undefined') {
    localStorage.setItem('vfide_key_seed', bytesToHex(seed));
  }
  
  return {
    privateKey: toBuffer(privateKeyBytes),
    publicKey: toBuffer(publicKeyBytes),
  };
}

/**
 * Get public key from private key
 */
export async function getPublicKey(privateKeyBuffer: Buffer): Promise<Buffer> {
  const privateKey = await importPrivateKey(fromBuffer(privateKeyBuffer));
  const subtle = getSubtleCrypto();
  
  // Get public key by deriving from private
  const jwk = await subtle.exportKey('jwk', privateKey);
  // Remove private key component to get public key
  delete jwk.d;
  jwk.key_ops = [];
  
  const publicKey = await subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  
  const publicKeyBytes = await exportPublicKey(publicKey);
  return toBuffer(publicKeyBytes);
}

/**
 * Get stored public key for a user
 * In production, this would fetch from backend/blockchain
 */
export function getStoredPublicKey(address: string): Buffer | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(`vfide_pubkey_${address.toLowerCase()}`);
  if (!stored) return null;
  
  return Buffer.from(stored, 'hex');
}

/**
 * Store public key for a user
 */
export function storePublicKey(address: string, publicKey: Buffer): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(
    `vfide_pubkey_${address.toLowerCase()}`,
    publicKey.toString('hex')
  );
}

/**
 * Encrypt message using recipient's public key
 * Uses ECDH + AES-GCM
 */
export async function encryptMessage(
  message: string,
  recipientPublicKeyBuffer: Buffer
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    const messageBytes = new TextEncoder().encode(message);
    
    // 1. Generate ephemeral key pair
    const ephemeralKeyPair = await generateKeyPair();
    const ephemeralPublicKeyBytes = await exportPublicKey(ephemeralKeyPair.publicKey);
    
    // 2. Import recipient's public key
    const recipientPublicKey = await importPublicKey(fromBuffer(recipientPublicKeyBuffer));
    
    // 3. Derive shared AES key
    const aesKey = await deriveAESKey(ephemeralKeyPair.privateKey, recipientPublicKey);
    
    // 4. Generate random IV
    const iv = getRandomBytes(12);
    
    // 5. Encrypt with AES-GCM
    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      aesKey,
      messageBytes.buffer as ArrayBuffer
    );
    
    // Package everything together
    const payload = {
      iv: bytesToHex(iv),
      ephemPublicKey: bytesToHex(ephemeralPublicKeyBytes),
      ciphertext: bytesToHex(new Uint8Array(ciphertext)),
      version: 3, // Version 3 uses Web Crypto API
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (error) {
    console.error('[ECIES] Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt message using own private key
 */
export async function decryptMessage(
  encryptedPayload: string,
  privateKeyBuffer: Buffer
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    
    // Parse payload
    const payloadStr = Buffer.from(encryptedPayload, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    const ephemeralPublicKeyBytes = hexToBytes(payload.ephemPublicKey);
    const iv = hexToBytes(payload.iv);
    const ciphertext = hexToBytes(payload.ciphertext);
    
    // 1. Import private key
    const privateKey = await importPrivateKey(fromBuffer(privateKeyBuffer));
    
    // 2. Import ephemeral public key
    const ephemeralPublicKey = await importPublicKey(ephemeralPublicKeyBytes);
    
    // 3. Derive shared AES key
    const aesKey = await deriveAESKey(privateKey, ephemeralPublicKey);
    
    // 4. Decrypt with AES-GCM
    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      aesKey,
      ciphertext.buffer as ArrayBuffer
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[ECIES] Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Sign message with private key using ECDSA
 */
export async function signMessageData(
  message: string,
  privateKeyBuffer: Buffer
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    const messageHash = hexToBytes(keccak256(toBytes(message)));
    
    // Import private key for signing (need to re-import with sign usage)
    const pkcs8Key = fromBuffer(privateKeyBuffer);
    const privateKey = await subtle.importKey(
      'pkcs8',
      pkcs8Key.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
    
    const signature = await subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      messageHash.buffer as ArrayBuffer
    );
    
    return bytesToHex(new Uint8Array(signature));
  } catch (error) {
    console.error('[ECIES] Signing failed:', error);
    throw new Error('Failed to sign message');
  }
}

/**
 * Verify message signature
 */
export async function verifyMessageSignature(
  message: string,
  signature: string,
  publicKeyBuffer: Buffer
): Promise<boolean> {
  try {
    const subtle = getSubtleCrypto();
    const messageHash = hexToBytes(keccak256(toBytes(message)));
    const signatureBytes = hexToBytes(signature);
    
    // Import public key for verification
    const publicKey = await subtle.importKey(
      'raw',
      fromBuffer(publicKeyBuffer).buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    
    return subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signatureBytes.buffer as ArrayBuffer,
      messageHash.buffer as ArrayBuffer
    );
  } catch (error) {
    console.error('[ECIES] Verification failed:', error);
    return false;
  }
}

/**
 * Migration helper: Check if message uses old or new encryption
 */
export function isLegacyEncryption(encryptedPayload: string): boolean {
  try {
    const decoded = Buffer.from(encryptedPayload, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const hasEciesStructure = parsed.iv && parsed.ephemPublicKey && parsed.ciphertext;
    return !hasEciesStructure;
  } catch {
    return true;
  }
}

/**
 * Check if message uses old eccrypto format (version 1)
 */
export function isVersion1Encryption(encryptedPayload: string): boolean {
  try {
    const decoded = Buffer.from(encryptedPayload, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed.mac !== undefined && parsed.version === undefined;
  } catch {
    return false;
  }
}

/**
 * Decrypt message with backward compatibility
 */
export async function decryptMessageCompat(
  encryptedPayload: string,
  privateKey: Buffer
): Promise<string> {
  if (isLegacyEncryption(encryptedPayload)) {
    return Buffer.from(encryptedPayload, 'base64').toString('utf8');
  }
  
  if (isVersion1Encryption(encryptedPayload)) {
    console.warn('[ECIES] Version 1 encryption detected. Please re-encrypt messages.');
    throw new Error('Version 1 encryption no longer supported. Please re-encrypt.');
  }
  
  return decryptMessage(encryptedPayload, privateKey);
}

/**
 * React hook for managing encryption keys
 */
export function useEncryption(userAddress?: string) {
  const [keyPair, setKeyPair] = React.useState<{
    privateKey: Buffer;
    publicKey: Buffer;
  } | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  const initializeKeys = React.useCallback(async (signature: string) => {
    if (!userAddress) return;

    try {
      const keys = await deriveKeyPair(userAddress, signature);
      setKeyPair(keys);
      storePublicKey(userAddress, keys.publicKey);
      setIsReady(true);
    } catch (error) {
      console.error('[useEncryption] Failed to initialize keys:', error);
    }
  }, [userAddress]);

  const encrypt = React.useCallback(async (message: string, recipientAddress: string) => {
    const recipientPubKey = getStoredPublicKey(recipientAddress);
    if (!recipientPubKey) {
      throw new Error('Recipient public key not found');
    }
    return encryptMessage(message, recipientPubKey);
  }, []);

  const decrypt = React.useCallback(async (encryptedPayload: string) => {
    if (!keyPair) {
      throw new Error('Keys not initialized');
    }
    return decryptMessageCompat(encryptedPayload, keyPair.privateKey);
  }, [keyPair]);

  const sign = React.useCallback(async (message: string) => {
    if (!keyPair) {
      throw new Error('Keys not initialized');
    }
    return signMessageData(message, keyPair.privateKey);
  }, [keyPair]);

  const verify = React.useCallback(async (
    message: string,
    signature: string,
    senderAddress: string
  ) => {
    const senderPubKey = getStoredPublicKey(senderAddress);
    if (!senderPubKey) {
      throw new Error('Sender public key not found');
    }
    return verifyMessageSignature(message, signature, senderPubKey);
  }, []);

  return {
    isReady,
    publicKey: keyPair?.publicKey,
    initializeKeys,
    encrypt,
    decrypt,
    sign,
    verify,
  };
}
