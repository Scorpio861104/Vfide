/**
 * Encrypted localStorage utilities using Web Crypto API (AES-GCM)
 * Provides secure storage for sensitive data like JWT tokens, private keys, and user preferences
 */

import { logger } from '@/lib/logger';

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Generate a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or generate master encryption key
 * In production, this should be derived from user authentication or secure key management
 */
function getMasterKey(): string {
  // Use a combination of factors to derive the key
  // This is a simplified version - in production, use proper key management
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  return `vfide-${hostname}-${userAgent.slice(0, 20)}`;
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive encryption key
    const masterKey = getMasterKey();
    const cryptoKey = await deriveKey(masterKey, salt);

    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
      },
      cryptoKey,
      dataBuffer
    );

    // Combine salt + IV + encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(encryptedArray, SALT_LENGTH + IV_LENGTH);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedBuffer = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive decryption key
    const masterKey = getMasterKey();
    const cryptoKey = await deriveKey(masterKey, salt);

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv,
      },
      cryptoKey,
      encryptedBuffer
    );

    // Convert buffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Set encrypted item in localStorage
 */
export async function setEncryptedItem(key: string, value: string): Promise<void> {
  try {
    const encrypted = await encryptData(value);
    localStorage.setItem(`encrypted_${key}`, encrypted);
  } catch (error) {
    logger.error(`Failed to set encrypted item ${key}:`, error);
    // Fallback to unencrypted storage (log warning in production)
    if (process.env.NODE_ENV === 'production') {
      logger.warn(`Storing ${key} unencrypted due to encryption failure`);
    }
    localStorage.setItem(key, value);
  }
}

/**
 * Get encrypted item from localStorage
 */
export async function getEncryptedItem(key: string): Promise<string | null> {
  try {
    const encrypted = localStorage.getItem(`encrypted_${key}`);
    if (!encrypted) {
      // Try fallback to unencrypted key
      return localStorage.getItem(key);
    }
    return await decryptData(encrypted);
  } catch (error) {
    logger.error(`Failed to get encrypted item ${key}:`, error);
    // Try fallback to unencrypted key
    return localStorage.getItem(key);
  }
}

/**
 * Remove encrypted item from localStorage
 */
export function removeEncryptedItem(key: string): void {
  localStorage.removeItem(`encrypted_${key}`);
  localStorage.removeItem(key); // Remove unencrypted version if exists
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

/**
 * Migrate existing unencrypted data to encrypted storage
 */
export async function migrateToEncryptedStorage(keys: string[]): Promise<void> {
  if (!isEncryptionSupported()) {
    logger.warn('Encryption not supported in this environment');
    return;
  }

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && !localStorage.getItem(`encrypted_${key}`)) {
      try {
        await setEncryptedItem(key, value);
        localStorage.removeItem(key); // Remove unencrypted version
        logger.info(`Migrated ${key} to encrypted storage`);
      } catch (error) {
        logger.error(`Failed to migrate ${key}:`, error);
      }
    }
  }
}

/**
 * Sensitive keys that should always be encrypted
 */
export const SENSITIVE_KEYS = [
  'jwt_token',
  'refresh_token',
  'private_key',
  'mnemonic',
  'wallet_password',
  'user_session',
  'auth_token',
] as const;

/**
 * Initialize encrypted storage and migrate existing data
 */
export async function initializeEncryptedStorage(): Promise<void> {
  if (!isEncryptionSupported()) {
    logger.warn('Web Crypto API not available - encryption disabled');
    return;
  }

  // Migrate sensitive keys to encrypted storage
  await migrateToEncryptedStorage([...SENSITIVE_KEYS]);
}
