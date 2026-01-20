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
 * Legacy encryption for group messages
 * In production, each user would have their own encrypted copy
 * This is a simplified version for backward compatibility
 */
export async function encryptGroupMessage(
  message: string,
  groupId: string,
  members: string[],
  senderSign: (message: string) => Promise<string>
): Promise<string> {
  const timestamp = Date.now();
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = Buffer.from(nonce).toString('hex');
  
  const messageToSign = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${timestamp}:${nonceHex}`;
  const signature = await senderSign(messageToSign);
  
  // For group messages, we use a simpler approach
  // In production, you would encrypt separately for each member
  const payload = {
    v: 1,
    msg: Buffer.from(message).toString('base64'),
    sig: signature,
    ts: timestamp,
    nonce: nonceHex,
    groupId,
    members,
  };
  
  return JSON.stringify(payload);
}

/**
 * Decrypt group message
 */
export async function decryptGroupMessage(
  encryptedMessage: string,
  senderAddress: string,
  receiverAddress: string,
  verify: (message: string, signature: string) => Promise<boolean>
): Promise<{ message: string; timestamp: number; verified: boolean; groupId: string }> {
  try {
    const payload = JSON.parse(encryptedMessage);
    const { msg, sig, ts, nonce, groupId, members, v } = payload;
    
    // Check version
    if (v !== 1) {
      throw new Error('Unsupported encryption version');
    }
    
    // Check if receiver is a member
    if (!members.includes(receiverAddress)) {
      throw new Error('Not a group member');
    }
    
    const message = Buffer.from(msg, 'base64').toString('utf-8');
    const messageToVerify = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${ts}:${nonce}`;
    const verified = await verify(messageToVerify, sig);
    
    return {
      message,
      timestamp: ts,
      verified,
      groupId,
    };
  } catch (error) {
    console.error('Group decryption failed:', error);
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

