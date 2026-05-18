# VFIDE Merchant Profile — Schema Specification v1

**Status:** Draft for review
**Owner:** Vanta
**Last updated:** 2026-05-14
**Implements:** Identity work item 1 (see `VFIDE_INHERITANCE_AUDIT_PACKAGE.md` Section 10 — out-of-scope follow-on items)

---

## 1. Purpose

`MerchantRegistry.metaHash` is a `bytes32` field on each registered merchant in `contracts/VFIDECommerce.sol`. It points to off-chain JSON that gives the merchant a human-readable identity — name, avatar, category, contact information. This document specifies what that JSON looks like.

The hash is content-addressed (CIDv1 with sha2-256, IPFS-compatible) so resolution can move between hosting providers without changing the on-chain commitment.

Individual (non-merchant) vaults do **not** have profiles. They render as identicons with a truncated address. See `VFIDE_PRIVACY.md` (to be written, item 3) for why.

---

## 2. JSON shape

```json
{
  "schemaVersion": 1,
  "name": "Maya's Hair Studio",
  "avatar": "ipfs://bafybeib...m4qa/avatar.jpg",
  "bio": "Braids, locs, and cuts in downtown Lagos. Walk-ins welcome Tue–Sat.",
  "category": "beauty",
  "links": [
    { "label": "Instagram", "url": "https://instagram.com/mayashairstudio" },
    { "label": "Website",   "url": "https://mayashair.example.com" }
  ],
  "createdAt": "2026-05-14T18:00:00Z"
}
```

All fields except `schemaVersion` and `name` are optional. A profile with only `schemaVersion` and `name` is valid and renders as a name + identicon.

---

## 3. Field reference

### `schemaVersion` (required, integer)

Always `1` for this version. Lets future schema revisions break gracefully — a frontend that only knows v1 ignores any v2 profile rather than rendering garbage.

### `name` (required, string)

The merchant's display name as shown on payment screens, receipts, and merchant directories.

- Length: 1–48 characters
- Encoding: UTF-8
- Disallowed: null bytes (`\u0000`), zero-width joiners (`\u200d`), zero-width non-joiners (`\u200c`), right-to-left override (`\u202e`) and other bidi controls (`\u202a–\u202e`)
- Trim: leading/trailing whitespace stripped server-side before hashing
- Casing: preserved as submitted (no auto-titlecase)

The disallow-list is anti-spoofing. RTL overrides and zero-width characters are how impersonation attacks work on most name systems (Slack, Discord, GitHub) — block them at the validation layer.

**Uniqueness is NOT enforced.** Two merchants can have the same name. The frontend resolver always shows the truncated vault address alongside the name. See §7.

### `avatar` (optional, string)

URI pointing to a square image.

- Accepted schemes: `ipfs://`, `https://` (with strict allowlist; see §6)
- Image formats: JPEG, PNG, WebP, SVG (with sanitization)
- Recommended dimensions: 512×512 minimum, square aspect ratio
- File size cap (enforced server-side at upload): 2 MB
- If absent, null, or fails to load: frontend renders a Blockies-style identicon derived from the vault address (deterministic, never empty)

SVG accepted because file size is small and renders crisply at all sizes. **SVG must be sanitized server-side** before pinning — strip `<script>`, `<foreignObject>`, external `<image>` references, and `on*` attributes. Standard XSS hardening; non-negotiable.

### `bio` (optional, string)

Short description shown on the merchant's detail page.

- Length: 0–280 characters
- Encoding: UTF-8
- Disallowed: same as `name`
- Newlines: preserved (single `\n` only, no `\r`)
- No markdown, no HTML, no links — links go in the `links` array

280 chars is a deliberate cap. Long enough to say something useful ("Braids, locs, and cuts in downtown Lagos. Walk-ins welcome Tue–Sat."), short enough that it stays display-friendly on a mobile payment screen.

### `category` (optional, enum string)

One of a fixed set, lowercase ASCII:

```
beauty
food
retail
services
digital
creative
education
health
transport
other
```

Used for directory filtering and the verified-merchant badge color-coding. Frontend must treat unknown values as `other` for forward compatibility. The set will grow over schema versions but never shrink.

### `links` (optional, array)

External links the merchant wants to publish. Maximum 3 entries.

Each entry:
```json
{ "label": "Instagram", "url": "https://instagram.com/handle" }
```

- `label`: 1–24 chars, same character restrictions as `name`
- `url`: must start with `https://` (no `http://`, no other schemes, no `javascript:`)
- Server-side validation runs URL through a strict parser; rejects URLs with embedded credentials (`https://user:pass@…`), fragment-only URLs (`https://#`), or hosts on a published blocklist (known phishing domains, IP addresses, localhost variants)
- Frontend ALWAYS renders external links with `rel="noopener noreferrer nofollow"` and a "this link goes off-VFIDE" indicator
- Frontend does NOT preview link contents (no Open Graph fetching) — that's an information leak

### `createdAt` (optional, ISO 8601 string)

When the profile was first authored, server-set on initial upload. Subsequent profile updates preserve the original `createdAt`.

Not authoritative — the chain's `MerchantAdded` event timestamp is the canonical "merchant registration time." This field is just informational ("merchant since 2024").

---

## 4. Validation rules

A profile that fails any of these is rejected at upload time, before hashing:

1. JSON parses cleanly
2. `schemaVersion == 1`
3. `name` present, 1–48 chars, passes character disallow-list
4. Total serialized size after canonicalization: ≤ 4 KB
5. All optional fields, if present, pass their per-field validation
6. No unrecognized top-level fields (forward-incompatible profiles are rejected; this is intentional — we want failure to be loud, not silent garbage)

Canonicalization before hashing:
- JSON keys sorted alphabetically
- No insignificant whitespace
- Unicode normalized to NFC
- Strings UTF-8 encoded
- Numbers as integers where possible (no trailing `.0`)

Two profiles with identical content but different key ordering or whitespace **must** produce the same hash. This is what makes the content-addressing work.

---

## 5. Hashing

Hash is computed as CIDv1 with sha2-256 multihash:

```
cidv1(sha2-256(canonical_json_bytes))
```

The first 32 bytes of the multihash digest are stored on-chain as `bytes32 metaHash`. The full CID (including codec + multihash prefix) is reconstructible from the digest plus the well-known prefix `0x01551220` (CIDv1 / raw / sha2-256 / 32 bytes).

Frontend resolvers can convert `bytes32 metaHash` to a full CID and fetch from either:
- VFIDE backend: `https://api.vfide.example/profile/${cid}`
- Public IPFS gateway: `https://ipfs.io/ipfs/${cid}` (or any other)
- Local IPFS node: `ipfs://${cid}`

All three return the same bytes because content-addressing is content-addressing.

---

## 6. Avatar hosting policy

For the v1 spec, avatars accept two schemes:

**`ipfs://` URIs** — content-addressed, hostable anywhere. Frontend resolves via the same gateway list as profiles. This is the recommended default for new uploads.

**`https://` URIs** — accepted only if the host is on a published allowlist. v1 allowlist:
- `i.imgur.com`
- `lh3.googleusercontent.com` (Google Drive public images)
- `pbs.twimg.com`
- `cdn.discordapp.com`
- VFIDE backend domain itself

Reason for the allowlist: a malicious image host could swap the image bytes after the profile is hashed. The on-chain commitment is to the JSON, not to the image bytes. Allowlisted hosts have at least *some* operational stability guarantee.

Future schema versions will likely deprecate `https://` avatars entirely in favor of IPFS-only.

---

## 7. Resolution semantics + frontend contract

The frontend resolver exposes one function:

```typescript
useVaultIdentity(address: Address): {
  displayName: string,
  avatarUrl: string,
  isMerchant: boolean,
  isVerified: boolean,
  status: 'active' | 'suspended' | 'delisted' | 'individual'
}
```

Resolution order:
1. Read `MerchantRegistry.merchants(address)` on-chain. If `status == NONE`, this is not a merchant — return `{ displayName: truncate(address), avatarUrl: identicon(address), isMerchant: false, isVerified: false, status: 'individual' }`.
2. If `status == DELISTED`, return `{ displayName: '[Delisted Merchant]', avatarUrl: identicon(address), isMerchant: true, isVerified: false, status: 'delisted' }`. **Do NOT fetch or render the profile JSON.** The on-chain `metaHash` may still point to live content, but the canonical VFIDE frontend refuses to surface a delisted merchant's branding. See §8 for rationale.
3. If `metaHash == bytes32(0)`, return `{ displayName: truncate(address), avatarUrl: identicon(address), isMerchant: true, isVerified: false, status }` — merchant exists but has no profile yet.
4. Fetch the JSON from the resolver chain (VFIDE backend → IPFS gateway → null). On success, validate against schema. On failure or invalid: same as step 3 (graceful degradation).
5. Return populated identity.

**The frontend MUST always render the truncated address alongside the display name.** Format suggestion: `Maya's Hair Studio · 0x7a3f…c2d1`. The name is a hint; the address is the truth. This is the primary anti-impersonation defense — the name alone is never trustworthy.

**The frontend MUST NOT auto-trust profile content for verification badges.** A "verified" merchant is one whose `MerchantRegistry.Status == ACTIVE` AND optionally has an attestation from a designated attester (out of scope for v1; reserved for v1.1).

---

## 8. Mutability + revocation

### Mutability

Profiles are mutable. Updating a profile means:
1. Author new JSON
2. Compute new content hash
3. Call `MerchantRegistry.setMetaHash(newHash)` on-chain (new function — see `contracts/VFIDECommerce.sol` change required)
4. Old hash's content stays accessible (cached by the resolver, possibly pinned by third parties); old hash is just no longer pointed to

This means: a merchant can correct typos, swap avatars, update their bio. The chain commitment moves forward; old versions are visible only via event log history.

### Required contract change

`MerchantRegistry` currently has no setter for `metaHash` after registration, and no way to transition a merchant into `DELISTED` state. Both are added in v1:

```solidity
function setMetaHash(bytes32 newHash) external {
    Merchant storage m = merchants[msg.sender];
    if (m.status == Status.NONE) revert COM_NotMerchant();
    if (m.status == Status.DELISTED) revert COM_Delisted();
    m.metaHash = newHash;
    emit MerchantMetaHashUpdated(msg.sender, newHash);
}

function delistMerchant(address owner, string calldata reason) external onlyDAO {
    Merchant storage m = merchants[owner];
    if (m.status == Status.NONE) revert COM_NotMerchant();
    if (m.status == Status.DELISTED) revert COM_NotAllowed();
    m.status = Status.DELISTED;
    emit MerchantStatus(owner, Status.DELISTED, reason);
}
```

Plus the new event:

```solidity
event MerchantMetaHashUpdated(address indexed owner, bytes32 newHash);
```

(`MerchantStatus` already exists in the contract; `delistMerchant` reuses it.)

Status gates:
- **setMetaHash:** ACTIVE allowed, SUSPENDED allowed (suspension is recoverable; merchant may want to fix what got them suspended), DELISTED rejected (terminal state).
- **delistMerchant:** NONE rejected (not a merchant), ACTIVE/SUSPENDED transition to DELISTED, DELISTED rejected (no double-delist).

`delistMerchant` has no inverse — if a merchant is delisted in error, they re-register with a fresh address. This is intentional friction: delisting should be slow, deliberate, and not casually reversed.

**Tests:** `test/hardhat/MerchantProfileSetMetaHash.test.ts` — 12 tests covering both surfaces, all status branches, event emission, and authority checks.

### Revocation

A merchant wanting to "delete" their profile sets `metaHash` to `bytes32(0)`. Resolver falls back to truncated address + identicon — same as a never-registered merchant. The previous content is still cached/pinned somewhere on the internet (you cannot un-publish from IPFS), but the chain no longer points to it and the canonical UI shows the merchant as profile-less.

This is the strongest "delete" that's honest. The doc must say so plainly in the merchant onboarding — "once you publish a profile, the content may persist on the network even after you remove it from your VFIDE merchant record."

### Moderation

VFIDE frontend operators may refuse to serve a profile hash from their backend if the content violates posted policy. The hash remains on-chain; alternative frontends may serve it; VFIDE.com does not. This is frontend operator policy, not protocol-level censorship. Document this in `VFIDE_PRIVACY.md`.

### Delisted merchants

When `MerchantRegistry.Status == DELISTED`, the canonical VFIDE frontend does NOT render the merchant's profile content — name, avatar, bio, and links are all suppressed regardless of what `metaHash` points to. The resolver returns `displayName: '[Delisted Merchant]'` and falls back to the identicon. See §7 step 2.

Rationale: DELISTED is a terminal state taken against a merchant for cause (fraud, repeated disputes, ToS violation, regulator demand). Continuing to surface their branding actively undermines the act of delisting:

- A scammer's polished business name and avatar remain discoverable to any new buyer who stumbles on the vault, contradicting the protocol's explicit action against them
- It creates an asymmetric experience where frontends that surface DELISTED warnings show one thing and frontends that don't show another — delisting becomes a frontend implementation detail rather than a meaningful protocol-level action
- The brand was the tool; removing access to the tool is part of the consequence

The on-chain `metaHash` is not modified by delisting (the merchant retains their data sovereignty in the strict sense — anyone running their own resolver can fetch the underlying JSON). What changes is that the canonical VFIDE frontend, and any frontend that follows this spec, refuses to render it.

Historical transactions in a user's payment history that reference a now-delisted merchant should retain the name they were recorded with at transaction time — frontends are expected to cache merchant names per-transaction so receipts remain interpretable. The "[Delisted Merchant]" rendering applies to live lookups, not historical records.

SUSPENDED merchants are different — their profile still resolves. Suspension is a temporary state; the merchant may return to ACTIVE. Hiding their profile during suspension would create UX whiplash on reinstatement.

---

## 9. What this spec does NOT cover

- **Individual user profiles.** Out of scope; intentionally not built. See `VFIDE_PRIVACY.md`.
- **Stealth addresses / transaction privacy.** Separate spec, `VFIDE_STEALTH_ADDRESSES.md` (item 8 of identity work).
- **Attestations / merchant verification beyond `Status == ACTIVE`.** Future work, v1.1.
- **Cross-chain profile resolution.** v1 is single-chain (Base / Base Sepolia). The CID format works across chains, but the on-chain commitment lives on a specific chain.
- **Backend service implementation details.** Separate doc; spec only defines the API surface (POST `/profile`, GET `/profile/${cid}`, schema-as-above, IPFS-compatible hashing).

---

## 10. Implementation checklist

In dependency order:

- [x] **Contract:** Add `setMetaHash(bytes32)` and `delistMerchant(address, string)` to `MerchantRegistry`, emit `MerchantMetaHashUpdated` event. Status checks per §8.
- [x] **Tests:** `MerchantProfileSetMetaHash.test.ts` — 12 tests covering both functions, all status branches, event emission, authority checks.
- [ ] **Backend:** POST `/profile` accepts JSON, validates per §4, sanitizes SVGs, canonicalizes per §4, computes CIDv1 hash, pins, returns hash. GET `/profile/${cid}` returns canonical JSON.
- [ ] **Backend:** Avatar upload endpoint POST `/avatar` accepts image, validates per §3 (size, format), sanitizes SVG if applicable, pins, returns IPFS URI.
- [ ] **Backend:** Moderation queue + report endpoint (manual review, not automated).
- [ ] **Frontend:** `useVaultIdentity(address)` hook implementing §7 resolution order.
- [ ] **Frontend:** Identicon component (Blockies-style, deterministic from address).
- [ ] **Frontend:** Every place currently rendering a raw address swaps to identity component.
- [ ] **Frontend:** Merchant onboarding wizard adds profile step (name required, avatar/bio/category/links optional), with the privacy disclosure paragraph.
- [ ] **Frontend:** Merchant settings page lets existing merchants edit their profile (calls `setMetaHash` on chain after backend POST).
- [ ] **Documentation:** `VFIDE_PRIVACY.md` (item 3 of identity work).
- [ ] **Documentation:** Merchant onboarding shows the public-vs-private disclosure paragraph inline.

Each remaining item independent enough to land in its own commit / review pass.

---

## 11. Open questions to resolve before implementation

1. **CIDv1 reconstruction in Solidity.** The on-chain `bytes32` is just the digest. To reconstruct the full CID for resolver consumption, frontends need the prefix `0x01551220`. Should this be a constant in the contract (returned alongside the hash for clarity), or pure frontend convention? **Recommendation:** frontend convention with the prefix documented in this spec. Don't pay gas for a constant that never changes.

2. **Backend gateway URL format.** `https://api.vfide.example/profile/${cid}` vs `https://profiles.vfide.example/${cid}`. Decide based on existing domain structure. Not a spec concern but worth deciding before frontend integration.

3. **Pinning cost model.** Pinata's free tier is 1 GB pinned. At ~4 KB per profile + ~50 KB average per avatar, that's ~18,000 merchants. Fine for testnet, will need paid tier for mainnet. Budget consideration, not a spec issue.

4. **Identicon library.** Recommended: `@metamask/jazzicon` (visually pleasant, widely recognized in crypto) or `ethereum-blockies-base64` (more traditional). Pick one; consistency matters for visual identity continuity. **Recommendation:** Jazzicon — better aesthetics, the protocol's brand already leans modernist.

---

## 12. Sign-off

This spec is a draft. Review for:
- Field choices (is anything missing? `tip_jar_address` for tipped-service merchants?)
- Length caps (is 280 chars for bio enough? 48 for name?)
- Category list (right granularity?)
- Privacy disclosure language (will appear in merchant onboarding)
- Whether avatar HTTPS allowlist is the right call vs IPFS-only

Once signed off, locks the JSON shape and the contract changes — both backend and frontend can be built against this in parallel.
