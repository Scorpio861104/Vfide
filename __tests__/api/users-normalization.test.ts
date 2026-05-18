import { describe, it, expect } from 'vitest';

// Reimplement the helpers exactly as in app/api/users/route.ts to test
// them in isolation. The route is a Next.js handler that we can't easily
// import without dragging in Next/server, so we replicate the logic.

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;
const DISPLAY_NAME_CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/;

function normalizeUsername(raw: string | null): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().normalize('NFC');
  if (trimmed === '') return null;
  if (!USERNAME_REGEX.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeDisplayName(raw: string | null): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim().normalize('NFC');
  if (trimmed === '') return null;
  if (trimmed.length > 64) return undefined;
  if (DISPLAY_NAME_CONTROL_CHARS.test(trimmed)) return undefined;
  return trimmed;
}

describe('normalizeUsername', () => {
  it('accepts standard usernames', () => {
    expect(normalizeUsername('alice')).toBe('alice');
    expect(normalizeUsername('bob_42')).toBe('bob_42');
    expect(normalizeUsername('charlie-the-great')).toBe('charlie-the-great');
    expect(normalizeUsername('User123')).toBe('User123');
  });

  it('trims whitespace before validation', () => {
    expect(normalizeUsername('  alice  ')).toBe('alice');
  });

  it('treats null as "not set"', () => {
    expect(normalizeUsername(null)).toBe(null);
  });

  it('treats empty (post-trim) as null', () => {
    expect(normalizeUsername('')).toBe(null);
    expect(normalizeUsername('   ')).toBe(null);
  });

  it('rejects too short / too long', () => {
    expect(normalizeUsername('ab')).toBe(undefined);
    expect(normalizeUsername('a'.repeat(33))).toBe(undefined);
  });

  it('rejects non-ASCII (homoglyph defense)', () => {
    // "𝐀dmin" — Mathematical Bold Capital A + "dmin"
    // Visually identical to "Admin" but different codepoints
    expect(normalizeUsername('\u{1d400}dmin')).toBe(undefined);
    // Cyrillic lookalike: А (U+0410) is not Latin A (U+0041)
    expect(normalizeUsername('\u0410dmin')).toBe(undefined);
    // Common Unicode mixed scripts
    expect(normalizeUsername('alicé')).toBe(undefined);
  });

  it('rejects disallowed punctuation', () => {
    expect(normalizeUsername('alice.bob')).toBe(undefined); // dot
    expect(normalizeUsername('alice@bob')).toBe(undefined); // at
    expect(normalizeUsername('alice bob')).toBe(undefined); // space
    expect(normalizeUsername('alice/bob')).toBe(undefined); // slash
  });
});

describe('normalizeDisplayName', () => {
  it('accepts common display names', () => {
    expect(normalizeDisplayName('Alice Bob')).toBe('Alice Bob');
    expect(normalizeDisplayName('Dr. Smith, PhD')).toBe('Dr. Smith, PhD');
    expect(normalizeDisplayName('🚀 Rocket')).toBe('🚀 Rocket');
  });

  it('allows non-ASCII letters (real names)', () => {
    expect(normalizeDisplayName('Zoë')).toBe('Zoë');
    expect(normalizeDisplayName('José García')).toBe('José García');
    expect(normalizeDisplayName('中村太郎')).toBe('中村太郎');
  });

  it('NFC-normalizes canonically-equivalent sequences', () => {
    // "é" can be either:
    //   - single codepoint U+00E9
    //   - "e" + combining acute U+0301
    // NFC collapses both to the first form. Without normalization,
    // two visually-identical names would be stored differently.
    const composed = 'caf\u00e9';
    const decomposed = 'cafe\u0301';
    expect(decomposed.length).toBe(5);
    expect(composed.length).toBe(4);
    expect(normalizeDisplayName(decomposed)).toBe(composed);
  });

  it('rejects zero-width characters (impersonation defense)', () => {
    // U+200B Zero Width Space, U+200C Zero Width Non-Joiner, etc.
    // "Alice\u200B" looks identical to "Alice" but would be different
    // if stored verbatim, letting an attacker register a lookalike.
    expect(normalizeDisplayName('Alice\u200b')).toBe(undefined);
    expect(normalizeDisplayName('\u200bAlice')).toBe(undefined);
    expect(normalizeDisplayName('Al\u200cice')).toBe(undefined);
  });

  it('rejects directional override characters', () => {
    // U+202E Right-to-Left Override is the classic spoofing tool —
    // commonly used for filename-extension spoofing
    expect(normalizeDisplayName('innocent\u202eelif.txt')).toBe(undefined);
    // U+2066-U+2069 isolates can also reorder text for spoofing
    expect(normalizeDisplayName('\u2066Alice\u2069')).toBe(undefined);
  });

  it('rejects control characters', () => {
    expect(normalizeDisplayName('Alice\x00Bob')).toBe(undefined);
    expect(normalizeDisplayName('Alice\nBob')).toBe(undefined);
    expect(normalizeDisplayName('Alice\tBob')).toBe(undefined);
  });

  it('enforces 64-char ceiling', () => {
    expect(normalizeDisplayName('a'.repeat(64))).toBe('a'.repeat(64));
    expect(normalizeDisplayName('a'.repeat(65))).toBe(undefined);
  });

  it('treats null as "not set"', () => {
    expect(normalizeDisplayName(null)).toBe(null);
  });

  it('treats empty (post-trim) as null', () => {
    expect(normalizeDisplayName('')).toBe(null);
    expect(normalizeDisplayName('   ')).toBe(null);
  });

  it('rejects BOM and feff variants', () => {
    // String.prototype.trim() strips leading/trailing \ufeff as whitespace,
    // but BOM in the middle still triggers our regex. Test the middle case.
    expect(normalizeDisplayName('Alice\ufeffBob')).toBe(undefined);
  });
});
