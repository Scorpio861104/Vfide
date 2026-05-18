# Identity Chip Swap-In — Pattern + Remaining Scope

**Status:** 3 of ~57 candidate files swapped (this commit)
**Component:** `<VaultIdentityChip address={...} size="sm|md|lg" />`
**Source:** `components/identity/VaultIdentityChip.tsx`
**Spec reference:** `VFIDE_MERCHANT_PROFILE_SPEC.md` §7

This document explains the pattern for replacing raw `0x…` address rendering with the merchant-identity-aware chip throughout the frontend. The swap is being done incrementally rather than as a single 57-file mass change, because each call site needs a small visual judgment about size and context that's easier to make one file at a time.

---

## The pattern

The frontend has roughly three categories of address rendering. Each gets handled differently.

### Category 1: counterparty addresses — SWAP

A counterparty is anyone-other-than-the-current-user whose address is being shown to the current user. Customer in a returns queue. Reviewer in a product review. Buyer/merchant in a dispute. Heir in an inheritance flow.

Replace whatever local truncation logic exists with the chip:

```tsx
// Before
<span>{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>

// After
import { VaultIdentityChip } from '@/components/identity/VaultIdentityChip';
<VaultIdentityChip address={address} size="sm" />
```

Pick size by context:
- `size="sm"` — table rows, byline-style, compact lists (20px identicon)
- `size="md"` — default, normal flow content (32px identicon)
- `size="lg"` — merchant detail pages, profile views (56px identicon)

Pass `hideAddress` only when the truncated address is already shown nearby (rare). Per spec §7 the address must always be visible somewhere; the default behavior puts it under the name in the chip itself.

### Category 2: the user's own address shown to themselves — DON'T SWAP

When the page says "Connected as 0x1234..." or "Your address: 0x1234..." — the user knows who they are. Adding an identicon and merchant-status pill is noise. Leave the existing truncation alone.

Common examples: `app/control-panel/page.tsx` line 53, `app/merchant/page.tsx` line 101.

### Category 3: ambiguous-actor surfaces — DEFER

Activity feeds, leaderboards, and similar pages render addresses that could belong to anyone — merchants, users, both. Swapping these is technically correct (the chip handles non-merchant addresses gracefully), but the visual change is bigger because identicons appear where none existed before. These should be swapped *after* visual review of how the page looks with identicons everywhere, ideally with one or two real merchants registered on testnet to see the merchant-vs-individual distinction.

Examples to defer for visual review: `components/social/UnifiedActivityFeed.tsx`, `components/gamification/Leaderboard.tsx`, `components/social/ShoppablePost.tsx`.

### Special category: legacy UserProfileService consumers — DON'T SWAP

`components/common/UserDisplay.tsx` reads from `UserProfileService` (a separate identity system, the legacy user-side profile attempt). Touching it would silently disable that system. Wherever `UserDisplay` is currently used, leave it alone. If those surfaces should eventually consume `VaultIdentityChip` instead, that's a separate migration decision.

---

## Files already swapped (reference implementations)

### `components/social/MerchantReview.tsx`
- Context: reviewer byline on each merchant review
- Size: `sm` with `hideAddress` (the ProofScore badge sits right next to it; the truncated address shows in the chip's tooltip via aria-label)
- Before: `${reviewer.address.slice(0, 6)}...${reviewer.address.slice(-4)}` fallback to `reviewer.name`
- After: `<VaultIdentityChip address={review.reviewer.address} size="sm" hideAddress />`

### `app/merchant/returns/page.tsx`
- Context: customer address in return request rows
- Size: `sm`
- Before: `shortAddress(entry.customer_address)` helper function
- After: `<VaultIdentityChip address={entry.customer_address} size="sm" />` (helper function removed)

### `components/merchant/disputes/PeerMediation.tsx`
- Context: buyer + merchant addresses in dispute summary card
- Size: `sm` each
- Before: `shortAddress(currentDispute.buyerAddress)` / `shortAddress(currentDispute.merchantAddress)`
- After: two chips in card layout (helper function removed)

---

## Remaining scope (rough)

The grep that produced the original 57-file list:

```bash
grep -rEl 'slice\(0,\s*6\)|slice\(-4\)|formatAddress|truncateAddress|shortenAddress' app/ components/ 2>/dev/null
```

For each file in the result, decide which category applies, then either swap (category 1), leave alone (category 2 or special), or defer (category 3).

Suggested priority order for further swaps:

**High-leverage, category 1 (do these next):**
- `app/inheritance/claim/page.tsx` — heir address rendering
- `app/vault/components/VaultInheritancePanel.tsx` — guardian + heir lists
- `app/elections/page.tsx` — candidate addresses (council members are vaults, often merchants)
- `app/endorsements/page.tsx` — endorser / endorsee addresses
- `app/governance/components/ProposalsTab.tsx` — proposer + voter addresses
- `app/leaderboard/components/AllTab.tsx` — leaderboard entries (also borderline category 3; check visually)
- `components/social/CreatorDashboard.tsx` — creator-side counterparty rendering
- `components/social/PurchaseProofEvent.tsx` — buyer + merchant in proof events
- `components/social/TrustEventCard.tsx` — actor in trust events

**Category 2 (don't swap; verify and skip):**
- `app/control-panel/page.tsx` — "Connected as" header
- `app/merchant/page.tsx` — "Connected as" header
- `components/wallet/WalletSwitcher.tsx` — user's own wallets
- `components/wallet/WalletSettings.tsx` — user's own settings

**Category 3 (defer pending visual review):**
- `components/social/UnifiedActivityFeed.tsx`
- `components/social/ShoppablePost.tsx`
- `components/gamification/Leaderboard.tsx`

**Special category (don't touch without migration plan):**
- `components/common/UserDisplay.tsx`

---

## Verification checklist for each swap

1. Import added: `import { VaultIdentityChip } from '@/components/identity/VaultIdentityChip';`
2. Size chosen and reasoned: `sm` / `md` / `lg`
3. Manual truncation helper removed if no longer used elsewhere in the file
4. `hideAddress` set only if truncated address is visible elsewhere in the same view
5. Visual review on testnet with a registered merchant to confirm the chip renders correctly
6. File still syntactically clean (no orphaned imports, no dead helpers)

---

## Not-a-bug situations to expect

- **Address appears with identicon + status pill in places that previously had bare text.** This is the design. Identicons everywhere is the §7 rule.
- **A merchant's name appears next to their address now, where only address showed before.** Same. Once merchants register profiles, their names start appearing throughout the UI.
- **A DELISTED merchant shows as "[Delisted Merchant]" with a red pill.** Per spec §8.
- **A SUSPENDED merchant shows with an amber pill but their full profile still renders.** Suspension is recoverable; spec §8.
- **Profile fetch fails and the chip falls back to identicon + truncated address.** Graceful degradation per spec §7 step 4. UI never breaks regardless of backend state.
