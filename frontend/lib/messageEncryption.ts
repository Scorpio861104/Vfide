// Message encryption utilities using Web3 wallet signatures
import { Hex } from 'viem';

/**
 * Encrypts a message using the recipient's public key (wallet address)
 * In production, this would use ECIES or similar asymmetric encryption
 * For now, we'll use a simplified approach with wallet signatures
 */
export async function encryptMessage(
  message: string,
  recipientAddress: string,
  senderSign: (message: string) => Promise<string>
): Promise<string> {
  try {
    // Create a deterministic encryption key from both addresses
    const timestamp = Date.now();
    const nonce = Math.random().toString(36);
    
    // Sign the message to prove sender identity
    const messageToSign = `VFIDE_ENCRYPT:${message}:${timestamp}:${nonce}`;
    const signature = await senderSign(messageToSign);
    
    // In production, use ECIES encryption here
    // For demo, we'll base64 encode with metadata
    const payload = {
      msg: btoa(message), // Base64 encode
      sig: signature,
      ts: timestamp,
      nonce,
      to: recipientAddress,
    };
    
    return btoa(JSON.stringify(payload));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypts a message using the receiver's wallet
 */
export async function decryptMessage(
  encryptedMessage: string,
  senderAddress: string,
  receiverVerify: (message: string, signature: string) => Promise<boolean>
): Promise<{ message: string; timestamp: number; verified: boolean }> {
  try {
    // Decode the payload
    const payload = JSON.parse(atob(encryptedMessage));
    const { msg, sig, ts, nonce, to } = payload;
    
    // Decode the message
    const message = atob(msg);
    
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
 * Simplified encryption for group messages
 * In production, each user would have their own encrypted copy
 */
export async function encryptGroupMessage(
  message: string,
  groupId: string,
  members: string[],
  senderSign: (message: string) => Promise<string>
): Promise<string> {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36);
  
  const messageToSign = `VFIDE_GROUP_ENCRYPT:${groupId}:${message}:${timestamp}:${nonce}`;
  const signature = await senderSign(messageToSign);
  
  const payload = {
    msg: btoa(message),
    sig: signature,
    ts: timestamp,
    nonce,
    groupId,
    members,
  };
  
  return btoa(JSON.stringify(payload));
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
    const payload = JSON.parse(atob(encryptedMessage));
    const { msg, sig, ts, nonce, groupId, members } = payload;
    
    // Check if receiver is a member
    if (!members.includes(receiverAddress)) {
      throw new Error('Not a group member');
    }
    
    const message = atob(msg);
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
