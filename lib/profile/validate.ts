/**
 * Validate a parsed JSON value against the v1 Merchant Profile schema.
 *
 * Implements VFIDE_MERCHANT_PROFILE_SPEC.md §3 (field reference) and §4
 * (validation rules). Returns all validation errors at once rather than
 * failing on the first — uploaders prefer to fix everything in one round-trip.
 *
 * Usage:
 *   const result = validateProfile(parsedJson);
 *   if (!result.ok) { return 400 with result.errors; }
 *   // result.profile is now a typed MerchantProfile
 */

import { canonicalizeJSONString } from './canonicalize';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type MerchantCategory =
  | 'beauty' | 'food' | 'retail' | 'services'
  | 'digital' | 'creative' | 'education' | 'health'
  | 'transport' | 'other';

export const CATEGORIES: readonly MerchantCategory[] = [
  'beauty', 'food', 'retail', 'services',
  'digital', 'creative', 'education', 'health',
  'transport', 'other',
] as const;

export interface ProfileLink {
  label: string;
  url: string;
}

export interface MerchantProfile {
  schemaVersion: 1;
  name: string;
  avatar?: string;
  bio?: string;
  category?: MerchantCategory;
  links?: ProfileLink[];
  createdAt?: string;
}

export type ValidationResult =
  | { ok: true; profile: MerchantProfile }
  | { ok: false; errors: string[] };

// ──────────────────────────────────────────────────────────────────────
// Limits + disallowed characters (per spec §3)
// ──────────────────────────────────────────────────────────────────────

const NAME_MIN = 1;
const NAME_MAX = 48;
const BIO_MAX = 280;
const LINK_LABEL_MIN = 1;
const LINK_LABEL_MAX = 24;
const LINK_MAX_COUNT = 3;
const SERIALIZED_MAX_BYTES = 4096;

// Per spec §3 — bidi controls, zero-width characters, null bytes.
// These are the canonical spoofing primitives blocked by name systems
// like Slack, Discord, GitHub.
const DISALLOWED_CHAR_REGEX = /[\u0000\u200c\u200d\u202a-\u202e\u2066-\u2069\ufeff]/;

// HTTPS allowlist for avatar URIs (per spec §6).
const HTTPS_AVATAR_ALLOWLIST: readonly string[] = [
  'i.imgur.com',
  'lh3.googleusercontent.com',
  'pbs.twimg.com',
  'cdn.discordapp.com',
];
// VFIDE backend domain — set this via env in deployment.
// Frontend convention: if process.env.NEXT_PUBLIC_VFIDE_AVATAR_HOST is set, add it.
function getAvatarHostAllowlist(): readonly string[] {
  const own = process.env.VFIDE_AVATAR_HOST || process.env.NEXT_PUBLIC_VFIDE_AVATAR_HOST;
  if (!own) return HTTPS_AVATAR_ALLOWLIST;
  return [...HTTPS_AVATAR_ALLOWLIST, own.toLowerCase()];
}

// ──────────────────────────────────────────────────────────────────────
// Top-level validator
// ──────────────────────────────────────────────────────────────────────

export function validateProfile(value: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, errors: ['top-level value must be a JSON object'] };
  }

  const obj = value as Record<string, unknown>;

  // schemaVersion — required, must be exactly 1 for v1
  if (obj.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1 (this validator only handles v1)');
  }

  // name — required string, 1-48 chars, no disallowed chars
  if (typeof obj.name !== 'string') {
    errors.push('name is required and must be a string');
  } else {
    validateName(obj.name, errors);
  }

  // bio — optional string, 0-280 chars, no disallowed chars
  if (obj.bio !== undefined) {
    if (typeof obj.bio !== 'string') {
      errors.push('bio must be a string if provided');
    } else {
      validateBio(obj.bio, errors);
    }
  }

  // avatar — optional URI string (https allowlist or ipfs://)
  if (obj.avatar !== undefined && obj.avatar !== null) {
    if (typeof obj.avatar !== 'string') {
      errors.push('avatar must be a string URI if provided');
    } else {
      validateAvatarUri(obj.avatar, errors);
    }
  }

  // category — optional, must be in enum
  if (obj.category !== undefined) {
    if (typeof obj.category !== 'string') {
      errors.push('category must be a string if provided');
    } else if (!CATEGORIES.includes(obj.category as MerchantCategory)) {
      errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
  }

  // links — optional array of up to 3 {label, url} entries
  if (obj.links !== undefined) {
    if (!Array.isArray(obj.links)) {
      errors.push('links must be an array if provided');
    } else {
      validateLinks(obj.links, errors);
    }
  }

  // createdAt — optional ISO 8601 string
  if (obj.createdAt !== undefined) {
    if (typeof obj.createdAt !== 'string') {
      errors.push('createdAt must be an ISO 8601 string if provided');
    } else if (!isValidIsoDate(obj.createdAt)) {
      errors.push('createdAt must be a valid ISO 8601 datetime');
    }
  }

  // Reject any unknown top-level keys (spec §4 rule 6 — forward-incompatible
  // profiles fail loudly rather than silently dropping fields).
  const knownKeys = new Set([
    'schemaVersion', 'name', 'avatar', 'bio',
    'category', 'links', 'createdAt',
  ]);
  for (const key of Object.keys(obj)) {
    if (!knownKeys.has(key)) {
      errors.push(`unknown top-level field: ${key}`);
    }
  }

  // Serialized size cap — only meaningful if everything else validated;
  // an invalid profile that exceeds the cap will surface the cap error AND
  // the field errors, which is correct behavior.
  try {
    const canonical = canonicalizeJSONString(obj);
    const byteLen = new TextEncoder().encode(canonical).length;
    if (byteLen > SERIALIZED_MAX_BYTES) {
      errors.push(`canonical size ${byteLen} exceeds limit ${SERIALIZED_MAX_BYTES}`);
    }
  } catch (e) {
    errors.push(`canonicalize failed: ${(e as Error).message}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Cast is safe: we've validated every field.
  return { ok: true, profile: obj as unknown as MerchantProfile };
}

// ──────────────────────────────────────────────────────────────────────
// Per-field validators
// ──────────────────────────────────────────────────────────────────────

function validateName(name: string, errors: string[]): void {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) {
    errors.push(`name must be at least ${NAME_MIN} character (after trimming)`);
  }
  if (trimmed.length > NAME_MAX) {
    errors.push(`name must be at most ${NAME_MAX} characters (after trimming)`);
  }
  if (DISALLOWED_CHAR_REGEX.test(trimmed)) {
    errors.push('name contains disallowed characters (bidi controls, zero-width, null)');
  }
}

function validateBio(bio: string, errors: string[]): void {
  if (bio.length > BIO_MAX) {
    errors.push(`bio must be at most ${BIO_MAX} characters`);
  }
  if (DISALLOWED_CHAR_REGEX.test(bio)) {
    errors.push('bio contains disallowed characters (bidi controls, zero-width, null)');
  }
  if (bio.includes('\r')) {
    errors.push('bio: carriage returns not allowed (use bare \\n for newlines)');
  }
}

function validateAvatarUri(uri: string, errors: string[]): void {
  if (uri.startsWith('ipfs://')) {
    // Basic shape check — full CID validation happens at fetch time.
    // We just require something after the scheme.
    if (uri.length < 'ipfs://'.length + 10) {
      errors.push('avatar: ipfs:// URI is too short to be a valid CID');
    }
    return;
  }

  if (uri.startsWith('https://')) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      errors.push('avatar: not a valid HTTPS URL');
      return;
    }
    const allowlist = getAvatarHostAllowlist();
    if (!allowlist.includes(parsed.hostname.toLowerCase())) {
      errors.push(
        `avatar: host ${parsed.hostname} not in allowlist (` +
        `${allowlist.join(', ')}, or use ipfs://)`,
      );
    }
    if (parsed.username || parsed.password) {
      errors.push('avatar: URLs with embedded credentials are not allowed');
    }
    return;
  }

  errors.push('avatar: URI must start with ipfs:// or https:// (allowlist hosts only)');
}

function validateLinks(links: unknown[], errors: string[]): void {
  if (links.length > LINK_MAX_COUNT) {
    errors.push(`links: maximum ${LINK_MAX_COUNT} entries (got ${links.length})`);
    return; // don't continue; saves noise
  }

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (typeof link !== 'object' || link === null || Array.isArray(link)) {
      errors.push(`links[${i}]: must be an object with {label, url}`);
      continue;
    }
    const l = link as Record<string, unknown>;

    // label
    if (typeof l.label !== 'string') {
      errors.push(`links[${i}].label: required string`);
    } else {
      if (l.label.length < LINK_LABEL_MIN || l.label.length > LINK_LABEL_MAX) {
        errors.push(`links[${i}].label: ${LINK_LABEL_MIN}-${LINK_LABEL_MAX} chars`);
      }
      if (DISALLOWED_CHAR_REGEX.test(l.label)) {
        errors.push(`links[${i}].label: contains disallowed characters`);
      }
    }

    // url
    if (typeof l.url !== 'string') {
      errors.push(`links[${i}].url: required string`);
      continue;
    }
    validateLinkUrl(l.url, i, errors);

    // Reject unknown sub-keys to keep schema strict
    for (const key of Object.keys(l)) {
      if (key !== 'label' && key !== 'url') {
        errors.push(`links[${i}]: unknown field "${key}"`);
      }
    }
  }
}

function validateLinkUrl(url: string, index: number, errors: string[]): void {
  if (!url.startsWith('https://')) {
    errors.push(`links[${index}].url: must start with https://`);
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    errors.push(`links[${index}].url: not a valid URL`);
    return;
  }

  if (parsed.protocol !== 'https:') {
    errors.push(`links[${index}].url: protocol must be https:`);
  }
  if (parsed.username || parsed.password) {
    errors.push(`links[${index}].url: URLs with embedded credentials are not allowed`);
  }
  // Reject IPs and localhost variants — they're almost certainly mistakes
  // or attempts to point at internal infrastructure.
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    errors.push(`links[${index}].url: localhost/IP-address hosts are not allowed`);
  }
  // Reject URLs that are nothing but a fragment
  if (!parsed.pathname && !parsed.search && parsed.hash) {
    errors.push(`links[${index}].url: fragment-only URLs are not meaningful`);
  }
}

function isValidIsoDate(s: string): boolean {
  // Require explicit ISO 8601 with timezone (Z or ±HH:MM).
  // Reject loose forms like "2026-05-14" or "2026-05-14 18:00".
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s)) {
    return false;
  }
  const t = Date.parse(s);
  return Number.isFinite(t);
}
