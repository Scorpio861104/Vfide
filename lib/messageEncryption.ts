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

    // Import recipient's public key
    const recipientPublicKey = await crypto.subtle.importKey(
      'spki',
      Buffer.from(recipientPublicKeyHex, 'hex'),
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
    console.error('Encryption failed:', error);
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

    // Import recipient's private key
    const recipientPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      Buffer.from(recipientPrivateKeyHex, 'hex'),
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
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Encrypt group messages using a shared AES-GCM key derived from the groupId
 * and a server-provisioned group secret.
 * The groupSecret MUST be fetched from the server (not derived from groupId alone)
 * to prevent anyone who knows the groupId from decrypting messages.
 */
export async function encryptGroupMessage(
  message: string,
  groupId: string,
  members: string[],
  senderSign: (message: string) => Promise<string>,
  groupSecret?: string
): Promise<string> {
  const timestamp = Date.now();
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = Buffer.from(nonce).toString('hex');

  const messageToSign = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${timestamp}:${nonceHex}`;
  const signature = await senderSign(messageToSign);

  // Key material: combine groupId with server-provisioned secret.
  // groupSecret is REQUIRED — deriving from public groupId alone provides no security.
  if (!groupSecret) {
    throw new Error('[GroupEncrypt] groupSecret is required. Cannot encrypt with public groupId alone.');
  }
  const keyInput = `${groupId}:${groupSecret}`;

  // Derive a symmetric AES-GCM key using HKDF
  const groupKeyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyInput),
    'HKDF',
    false,
    ['deriveKey']
  );

  const groupAesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('vfide-group-v2'),
      info: new TextEncoder().encode(`group:${groupId}`),
    },
    groupKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Encrypt the message with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    groupAesKey,
    new TextEncoder().encode(message)
  );

  const payload = {
    v: 2,
    ct: Buffer.from(ciphertext).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    sig: signature,
    ts: timestamp,
    nonce: nonceHex,
    groupId,
    members,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt group message.
 * Supports v2 (AES-GCM encrypted) and v1 (legacy base64 — signature-only integrity).
 */
export async function decryptGroupMessage(
  encryptedMessage: string,
  senderAddress: string,
  receiverAddress: string,
  verify: (message: string, signature: string) => Promise<boolean>,
  groupSecret?: string
): Promise<{ message: string; timestamp: number; verified: boolean; groupId: string }> {
  try {
    const payload = JSON.parse(encryptedMessage);
    const { sig, ts, nonce, groupId, members, v } = payload;

    // Check if receiver is a member
    if (!members.includes(receiverAddress)) {
      throw new Error('Not a group member');
    }

    let message: string;

    if (v === 2) {
      // v2: Real AES-GCM encryption
      const { ct, iv } = payload;

      // groupSecret is REQUIRED for v2 messages — matches encrypt side
      if (!groupSecret) {
        throw new Error('[GroupDecrypt] groupSecret is required for v2 messages.');
      }
      const keyInput = `${groupId}:${groupSecret}`;

      const groupKeyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyInput),
        'HKDF',
        false,
        ['deriveKey']
      );

      const groupAesKey = await crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new TextEncoder().encode('vfide-group-v2'),
          info: new TextEncoder().encode(`group:${groupId}`),
        },
        groupKeyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
        groupAesKey,
        Buffer.from(ct, 'base64')
      );

      message = new TextDecoder().decode(decrypted);
    } else if (v === 1) {
      // v1 legacy: base64-encoded plaintext (backward compat only)
      message = Buffer.from(payload.msg, 'base64').toString('utf-8');
    } else {
      throw new Error('Unsupported group encryption version');
    }

    const messageToVerify = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${ts}:${nonce}`;
    const verified = await verify(messageToVerify, sig);

    return { message, timestamp: ts, verified, groupId };
  } catch (_error) {
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

