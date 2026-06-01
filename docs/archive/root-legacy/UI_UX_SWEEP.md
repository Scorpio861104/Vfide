# UI/UX Deep Sweep Report

**Branch:** `mainnet-readiness/full-slither-clean`
**Scope:** Full deep UI/UX audit of the Vfide frontend covering accessibility (a11y), keyboard navigation, ARIA semantics, modal a11y, form UX, copy quality, console hygiene, image alt-text, external link security, focus management, semantic landmarks, mobile responsiveness, and Web3 UX.

This sweep targeted issues missed by prior audits (deployment-readiness audit `2cda89c` and page audit `13ac056`). It used custom static analyzers built specifically for this pass.

---

## Summary

| Category | Issues Found | Issues Fixed | Status |
|---|---|---|---|
| Icon-only buttons missing `aria-label` | 35 | 35 | ✅ Fixed |
| `<div onClick>` real-interactive elements (keyboard inaccessible) | 7 | 7 | ✅ Fixed |
| Modal backdrops missing `role="dialog"` / `aria-modal` / Escape handler | 7 | 7 | ✅ Fixed |
| Form inputs missing `autoComplete` / `inputMode` (email/tel) | 5 | 5 | ✅ Fixed |
| Missing `<main>` semantic landmark in app shell | 1 | 1 | ✅ Fixed |
| `<img>` tags missing `alt` | 0 | — | ✅ Already clean |
| `target="_blank"` links missing `rel="noopener noreferrer"` | 0 | — | ✅ Already clean |
| `window.alert/prompt/confirm` (poor UX) in code paths | 0 | — | ✅ Already clean |
| Loading skeletons (`loading.tsx`) | 127 files present | — | ✅ Excellent coverage |
| Error boundaries (`error.tsx`) | 134 files present | — | ✅ Excellent coverage |
| Global `not-found.tsx` | 1 present | — | ✅ Present |
| Viewport / theme-color meta | configured | — | ✅ Configured |
| Skip-to-content link | present in `app/layout.tsx` | — | ✅ Wired to `#main-content` |

---

## 1. Icon-only buttons missing `aria-label` (35 fixed)

Built a Python static analyzer (`tmp/check_aria_buttons.py`) that uses a balanced-brace JSX expression walker (not a naive regex) to identify `<button>` and `<motion.button>` elements whose body contains only icon children (Lucide icons such as `<X />`, `<Send />`, `<Heart />`, `<Mic />`, etc.) without any text node or `aria-label`/`aria-labelledby`/`title`/sr-only span.

Heuristics used to filter false positives:
- Identifiers that look like labels (regex on names containing `label`, `text`, `title`)
- String literals with ≥ 2 alphabetic characters
- i18n call expressions (`t(`, `i18n`)
- Conditional ternaries containing `?:` (typically render text)

Initial naive regex returned 93 candidates with too many false positives. After three iterations of refinement, the analyzer settled on **35 real findings**, all of which were patched (most via auto-patcher, three via hand-patch in `LiveSelling.tsx` and `VoiceNote.tsx` where multiple buttons sat on a single line).

**Files patched (31 unique files):**

```
components/notifications/NotificationUI.tsx      (×2)
components/modals/LessonModal.tsx
components/gestures/GestureComponents.tsx
components/onboarding/OnboardingSystem.tsx
components/invoice/InvoiceManager.tsx
components/ui/FormElements.tsx                   (×2)
components/profile/AvatarUpload.tsx
components/compliance/OnRampIntegration.tsx
components/wallet/SessionKeyManager.tsx
components/wallet/WalletSettings.tsx
components/search/UnifiedSearch.tsx
components/tx-preview/TransactionPreview.tsx
components/messages/ReactionPicker.tsx
components/social/TransactionButtons.tsx
components/social/GroupMessaging.tsx             (×2)
components/social/MarketStory.tsx
components/social/AIProductListing.tsx
components/social/LiveSelling.tsx                (×3, hand-patched)
components/social/VoiceNote.tsx                  (×3, hand-patched)
components/merchant/ProductDetailModal.tsx
app/marketplace/components/FilterContent.tsx
app/merchant/payment-links/page.tsx
app/merchant/bookings/page.tsx
app/merchant/inventory/page.tsx
app/merchant/subscriptions/page.tsx
app/merchant/invoices/page.tsx
app/merchant/tax/page.tsx
app/(commerce)/store/[slug]/components/ShareStoreSheet.tsx
app/vault/recover/components/ClaimFlowModal.tsx
```

Labels assigned via icon + handler heuristic:

| Icon / handler | aria-label |
|---|---|
| `X`, `XCircle` + `onClose`/`onDismiss`/`onCancel` | `"Close"` |
| `RefreshCw`, `RefreshCcw` | `"Refresh"` |
| `Send` | `"Send"` |
| `Heart` | `"Like"` |
| `MessageCircle` + `handleWhatsApp` | `"Send via WhatsApp"` |
| `Mic` + `startRecording` | `"Record voice note"` |
| `Trash2` + `cancelRecording` | `"Discard recording"` |
| `Square` (stop recording) | `"Stop recording"` |
| `X` + `clearQuery` | `"Clear search"` |
| `handleRemoveBiometric` | `"Remove biometric credential"` |

---

## 2. Real-interactive `<div onClick>` keyboard-inaccessible (7 fixed)

A second analyzer (`tmp/check_div_onclick.py`) found 32 `<div onClick>` cases. Of these, 12 are modal-backdrop click-to-dismiss patterns (separately addressed in §3) and ~13 are presentational wrappers where `onClick` is purely cosmetic. The remaining **7 are genuine interactive controls** that were inaccessible via keyboard. All were converted to keyboard-operable alternatives:

### 2.1 `components/social/StoryViewer.tsx` — Story navigation

The left and right tap zones to navigate previous/next story were `<div onClick>`. Converted to proper `<button type="button">` with `aria-label="Previous story"` / `aria-label="Next story"` and `focus-visible` outline styling. The close button was given `aria-label="Close stories"`.

### 2.2 `components/ux/MediaComponents.tsx:465` — Video seek bar

Converted from `<div onClick>` to a proper `role="slider"` with:
- `tabIndex={0}`
- `aria-label="Seek video"`
- `aria-valuemin={0}` / `aria-valuemax={duration}` / `aria-valuenow={currentTime}` / `aria-valuetext` (formatted time)
- Keyboard handler: `ArrowLeft`/`ArrowDown` = −5%, `ArrowRight`/`ArrowUp` = +5%, `Home` = 0, `End` = 100% (synthesized via MouseEvent for the existing seek handler).

### 2.3 `components/wallet/SessionKeyCard.tsx` — Expand/collapse

The expand-toggle `<div onClick>` was converted to use `role="button"`, `tabIndex={0}`, `aria-expanded={expanded}`, `aria-controls="session-{id}-details"`, plus `onKeyDown` for Enter/Space. The expanded panel got the matching `id`. The nested revoke button gained `aria-label="Revoke session key"`.

> Note: We did *not* convert this to a real `<button>` because the card contains a nested revoke `<button>` inside the click target, and HTML disallows nested buttons. The `role="button"` with full keyboard support is the correct accessible alternative for this nested-control pattern.

### 2.4 `components/social/MarketVibes.tsx:148` — Front/back camera flip

Both the main image flip and the picture-in-picture swap got `role="button"`, `tabIndex={0}`, dynamic `aria-label` ("Show front camera view" / "Show back camera view" / "Swap camera view"), and `onKeyDown` handlers.

### 2.5 `components/merchant/ProductDetailModal.tsx:169` — Related-products grid

Each related-product tile was converted to `role="button"` + `tabIndex={0}` + dynamic `aria-label={\`View ${r.name}\`}` + `onKeyDown` for Enter/Space.

### 2.6 `components/remittance/BeneficiaryManager.tsx:147` — Beneficiary select

Already had `role="button"` + `tabIndex={0}` + `onKeyDown`. Added `aria-label={\`Select beneficiary ${name}\`}` and `aria-pressed={selected}` for state communication.

### 2.7 `components/social/StoryCreator.tsx:212` — Media upload dropzone

Converted from `<div onClick>` to `role="button"` + `tabIndex={0}` + `aria-label="Add photo or video to story"` + Enter/Space `onKeyDown` to open file picker.

---

## 3. Modal backdrops missing dialog semantics (7 fixed)

The following 7 modal backdrops used `<div className="fixed inset-0 ... " onClick={onClose}>` without ARIA dialog semantics or Escape-key support:

```
app/merchant/payment-links/page.tsx:334
app/merchant/bookings/page.tsx:398
app/merchant/inventory/page.tsx:389
app/merchant/subscriptions/page.tsx:290
app/merchant/invoices/page.tsx:366
app/merchant/tax/page.tsx:306
components/merchant/ProductDetailModal.tsx:69
```

A batch patch (`tmp/patch_modal_a11y.py`) added to each:
- `role="dialog"`
- `aria-modal="true"`
- `tabIndex={-1}` (so the dialog can receive focus)
- `onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}`

`ProductDetailModal` additionally got `aria-label="Product details"` since it doesn't have a discoverable heading id.

---

## 4. Form input UX (5 fixed)

Static analyzer `tmp/check_autocomplete.py` found 5 `<input type="email|tel|password">` elements lacking `autoComplete` (impacting browser autofill, password managers, and mobile keyboard layout):

| File | Line | Type | Added |
|---|---|---|---|
| `components/invoice/InvoiceManager.tsx` | 202 | `tel` | `autoComplete="tel"`, `inputMode="tel"` |
| `components/profile/ProfileSettings.tsx` | 178 | `email` | `autoComplete="email"`, `inputMode="email"` |
| `components/commerce/MerchantPOS.tsx` | 1134 | `email` | `autoComplete="email"`, `inputMode="email"` |
| `app/pay/link/[id]/components/PayLinkContent.tsx` | 179 | `email` | `autoComplete="email"`, `inputMode="email"` |
| `app/merchant/invoices/page.tsx` | 389 | `email` | `autoComplete="email"`, `inputMode="email"` |

`inputMode` ensures mobile devices show the correct keyboard (e.g., `@` on email keyboards, number-pad on tel).

---

## 5. Semantic landmark — `<main>` (1 fixed)

`components/navigation/AppShell.tsx` wrapped page content in a plain `<div>` rather than a semantic `<main>` landmark. The skip-to-content link in `app/layout.tsx` targets `#main-content`, but no element had that id.

**Fix:** Changed the wrapper to:
```tsx
<main id="main-content" className="pt-7 pb-20 md:pb-0 appshell-content" tabIndex={-1}>{children}</main>
```

This wires the skip link, provides a screen-reader landmark, and makes the main content programmatically focusable for skip-link target focus management.

---

## 6. Categories audited and found clean

- **`<img>` alt audit:** 0 missing alt attributes (`tmp/check_alt.py` found 3 candidates, all false positives in JSDoc comments / already-empty `alt=""` decorative).
- **External link security:** 0 `target="_blank"` links missing `rel="noopener noreferrer"` (all 30+ external links checked).
- **Console hygiene:** Only intentional `console.*` calls remain (in `lib/validateProduction.ts` CLI helper, `lib/logger.ts` logger implementation itself, server-side `app/api/streams/route.ts` error logs, and `hooks/useScoreHistory.ts` error path). No stray debug `console.log`s.
- **`window.alert` / `window.prompt` / `window.confirm`:** Already replaced project-wide by `PromptModal` and the new service-worker update toast. Only references are explanatory comments.
- **Loading states:** 127 `loading.tsx` files (matches the 136 page count nearly 1:1 — only sub-routes that delegate to parent are uncovered).
- **Error boundaries:** 134 `error.tsx` files — comprehensive route-level error handling.
- **Viewport / theming:** `app/layout.tsx` exports a proper Next.js `viewport` config with `device-width`, `initialScale: 1`, `themeColor`, and `viewportFit: 'cover'` for notched devices.
- **Focus-visible vs `outline-none`:** 309 instances of `outline-none` were sampled — all couple it with a visible focus indicator (`focus:border-cyan-500/50`, `focus:ring-2`, etc.). Acceptable WCAG-equivalent pattern.
- **Skip-to-content:** Present and now correctly wired to the new `<main id="main-content">` landmark.

---

## 7. Verification

| Check | Result |
|---|---|
| `tsc --noEmit` (TypeScript strict) | **0 errors** |
| `eslint` on all modified files | **0 errors**, 42 pre-existing warnings (unused imports — not introduced by this sweep) |
| `jest --testPathPatterns=a11y` (241 tests) | **241 / 241 pass** |
| Full `jest` suite (9231 tests) | **9051 pass, 164 skipped, 16 todo, 0 failures** |

---

## 8. Files changed in this sweep

### New / modified Component files (a11y patches)
```
app/(commerce)/store/[slug]/components/ShareStoreSheet.tsx
app/marketplace/components/FilterContent.tsx
app/merchant/bookings/page.tsx
app/merchant/inventory/page.tsx
app/merchant/invoices/page.tsx
app/merchant/payment-links/page.tsx
app/merchant/subscriptions/page.tsx
app/merchant/tax/page.tsx
app/pay/link/[id]/components/PayLinkContent.tsx
app/vault/recover/components/ClaimFlowModal.tsx
components/commerce/MerchantPOS.tsx
components/compliance/OnRampIntegration.tsx
components/gestures/GestureComponents.tsx
components/invoice/InvoiceManager.tsx
components/merchant/ProductDetailModal.tsx
components/messages/ReactionPicker.tsx
components/modals/LessonModal.tsx
components/navigation/AppShell.tsx
components/notifications/NotificationUI.tsx
components/onboarding/OnboardingSystem.tsx
components/profile/AvatarUpload.tsx
components/profile/ProfileSettings.tsx
components/remittance/BeneficiaryManager.tsx
components/search/UnifiedSearch.tsx
components/social/AIProductListing.tsx
components/social/GroupMessaging.tsx
components/social/LiveSelling.tsx
components/social/MarketStory.tsx
components/social/MarketVibes.tsx
components/social/StoryCreator.tsx
components/social/StoryViewer.tsx
components/social/TransactionButtons.tsx
components/social/VoiceNote.tsx
components/tx-preview/TransactionPreview.tsx
components/ui/FormElements.tsx
components/ux/MediaComponents.tsx
components/wallet/SessionKeyCard.tsx
components/wallet/SessionKeyManager.tsx
components/wallet/WalletSettings.tsx
```

### Custom analyzers (kept in `tmp/` for future use, not committed)
```
tmp/check_aria_buttons.py    — JSX-aware icon-only button auditor with brace-balanced expression walker
tmp/check_alt.py             — img alt audit (no real findings)
tmp/check_div_onclick.py     — div onClick auditor with backdrop-pattern detection
tmp/check_target_blank.py    — _blank rel=noopener auditor (0 findings)
tmp/check_autocomplete.py    — form input autoComplete auditor
tmp/patch_aria_buttons.py    — auto-patcher applying aria-label by icon+handler heuristic
tmp/patch_modal_a11y.py      — batch dialog/aria-modal/Escape patcher
```

---

## 9. Recommended follow-ups (out of scope for this sweep)

These are not regressions — they are general improvements identified during the sweep:

1. **Form labels**: 278 `<label className=...>` instances use the wrapping pattern (label > input). This is valid, but a future sweep could standardize on `htmlFor` + `id` for explicitness.
2. **Color contrast**: A formal axe / Lighthouse pass on dark-mode overlays (e.g., `text-zinc-500` on `bg-zinc-900` borderline cases) could flag low-contrast pairs.
3. **Reduced motion**: Audit `framer-motion` animations against `prefers-reduced-motion`. The `lib/accessibility.tsx` utilities support this — adoption could be expanded.
4. **Live regions**: Toast notifications and async tx status updates could benefit from `aria-live="polite"` / `role="status"` consolidation. Some already have it; sweep for completeness.
5. **Modal initial focus**: While Escape-handling and dialog roles are now in place, consider auto-focusing the first interactive element when each modal opens (some already do via `autoFocus`; not yet universal).

These would form a natural next-iteration a11y sweep but are not blockers for production deployment.

---

**End of report.**
