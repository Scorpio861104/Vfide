/**
 * Canonicalize a parsed JSON value for content-addressed hashing.
 *
 * Per VFIDE_MERCHANT_PROFILE_SPEC.md §4:
 *   - JSON keys sorted alphabetically
 *   - No insignificant whitespace
 *   - Unicode normalized to NFC
 *   - Strings UTF-8 encoded
 *   - Numbers as integers where possible (no trailing .0)
 *
 * Two semantically-identical profiles MUST canonicalize to identical bytes.
 * This is what makes the CIDv1/sha2-256 commitment meaningful: tweak any
 * whitespace or key ordering in the source JSON and the hash is the same.
 *
 * Returns a Uint8Array of UTF-8 bytes ready to feed into the CID hasher.
 */
export function canonicalizeJSON(value: unknown): Uint8Array {
  const canonical = serialize(value);
  return new TextEncoder().encode(canonical);
}

/**
 * Return the canonical string (without the UTF-8 encode step). Useful when you
 * want to compare canonical forms, log them, or pass them to another hasher
 * that takes strings.
 */
export function canonicalizeJSONString(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) {
    throw new Error('canonicalize: undefined is not valid JSON');
  }

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('canonicalize: non-finite numbers are not valid JSON');
    }
    // Per spec: integers without trailing .0. JS's JSON.stringify already
    // does this — 3 stringifies as "3", not "3.0". But for floats we
    // preserve precision via the default.
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    // NFC normalize before encoding — composed forms only.
    return JSON.stringify(value.normalize('NFC'));
  }

  if (Array.isArray(value)) {
    const parts = value.map((v) => serialize(v));
    return '[' + parts.join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined) // skip undefined-valued keys (treat as absent)
      .sort();
    const parts = keys.map((k) => {
      const encodedKey = JSON.stringify(k.normalize('NFC'));
      return encodedKey + ':' + serialize(obj[k]);
    });
    return '{' + parts.join(',') + '}';
  }

  throw new Error(`canonicalize: unsupported type ${typeof value}`);
}
