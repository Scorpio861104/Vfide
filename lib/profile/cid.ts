/**
 * CIDv1 + sha2-256 hashing for profile JSON.
 *
 * Per VFIDE_MERCHANT_PROFILE_SPEC.md §5:
 *   - Hash JSON bytes with sha2-256
 *   - Wrap as CIDv1 with raw codec (0x55)
 *   - On-chain bytes32 stores the multihash digest only (32 bytes)
 *   - Frontend reconstructs full CID by prepending 0x01551220
 *     (cidv1 = 0x01, raw codec = 0x55, sha2-256 = 0x12, digest length = 0x20)
 *
 * The point of CIDv1 specifically (vs. raw sha-256) is that the same digest
 * works as a content address against any IPFS-compatible store. If we ever
 * migrate avatar storage from Vercel Blob to real IPFS, the chain commitment
 * doesn't have to change — only how the resolver fetches the bytes.
 */

import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

// 0x01 = CIDv1, 0x55 = raw codec, 0x12 = sha2-256 multihash code, 0x20 = 32 bytes
export const CID_PREFIX_HEX = '0x01551220';

/**
 * Hash content bytes and return a CIDv1 wrapping a sha2-256 multihash.
 */
export async function hashToCid(bytes: Uint8Array): Promise<CID> {
  const hash = await sha256.digest(bytes);
  return CID.createV1(raw.code, hash);
}

/**
 * Hash content bytes and return only the 32-byte digest as a `0x...` hex
 * string. This is what goes on-chain as `metaHash` in MerchantRegistry.
 */
export async function hashToBytes32(bytes: Uint8Array): Promise<string> {
  const cid = await hashToCid(bytes);
  // multihash digest is the last 32 bytes of cid.multihash.digest
  return '0x' + Array.from(cid.multihash.digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a `0x...` 32-byte digest (as stored on-chain) into a full CID string.
 * Frontend resolvers call this to turn the on-chain metaHash into something
 * they can fetch from IPFS gateways or our Blob store.
 */
export function bytes32ToCid(bytes32: string): string {
  const clean = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  if (clean.length !== 64) {
    throw new Error(`bytes32ToCid: expected 64 hex chars, got ${clean.length}`);
  }
  const digestBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    digestBytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  // Reconstruct full multihash: [code=0x12, length=0x20, digest...]
  const multihashBytes = new Uint8Array(34);
  multihashBytes[0] = 0x12; // sha2-256
  multihashBytes[1] = 0x20; // 32 bytes
  multihashBytes.set(digestBytes, 2);
  // Reconstruct CID: createV1 takes a parsed multihash so we use the lower-level
  // approach: full CID bytes = [version=0x01, codec=0x55, multihash...]
  const cidBytes = new Uint8Array(36);
  cidBytes[0] = 0x01;
  cidBytes[1] = 0x55;
  cidBytes.set(multihashBytes, 2);
  return CID.decode(cidBytes).toString();
}

/**
 * Convert a full CID string back to a `0x...` bytes32 digest for on-chain
 * comparison. Useful for "did this profile we just fetched match the
 * hash claimed by the chain?" checks.
 */
export function cidToBytes32(cidStr: string): string {
  const cid = CID.parse(cidStr);
  if (cid.version !== 1) {
    throw new Error('cidToBytes32: only CIDv1 supported');
  }
  if (cid.code !== raw.code) {
    throw new Error('cidToBytes32: only raw codec supported');
  }
  if (cid.multihash.code !== sha256.code) {
    throw new Error('cidToBytes32: only sha2-256 multihash supported');
  }
  const digest = cid.multihash.digest;
  if (digest.length !== 32) {
    throw new Error('cidToBytes32: digest length is not 32 bytes');
  }
  return '0x' + Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
