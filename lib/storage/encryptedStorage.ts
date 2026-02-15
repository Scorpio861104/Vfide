/**
 * Encrypted localStorage utilities using Web Crypto API (AES-GCM)
 * Provides secure storage for sensitive data like JWT tokens, private keys, and user preferences
 *
 * Security model:
 *   - A random 256-bit device key is generated once and persisted in IndexedDB.
 *   - IndexedDB is origin-bound and not accessible from other origins.
 *   - The device key is NEVER derived from public data (wallet address, etc.).
 *   - PBKDF2 with 600,000 iterations is applied on each encrypt/decrypt.
 *   - If IndexedDB is unavailable, the key lives in memory only (cleared on page unload).
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const SALT_LENGTH = 16;
const ITERATIONS = 600_000; // NIST SP 800-132 recommendation (2023+)

const IDB_NAME = 'vfide-keystore';
const IDB_STORE = 'keys';
const DEVICE_KEY_ID = 'device-master-v2';

// ─── IndexedDB helpers (origin-bound persistent key storage) ───

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Device key management ───

let _deviceKey: string | null = null;
let _deviceKeyReady: Promise<string> | null = null;

/**
 * Retrieve (or generate) the per-device random encryption key.
 * Persisted in IndexedDB so it survives page reloads. Never stored in
 * localStorage or sessionStorage, and never derived from public data.
 */
async function getDeviceKey(): Promise<string> {
  if (_deviceKey) return _deviceKey;

  // Try loading from IndexedDB
  try {
    const db = await openKeyStore();
    const stored = await idbGet(db, DEVICE_KEY_ID);
    if (stored) {
      _deviceKey = stored;
      return _deviceKey;
    }
  } catch {
    // IndexedDB unavailable — fall through to generate in-memory key
  }

  // Generate a cryptographically random device key
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  _deviceKey = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

  // Persist in IndexedDB if available
  try {
    const db = await openKeyStore();
    await idbPut(db, DEVICE_KEY_ID, _deviceKey);
  } catch {
    // Key lives in memory only — will be lost on page unload
  }

  return _deviceKey;
}

/**
 * Ensure the device key is loaded before any encrypt/decrypt operations.
 * Call early (e.g. in app init) so the async IndexedDB read is done by the
 * time the first encrypt/decrypt is needed.
 */
function ensureDeviceKey(): Promise<string> {
  if (!_deviceKeyReady) {
    _deviceKeyReady = getDeviceKey();
  }
  return _deviceKeyReady;
}

// ─── Public API: wallet binding (informational only, does NOT affect key) ───

/**
 * Inform encrypted storage of the connected wallet address.
 * This is retained for API compatibility but intentionally does NOT affect
 * the encryption key. The key is always a random per-device secret, never
 * derived from the (public) wallet address.
 */
export function setWalletAddress(_address: string | null): void {
  // Intentional no-op: key derivation from public addresses was removed
  // because wallet addresses are public information.
  // Retained for backward-compatible call sites.
}

// ─── Key derivation ───

/**
 * Derive a CryptoKey from the device secret + per-ciphertext salt using PBKDF2.
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

// ─── Encrypt / Decrypt ───

/**
 * Encrypt data using AES-GCM with a per-device random key.
 */
export async function encryptData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const masterKey = await ensureDeviceKey();
  const cryptoKey = await deriveKey(masterKey, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    cryptoKey,
    dataBuffer
  );

  // Combine salt + IV + encrypted data
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedArray.length);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(encryptedArray, SALT_LENGTH + IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM with the per-device random key.
 */
export async function decryptData(encryptedData: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encryptedBuffer = combined.slice(SALT_LENGTH + IV_LENGTH);

  const masterKey = await ensureDeviceKey();
  const cryptoKey = await deriveKey(masterKey, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    cryptoKey,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// ─── localStorage wrappers ───

/**
 * Set encrypted item in localStorage
 */
export async function setEncryptedItem(key: string, value: string): Promise<void> {
  try {
    const encrypted = await encryptData(value);
    localStorage.setItem(`encrypted_${key}`, encrypted);
  } catch (error) {
    console.error(`Failed to set encrypted item ${key}:`, error);
    throw new Error(`Refusing to store ${key} without encryption`);
  }
}

/**
 * Get encrypted item from localStorage
 */
export async function getEncryptedItem(key: string): Promise<string | null> {
  try {
    const encrypted = localStorage.getItem(`encrypted_${key}`);
    if (!encrypted) {
      return null;
    }
    return await decryptData(encrypted);
  } catch (error) {
    console.error(`Failed to get encrypted item ${key}:`, error);
    return null;
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
    console.warn('Encryption not supported in this environment');
    return;
  }

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value && !localStorage.getItem(`encrypted_${key}`)) {
      try {
        await setEncryptedItem(key, value);
        localStorage.removeItem(key); // Remove unencrypted version
      } catch (error) {
        console.error(`Failed to migrate ${key}:`, error);
      }
    }
  }

  // Clean up legacy sessionStorage key from old implementation
  try {
    sessionStorage.removeItem('vfide_enc_session_key');
  } catch {
    // Ignore if sessionStorage unavailable
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
 * Initialize encrypted storage and migrate existing data.
 * The walletAddress parameter is accepted for backward compatibility
 * but is intentionally not used for key derivation.
 */
export async function initializeEncryptedStorage(_walletAddress?: string): Promise<void> {
  if (!isEncryptionSupported()) {
    console.warn('Web Crypto API not available - encryption disabled');
    return;
  }

  // Pre-load the device key from IndexedDB
  await ensureDeviceKey();

  // Migrate sensitive keys to encrypted storage
  await migrateToEncryptedStorage([...SENSITIVE_KEYS]);
}
