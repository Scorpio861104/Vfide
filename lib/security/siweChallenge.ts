import { isAddress } from 'viem';
import { getRequestIp as getRequestIpContext } from '@/lib/security/requestContext';

interface ChallengeRecord {
  nonce: string;
  address: string;
  domain: string;
  chainId: number;
  issuedAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const challenges = new Map<string, ChallengeRecord>();

function randomNonceHex(bytes = 16): string {
  const random = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(random, (b) => b.toString(16).padStart(2, '0')).join('');
}

function challengeKey(address: string): string {
  return address.toLowerCase();
}

export function getRequestIp(headers: Headers): string {
  return getRequestIpContext(headers).ip;
}

export function buildSiweMessage(params: {
  domain: string;
  address: string;
  chainId: number;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
}): string {
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    'Sign in to VFIDE',
    '',
    `URI: https://${params.domain}`,
    'Version: 1',
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${new Date(params.issuedAt).toISOString()}`,
    `Expiration Time: ${new Date(params.expiresAt).toISOString()}`,
  ].join('\n');
}

export function createSiweChallenge(input: {
  address: string;
  domain: string;
  chainId: number;
  ip: string;
  userAgent: string;
}): { message: string; nonce: string; expiresAt: number; issuedAt: number } {
  if (!isAddress(input.address)) {
    throw new Error('Invalid address');
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + CHALLENGE_TTL_MS;
  const nonce = randomNonceHex(16);
  const address = input.address.toLowerCase();

  challenges.set(challengeKey(address), {
    nonce,
    address,
    domain: input.domain,
    chainId: input.chainId,
    issuedAt,
    expiresAt,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return {
    message: buildSiweMessage({
      domain: input.domain,
      address,
      chainId: input.chainId,
      nonce,
      issuedAt,
      expiresAt,
    }),
    nonce,
    expiresAt,
    issuedAt,
  };
}

function parseField(message: string, field: string): string | null {
  const match = message.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() || null;
}

export function consumeAndValidateSiweChallenge(input: {
  address: string;
  message: string;
  domain: string;
  chainId: number;
  ip: string;
  userAgent: string;
}): { ok: true } | { ok: false; error: string } {
  const address = input.address.toLowerCase();
  const key = challengeKey(address);
  const record = challenges.get(key);

  if (!record) {
    return { ok: false, error: 'Challenge not found. Request a new challenge.' };
  }

  challenges.delete(key);

  if (Date.now() > record.expiresAt) {
    return { ok: false, error: 'Challenge expired. Request a new challenge.' };
  }

  if (record.domain !== input.domain) {
    return { ok: false, error: 'Challenge domain mismatch' };
  }

  if (record.chainId !== input.chainId) {
    return { ok: false, error: 'Challenge chain mismatch' };
  }

  const messageNonce = parseField(input.message, 'Nonce');
  const messageChain = parseField(input.message, 'Chain ID');
  const messageExpiry = parseField(input.message, 'Expiration Time');

  if (!messageNonce || messageNonce !== record.nonce) {
    return { ok: false, error: 'Nonce mismatch' };
  }

  if (!messageChain || Number.parseInt(messageChain, 10) !== record.chainId) {
    return { ok: false, error: 'Chain ID mismatch' };
  }

  if (!messageExpiry || Number.isNaN(Date.parse(messageExpiry))) {
    return { ok: false, error: 'Invalid expiration time in message' };
  }

  if (Date.now() > Date.parse(messageExpiry)) {
    return { ok: false, error: 'Message expired' };
  }

  const expectedPrefix = `${input.domain} wants you to sign in with your Ethereum account:`;
  if (!input.message.startsWith(expectedPrefix)) {
    return { ok: false, error: 'Domain binding mismatch' };
  }

  if (!input.message.includes(`\n${address}\n`)) {
    return { ok: false, error: 'Address mismatch in message' };
  }

  return { ok: true };
}
