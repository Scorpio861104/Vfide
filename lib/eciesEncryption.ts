'use client';

import eccrypto from '@toruslabs/eccrypto';
import { keccak256, toBytes } from 'viem';

/**
 * ECIES (Elliptic Curve Integrated Encryption Scheme) implementation
 * for secure end-to-end encrypted messaging
 */

/**
 * Derive encryption key pair from wallet signature
 * This creates a deterministic keypair for a user's wallet
 */
export async function deriveKeyPair(walletAddress: string, signature: string): Promise<{
  privateKey: Buffer;
  publicKey: Buffer;
}> {
  // Hash signature to get deterministic private key
  const hash = keccak256(toBytes(signature));
  const privateKey = Buffer.from(hash.slice(2), 'hex');
  
  // Derive public key from private key
  const publicKey = eccrypto.getPublic(privateKey);
  
  return { privateKey, publicKey };
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
 * Encrypt message using recipient's public key (ECIES)
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: Buffer
): Promise<string> {
  try {
    const messageBuffer = Buffer.from(message, 'utf8');
    
    // ECIES encryption
    const encrypted = await eccrypto.encrypt(recipientPublicKey, messageBuffer);
    
    // Combine all components into a single payload
    const payload = {
      iv: encrypted.iv.toString('hex'),
      ephemPublicKey: encrypted.ephemPublicKey.toString('hex'),
      ciphertext: encrypted.ciphertext.toString('hex'),
      mac: encrypted.mac.toString('hex'),
    };
    
    // Return as base64 for easy storage/transmission
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (error) {
    console.error('[ECIES] Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt message using own private key (ECIES)
 */
export async function decryptMessage(
  encryptedPayload: string,
  privateKey: Buffer
): Promise<string> {
  try {
    // Parse payload
    const payloadStr = Buffer.from(encryptedPayload, 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    // Reconstruct encrypted structure
    const encrypted = {
      iv: Buffer.from(payload.iv, 'hex'),
      ephemPublicKey: Buffer.from(payload.ephemPublicKey, 'hex'),
      ciphertext: Buffer.from(payload.ciphertext, 'hex'),
      mac: Buffer.from(payload.mac, 'hex'),
    };
    
    // ECIES decryption
    const decrypted = await eccrypto.decrypt(privateKey, encrypted);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[ECIES] Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Sign message with private key
 */
export async function signMessageData(
  message: string,
  privateKey: Buffer
): Promise<string> {
  try {
    const messageHash = Buffer.from(
      keccak256(toBytes(message)).slice(2),
      'hex'
    );
    
    const signature = await eccrypto.sign(privateKey, messageHash);
    return signature.toString('hex');
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
  publicKey: Buffer
): Promise<boolean> {
  try {
    const messageHash = Buffer.from(
      keccak256(toBytes(message)).slice(2),
      'hex'
    );
    
    const signatureBuffer = Buffer.from(signature, 'hex');
    
    await eccrypto.verify(publicKey, messageHash, signatureBuffer);
    return true;
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
    // Old encryption is just base64 encoded
    // New encryption is base64-encoded JSON with specific structure
    const decoded = Buffer.from(encryptedPayload, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    
    // Check if it has ECIES structure
    return !(parsed.iv && parsed.ephemPublicKey && parsed.ciphertext && parsed.mac);
  } catch {
    // If it can't be parsed as JSON, it's legacy
    return true;
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
    // Old base64 decryption (not actually encrypted)
    return Buffer.from(encryptedPayload, 'base64').toString('utf8');
  }
  
  // New ECIES decryption
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
      
      // Store public key
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

// Add React import for the hook
import React from 'react';
