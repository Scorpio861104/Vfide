import { isAddress } from 'viem';

export const KEY_DIRECTORY_ALGORITHM = 'ECDH-P256-SPKI';
export const KEY_DIRECTORY_MAX_SKEW_MS = 10 * 60 * 1000;

export function normalizeHex(value: string): string {
  return value.startsWith('0x') ? value.slice(2) : value;
}

export function buildKeyDirectorySigningMessage(
  address: string,
  encryptionPublicKey: string,
  timestamp: number,
): string {
  return `VFIDE_KEY_DIRECTORY_V1:${address.toLowerCase()}:${normalizeHex(encryptionPublicKey).toLowerCase()}:${timestamp}`;
}

export function isValidEncryptionPublicKeyHex(value: string): boolean {
  const normalized = normalizeHex(value).trim();
  return /^[0-9a-f]+$/i.test(normalized) && normalized.length >= 120 && normalized.length % 2 === 0;
}

export function validateKeyDirectoryPayload(payload: {
  address: string;
  encryptionPublicKey: string;
  signature: string;
  timestamp: number;
}): { ok: true } | { ok: false; error: string } {
  if (!isAddress(payload.address)) {
    return { ok: false, error: 'Invalid address format' };
  }

  if (!isValidEncryptionPublicKeyHex(payload.encryptionPublicKey)) {
    return { ok: false, error: 'Invalid encryption public key format' };
  }

  if (!payload.signature || payload.signature.trim().length < 10) {
    return { ok: false, error: 'Invalid signature' };
  }

  if (!Number.isFinite(payload.timestamp)) {
    return { ok: false, error: 'Invalid timestamp' };
  }

  const now = Date.now();
  const age = Math.abs(now - payload.timestamp);
  if (age > KEY_DIRECTORY_MAX_SKEW_MS) {
    return { ok: false, error: 'Signature timestamp expired' };
  }

  return { ok: true };
}
