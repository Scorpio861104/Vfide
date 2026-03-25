import { logger } from '@/lib/logger';
// Message encryption utilities using Web Crypto API and ECIES-like encryption

/**
 * Generate a shared secret key using ECDH
 * This uses the Web Crypto API for secure key derivation
 */
async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

function normalizeHex(input: string): string {
  return input.startsWith('0x') ? input.slice(2) : input;
}

function assertValidHexKeyMaterial(hex: string, keyType: 'spki' | 'pkcs8'): string {
  const normalized = normalizeHex(hex);

  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error(`Invalid ${keyType} key format`);
  }

  // P-256 SPKI/PKCS8 DER payloads are significantly longer than wallet addresses.
  if (normalized.length < 120) {
    throw new Error(`Invalid ${keyType} key length`);
  }

  return normalized;
}

/**
 * Encrypt message using AES-GCM with a derived key
 */
async function encryptWithKey(
  message: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: Buffer.from(encrypted).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

/**
 * Decrypt message using AES-GCM with a derived key
 */
async function decryptWithKey(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encrypted = Buffer.from(ciphertext, 'base64');
  const ivBytes = Buffer.from(iv, 'base64');

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypts a message using ECIES-like encryption with Web Crypto API
 * Uses ECDH for key agreement and AES-GCM for encryption
 * 
 * @param message - Plain text message to encrypt
 * @param recipientPublicKeyHex - Recipient's public key (hex encoded)
 * @param senderSign - Function to sign the message for authentication
 * @returns Encrypted message bundle
 */
export async function encryptMessage(
  message: string,
  recipientPublicKeyHex: string,
  senderSign: (message: string) => Promise<string>
): Promise<string> {
  try {
    const timestamp = Date.now();
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const nonceHex = Buffer.from(nonce).toString('hex');
    
    // Sign the message to prove sender identity
    const messageToSign = `VFIDE_ENCRYPT:${message}:${timestamp}:${nonceHex}`;
    const signature = await senderSign(messageToSign);
    
    // Generate ephemeral key pair for ECDH
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey']
    );

    const recipientSpkiHex = assertValidHexKeyMaterial(recipientPublicKeyHex, 'spki');

    // Import recipient's public key
    const recipientPublicKey = await crypto.subtle.importKey(
      'spki',
      Buffer.from(recipientSpkiHex, 'hex'),
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );

    // Derive shared secret
    const sharedKey = await deriveSharedSecret(
      ephemeralKeyPair.privateKey,
      recipientPublicKey
    );

    // Encrypt the message
    const { ciphertext, iv } = await encryptWithKey(message, sharedKey);

    // Export ephemeral public key
    const ephemeralPublicKeyBytes = await crypto.subtle.exportKey(
      'spki',
      ephemeralKeyPair.publicKey
    );
    const ephemeralPublicKeyHex = Buffer.from(ephemeralPublicKeyBytes).toString('hex');

    // Create encrypted payload
    const payload = {
      v: 1, // Version
      ephemeralPublicKey: ephemeralPublicKeyHex,
      ciphertext,
      iv,
      sig: signature,
      ts: timestamp,
      nonce: nonceHex,
    };
    
    return JSON.stringify(payload);
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using ECIES-like decryption
 * 
 * @param encryptedMessage - Encrypted message bundle
 * @param recipientPrivateKeyHex - Recipient's private key (hex encoded)
 * @param receiverVerify - Function to verify the signature
 * @returns Decrypted message with metadata
 */
export async function decryptMessage(
  encryptedMessage: string,
  recipientPrivateKeyHex: string,
  receiverVerify: (message: string, signature: string) => Promise<boolean>
): Promise<{ message: string; timestamp: number; verified: boolean }> {
  try {
    // Parse the payload
    const payload = JSON.parse(encryptedMessage);
    const { ephemeralPublicKey, ciphertext, iv, sig, ts, nonce, v } = payload;
    
    // Check version
    if (v !== 1) {
      throw new Error('Unsupported encryption version');
    }

    const recipientPkcs8Hex = assertValidHexKeyMaterial(recipientPrivateKeyHex, 'pkcs8');

    // Import recipient's private key
    const recipientPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(recipientPkcs8Hex, 'hex'),
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey']
    );

    // Import ephemeral public key
    const ephemeralPublicKeyBytes = Buffer.from(ephemeralPublicKey, 'hex');
    const ephemeralPublicKeyImported = await crypto.subtle.importKey(
      'spki',
      ephemeralPublicKeyBytes,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );

    // Derive shared secret
    const sharedKey = await deriveSharedSecret(
      recipientPrivateKey,
      ephemeralPublicKeyImported
    );

    // Decrypt the message
    const message = await decryptWithKey(ciphertext, iv, sharedKey);
    
    // Verify the signature
    const messageToVerify = `VFIDE_ENCRYPT:${message}:${ts}:${nonce}`;
    const verified = await receiverVerify(messageToVerify, sig);
    
    return {
      message,
      timestamp: ts,
      verified,
    };
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Encrypt a group message by creating one encrypted bundle per member public key.
 *
 * `members` must contain recipient encryption public keys (SPKI hex).
 */
export async function encryptGroupMessage(
  message: string,
  groupId: string,
  members: string[],
  senderSign: (message: string) => Promise<string>
): Promise<string> {
  const normalizedGroupId = groupId.trim();
  if (!normalizedGroupId) {
    throw new Error('Group encryption requires a non-empty group ID');
  }

  const uniqueMembers = Array.from(
    new Set(
      members
        .map((m) => m.trim())
        .filter(Boolean)
        .map((memberPublicKey) => assertValidHexKeyMaterial(memberPublicKey, 'spki'))
    )
  );
  if (uniqueMembers.length === 0) {
    throw new Error('Group encryption requires at least one recipient public key');
  }

  const encryptedForMembers: Record<string, string> = {};
  for (const memberPublicKey of uniqueMembers) {
    encryptedForMembers[memberPublicKey] = await encryptMessage(
      message,
      memberPublicKey,
      senderSign,
    );
  }

  const timestamp = Date.now();
  const groupPayloadMessageToSign = buildGroupPayloadSignatureMessage({
    groupId: normalizedGroupId,
    ts: timestamp,
    members: uniqueMembers,
    encryptedForMembers,
  });
  const groupSig = await senderSign(groupPayloadMessageToSign);

  return JSON.stringify({
    v: 2,
    groupId: normalizedGroupId,
    ts: timestamp,
    members: uniqueMembers,
    encryptedForMembers,
    groupSig,
  });
}

export function buildGroupPayloadSignatureMessage(payload: {
  groupId: string;
  ts: number;
  members: string[];
  encryptedForMembers: Record<string, string>;
}): string {
  const stableMemberBundles = payload.members
    .map((member) => `${member}:${payload.encryptedForMembers[member]}`)
    .join('|');
  return `VFIDE_GROUP_PAYLOAD:${payload.groupId}:${payload.ts}:${stableMemberBundles}`;
}

/**
 * Decrypt group message
 */
export async function decryptGroupMessage(
  encryptedMessage: string,
  recipientPrivateKeyHex: string,
  recipientPublicKeyHex: string,
  verify: (message: string, signature: string) => Promise<boolean>
): Promise<{ message: string; timestamp: number; verified: boolean; groupId: string }> {
  try {
    const payload = JSON.parse(encryptedMessage) as Record<string, unknown>;
    const { v } = payload;

    if (v === 1) {
      const groupId = payload.groupId;
      const messageBase64 = payload.msg;
      const signature = payload.sig;
      const timestamp = payload.ts;
      const nonce = payload.nonce;

      if (typeof groupId !== 'string') {
        throw new Error('Invalid group payload: missing groupId');
      }
      if (typeof messageBase64 !== 'string' || messageBase64.length === 0) {
        throw new Error('Invalid group payload: missing message');
      }
      if (typeof signature !== 'string' || signature.length === 0) {
        throw new Error('Invalid group payload: missing signature');
      }
      if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
        throw new Error('Invalid group payload: missing timestamp');
      }
      if (typeof nonce !== 'string' || nonce.length === 0) {
        throw new Error('Invalid group payload: missing nonce');
      }

      const message = Buffer.from(messageBase64, 'base64').toString('utf8');
      const messageToVerify = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${timestamp}:${nonce}`;
      const verified = await verify(messageToVerify, signature);

      return {
        message,
        timestamp,
        verified,
        groupId,
      };
    }

    if (v !== 2) {
      throw new Error('Unsupported group encryption version');
    }

    const groupId = payload.groupId;
    const timestamp = payload.ts;
    const encryptedForMembers = payload.encryptedForMembers as Record<string, string> | undefined;
    if (typeof groupId !== 'string') {
      throw new Error('Invalid group payload: missing groupId');
    }
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      throw new Error('Invalid group payload: missing timestamp');
    }
    if (!encryptedForMembers || typeof encryptedForMembers !== 'object') {
      throw new Error('Invalid group payload: missing encrypted member map');
    }

    const recipientSpkiHex = assertValidHexKeyMaterial(recipientPublicKeyHex, 'spki');
    const memberBundle = encryptedForMembers[recipientSpkiHex];
    if (typeof memberBundle !== 'string') {
      throw new Error('No encrypted payload available for this member key');
    }

    const decrypted = await decryptMessage(memberBundle, recipientPrivateKeyHex, verify);

    return {
      message: decrypted.message,
      timestamp,
      verified: decrypted.verified,
      groupId,
    };
  } catch (error) {
    logger.error('Group decryption failed:', error);
    throw new Error('Failed to decrypt group message');
  }
}

/**
 * Generate a unique conversation ID for two addresses
 */
export function getConversationId(address1: string, address2: string): string {
  const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

/**
 * Format wallet address for display
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Storage keys for local message cache
 */
export const STORAGE_KEYS = {
  FRIENDS: 'vfide_friends',
  CONVERSATIONS: 'vfide_conversations',
  MESSAGES: 'vfide_messages',
  GROUPS: 'vfide_groups',
} as const;

export function stripDecryptedContentForStorage<T extends { decryptedContent?: string }>(
  messages: T[],
): Array<Omit<T, 'decryptedContent'>> {
  return messages.map(({ decryptedContent: _decryptedContent, ...rest }) => rest);
}

