# VFIDE Phase 3 Audit — Frontend

**Scope:** Next.js app routes, React components, client-side hooks and providers, browser-side crypto and wallet libraries, and all code that runs in the user's browser. Excludes backend API routes (Phase 2), smart contracts (Phase 1), and infrastructure (Phase 4).

**Status:** IN PROGRESS. Session 2 complete. Reviewed ~17 files depth-first plus targeted grep across 104 localStorage call sites and 17 private-key references.

**Method:** Same as Phase 1/2 — severity-tagged findings (Critical/High/Medium/Low) with file:line references, exploit descriptions, and remediation guidance. This is a pre-professional-audit artifact, not a substitute for professional firm engagement.

---

## 1. Executive Summary

Session 1 found two Critical-candidates and four Highs. Severity assessment for Phase 3 leans on two adjustments versus Phase 2:

1. **Client-side execution model.** Anything in the browser runs in an environment the attacker may fully control — via malicious extensions, XSS, compromised CDNs, or physical-device access. Storage is accessible, clipboard is shared, React state is visible in devtools. The threat model assumes the browser is adversarial unless proven otherwise.

2. **Emerging-market demographic.** VFIDE's target users (Phase 1 established: market sellers, remittance workers, fair trade farmers in West/East Africa) are more likely to use shared/public devices, internet-cafe printers, limited-data-plan mobile browsers, and OS installations they don't control. Findings that assume "user has a dedicated trusted laptop" apply less here — severity ratings account for the real user context.

The highest-impact Session 1 findings cluster around the paper wallet and the embedded wallet:

- **Paper wallet clipboard and print flow** route plaintext private keys through OS-level shared resources (clipboard managers, print spoolers). Critical in the demographic context.
- **Paper wallet served from a live website** contradicts its own "use on an offline device" advice. Any supply-chain compromise exposes every key generated on every device.
- **Embedded wallet is a trap.** Currently unreachable (onboarding crashes first), but built on a fake-address generator with 32-bit entropy and no private keys. Any "fix" to the onboarding crash accidentally activates the fake-address path.
- **Onboarding crashes** for new users at the BeginnerWizard step because `<EmbeddedWalletProvider>` is never mounted anywhere in the tree.

Subsequent sessions will continue depth-first through `lib/crypto.ts`, `lib/stealthAddresses.ts`, checkout/payment flows, admin pages, and the 104-site localStorage usage pattern.

---

## 2. Architecture Summary

The application is a Next.js 15 app-router project with route groups organizing features by domain: `(auth)`, `(commerce)`, `(finance)`, `(gamification)`, `(governance)`, `(marketing)`, `(security)`, `(seer)`, `(social)`, plus 70+ top-level routes.

**Provider tree** (root layout → nested):
```
RootLayout
 └ CoreProviders
    ThemeProvider > LocaleProvider > AdaptiveProvider >
    OnboardingProvider > ToastProvider >
     Web3Providers
      WagmiProvider > QueryClientProvider > RainbowKitProvider >
      SecurityProvider > WalletPersistenceManager >
       [Route-group-specific providers]
        SocialProviders (presence, notifications) — (social) group only
        GamificationProviders (achievement toasts) — (gamification) group only
        CommerceProviders (cart) — (commerce) group only
        ...
```

The `(marketing)` route group intentionally has zero client JS (pure RSC) — correct tier-splitting.

**Wallet integration** is via RainbowKit + Wagmi. `<ConnectButton>` (RainbowKit) handles wallet selection, then wagmi hooks provide account state. Traditional wallets (MetaMask, Coinbase Wallet, WalletConnect) flow through this path cleanly.

**Embedded wallet** (email/social login) is a parallel system with two competing implementations — `lib/embeddedWallet/embeddedWalletService.tsx` (the broken demo-mode fallback) and `lib/wallet/EmbeddedWalletAdapter.tsx` (the fail-closed Privy placeholder). The former is re-exported from `components/wallet/index.ts` and consumed by onboarding; the latter is unused. Details in F-H-02 below.

**Client-side crypto libraries:**
- `lib/crypto.ts` (577 LOC) — payment/approval integration (not yet reviewed)
- `lib/cryptoApprovals.ts`, `lib/cryptoConfirmations.ts`, `lib/cryptoErrorHandling.ts`, `lib/cryptoRateLimiting.ts`, `lib/cryptoValidation.ts` — support libs
- `lib/stealthAddresses.ts` (653 LOC) — stealth-address protocol (not yet reviewed)
- `lib/sessionKeys/sessionKeyService.ts` — already covered in Phase 2 (P2-H-13)

**High-risk pages identified for deeper review:**
- `app/paper-wallet` — seed phrase generation (covered Session 1)
- `app/checkout/[id]` — transaction signing UI (409 LOC, queued)
- `app/admin`, `app/control-panel`, `app/council` — privileged operations (queued)
- `app/cross-chain`, `app/stealth` — novel crypto flows (queued)

---

## 3. Findings — Critical

### F-C-01 — Paper wallet copies plaintext private key and mnemonic to system clipboard with no clearing

**File:** `app/paper-wallet/components/GenerateTab.tsx:30-35, 88-91, 70-72`.

```typescript
function copy(value: string, key: string) {
  navigator.clipboard.writeText(value).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  });
}
```

The `copy` function is called with `wallet.privateKey` at line 88 and with `wallet.address` at line 70. The user clicks a copy-icon next to the private key field; the unmasked key is written to the OS clipboard; the `setTimeout` at line 33 clears only the green "Copied!" indicator after 2 seconds — **not the clipboard content itself**.

Consequences:

1. **Clipboard retains the private key indefinitely** until the user explicitly copies something else.
2. **Other browser tabs can read it.** `navigator.clipboard.readText()` is available to any page on any origin that has clipboard-read permission (most browsers grant this freely on user interaction). A malicious ad iframe, a phishing page, or any other tab opened afterward can silently read the key.
3. **Browser extensions can read it.** Clipboard access is a common extension permission.
4. **OS-level clipboard managers persist it.** Windows 10+ clipboard history, macOS Universal Clipboard, Linux desktop environments with clipboard-manager utilities (GPaste, CopyQ, KDE Klipper) — all retain copied values across reboots and across user sessions. Some sync clipboard history to cloud services.
5. **Password managers and productivity tools** (1Password, Bitwarden, Raycast, Alfred) often track clipboard history or detect when "key-like" content has been copied.

For the target demographic — users who may be on shared, public, or institutional computers (internet cafes, office workstations, family devices) — the private key written to clipboard is likely to be discoverable by the next user of the same machine within minutes.

**Remediation:**

1. **Do not offer one-click copy for private keys or mnemonics.** Force the user to manually select-and-copy, increasing friction but also reducing accidental exposure.
2. If a copy button must exist: clear the clipboard after a short timeout (30 seconds is common), and show a warning explaining that the clipboard has been cleared:
   ```typescript
   navigator.clipboard.writeText(value);
   setTimeout(async () => {
     try {
       const current = await navigator.clipboard.readText();
       if (current === value) {
         await navigator.clipboard.writeText('');
       }
     } catch {}
   }, 30_000);
   ```
   (The timeout-clear will fail silently if the user has navigated away or revoked permission — acceptable.)
3. **Display a warning at copy time.** "Your clipboard is shared with other apps. Paste into your secure backup location immediately."
4. **Consider providing a QR code as the export format instead of text.** QR codes don't flow through the clipboard; users photograph the screen with an offline device. This is how Ledger, Trezor, and established paper-wallet tools do it.
5. **Provide a downloadable encrypted file as an alternative.** User sets a passphrase, receives a JSON keystore file (password-encrypted), never sees the raw key on screen.

### F-C-02 — Paper wallet prints plaintext private key via `window.print()`

**File:** `app/paper-wallet/components/GenerateTab.tsx:123-129`.

```typescript
<button onClick={() => window.print()}>
  <Printer size={14} /> Print
</button>
```

Clicking Print triggers the browser's native print dialog with the current page content — including the revealed private key and mnemonic if the user has toggled them visible (which most users will, because otherwise the print shows just dots).

Risk vectors:

1. **Shared/networked printers.** An office or internet-cafe printer retains the print job in a queue on a print server until it's claimed at the physical printer. In many office environments, the spool file persists on disk indefinitely. Printers with built-in storage (common in enterprise MFPs) retain print history for months.
2. **"Print to PDF" default.** Chrome and Edge default the first printer in the list to "Save as PDF." A user expecting a physical print who accepts the default creates a PDF file in Downloads containing the plaintext key. That file then lives in Downloads, in Recently Opened lists, in indexed content, and in any cloud-sync (Google Drive, OneDrive, Dropbox) the user has configured on their Downloads folder.
3. **Print preview cache.** Some browsers cache print-preview content for session resumption.
4. **Accessibility tools and screen readers** may vocalize the content of the print dialog, exposing the key to anyone listening.
5. **Remote desktop / screen sharing.** If a user is on a remote desktop session (TeamViewer, AnyDesk, office VDI), the print dialog renders through the session — the screen-sharing party sees the plaintext key.
6. **Emerging-market context.** Users who don't own a printer commonly use internet-cafe print services, where the print job is spooled to a shared printer operated by the cafe staff. The staff physically retrieves the printed page before handing it to the customer.

The page prints with no filter applied — no CSS `@media print` rules to redact sensitive content, no intermediate "remove the key and keep only the QR code" step.

**Remediation:**

1. **Remove the Print button entirely.** It is not possible to print a private key safely on a multi-user computer.
2. If the feature is retained: require the user to explicitly opt in to printing the sensitive fields with a scary confirmation dialog and a document-not-to-be-printed-on-shared-printers warning.
3. **Alternative: generate a QR-only PDF download** that contains the key as a QR code only (no plaintext), with clear user instructions to print the QR code and then destroy the PDF file. User scans the QR with an offline device to recover.
4. **Alternative: print a key-derivation artifact, not the key itself.** Print an SSS-split share (2-of-3 Shamir Secret Sharing) so any single printed page doesn't contain the full key. This is how sophisticated paper-wallet tools (Cryptosteel, Seedkeeper) work — a single share is useless to a thief.

### F-C-03 — Checkout UI conceals recipient address and merchant identity; user's only defense is wallet confirmation

**File:** `app/checkout/[id]/page.tsx:218-390` (the entire invoice rendering block).

The hosted checkout page is described in the file header as:

> Public payment page for invoices and payment links. Merchants share /checkout/[id] URLs with customers. No customer authentication required to view — wallet connection to pay.

The rendered invoice displays: invoice number (line 241), status badge (line 244), due date (line 250), line items (description, quantity, unit_price, amount — lines 257-270), subtotal, tax, total, memo, and a "Buyer fee transparency" block. Nowhere in the rendered markup is the merchant's address (`invoice.merchant_address`) or name (`invoice.merchant_name`) displayed to the buyer before the Pay button.

The Pay button handler (line 165-170) uses `invoice.merchant_address` directly:

```typescript
const result = await payMerchant(
  invoice.merchant_address as `0x${string}`,
  invoice.token as `0x${string}`,
  String(invoice.total),
  `INV-${invoice.invoice_number}`,
);
```

The merchant address flows from the API response through `payMerchant` → wallet signing. The buyer never sees the address in the VFIDE UI; they only see it at the wallet-confirmation step (a truncated `0xabc...xyz` display in MetaMask/Rainbow/Coinbase Wallet).

The UI actively promotes trust:
- "Secured by VFIDE" badge at line 223-226.
- A blue "Buyer fee transparency" block (line 299-320) that says "Merchant receives the full invoice amount" — reinforcing the framing that this is a known merchant transaction.
- Professional styling matching legitimate commerce flows.

Attack scenario:

1. Attacker obtains a VFIDE merchant account (either open-registration merchant signup, or compromised legitimate merchant).
2. Attacker creates an invoice with `items[].description = "Legitimate product name"`, legitimate-looking amounts, and a convincing memo.
3. Attacker sends the `/checkout/[id]` link to the victim via email/SMS/social — phishing-style.
4. Victim clicks. Sees a clean, professional payment page with items they recognize or expect.
5. Victim clicks "Pay 100 USDC". Wallet prompt appears showing the attacker's address (possibly truncated on mobile). Victim, primed by the VFIDE UI's "Secured by VFIDE" framing, signs.
6. Attacker receives funds. VFIDE marks the invoice paid (any caller with the link can PATCH the invoice — line 178-182 PATCH has no authentication).

For the target demographic — users unfamiliar with blockchain recipient-address scrutiny, on mobile devices where wallet confirmation dialogs truncate addresses — the attack has a high hit rate.

What the UI **should** show before the Pay button:

- The merchant's human-readable name (from a verified on-platform identity, not self-reported).
- The merchant's full Ethereum address, copyable and verifiable.
- A visual warning if the address is new, has low transaction history, or has been reported for abuse.
- A "first time paying this merchant?" warning for first-time recipients.
- The token's full name and contract address (is it the real USDC, or a fake USDC at a lookalike contract?).

None of this is in the current UI.

**Remediation:**

1. **Display `invoice.merchant_address` prominently above the Pay button.** Copyable, with a block-explorer link. Let the buyer verify out-of-band.
2. **Display `invoice.merchant_name`** if available, with a clear visual indicator of whether VFIDE has verified that merchant identity (green checkmark for verified, gray warning for self-reported).
3. **Display the token contract address** and warn if it doesn't match the canonical USDC/USDT/DAI contract for the connected chain.
4. **Add a confirmation step** for payments above a threshold (e.g., $100 USD equivalent): "You are about to pay [X] [TOKEN] to [MERCHANT_NAME] at [ADDRESS]. This cannot be reversed."
5. **Warn on first-time merchants.** If the buyer has never paid this merchant address before (track locally via an allowlist, or via the VFIDE database), show a yellow banner: "This is your first payment to this merchant. Double-check the address matches what the merchant provided out of band."
6. **Do not claim "Secured by VFIDE"** unless the identity has been verified. Replace with factual labels: "Payment via VFIDE merchant portal" or similar.

This finding is severity Critical because it affects every hosted checkout user, the attack requires no technical sophistication (just a convincing phishing link), and the target demographic is exactly the population most likely to skip wallet-address scrutiny.

---

## 4. Findings — High

### F-H-01 — Onboarding crashes for new users at BeginnerWizard step 2; `<EmbeddedWalletProvider>` is never mounted

**Files:** `components/onboarding/OnboardingManager.tsx:100-113`, `components/onboarding/BeginnerWizard.tsx:41-45`, `components/wallet/EmbeddedLogin.tsx:22, 62, 158, 214`, `lib/embeddedWallet/embeddedWalletService.tsx:392-400`.

The onboarding sequence is:

1. `OnboardingManager` is mounted via `<OnboardingProvider>` in `CoreProviders` (root layout).
2. On first visit (no `vfide_tour_completed` key in localStorage), `<OnboardingTour>` auto-starts.
3. After the tour completes, if the user has not connected a wallet, `<BeginnerWizard>` shows.
4. BeginnerWizard Step 2 ("Choose the easiest wallet setup") mounts `<EmbeddedLogin>` at `BeginnerWizard.tsx:41`.
5. `EmbeddedLogin` imports three hooks from `@/lib/embeddedWallet/embeddedWalletService`:
   ```typescript
   import { useEmailLogin, useSocialLogin, useEmbeddedWallet } from '@/lib/embeddedWallet/embeddedWalletService';
   ```
6. All three hooks call `useContext(EmbeddedWalletContext)` which returns `null`, and `useEmbeddedWallet` throws:
   ```typescript
   if (!context) {
     throw new Error('useEmbeddedWallet must be used within EmbeddedWalletProvider');
   }
   ```
7. A full codebase grep for `<EmbeddedWalletProvider` in JSX finds zero mounting points. Neither `CoreProviders`, `Web3Providers`, `FeatureProviders`, any route-group layout, nor any page mounts the provider.

Result: every new user who runs through onboarding (the default path) crashes at Step 2 the moment React renders EmbeddedLogin. The error propagates up through the React tree. Without an error boundary, the entire tree unmounts. With an error boundary, the user sees a generic failure UI.

Observable impact: the onboarding sequence — the literal "here's how to get started" path for the app's target demographic — does not work. Users have to close the wizard and know to connect MetaMask/Coinbase Wallet directly via the header `<ConnectButton>`.

**Remediation:**

The fix must be chosen carefully because the straightforward fix (mount `<EmbeddedWalletProvider>`) activates F-H-02.

Option A (safe, immediate):
- Remove the `<EmbeddedLogin>` mount from `BeginnerWizard` entirely. The wizard step becomes "Connect MetaMask or Coinbase Wallet" with the existing hardcoded download links.
- Accept that email/social login is a not-yet-implemented feature and don't show it as an option.

Option B (requires fixing F-H-02 first):
- Wire a real embedded wallet SDK — the `lib/wallet/EmbeddedWalletAdapter.tsx` already contains commented-out Privy integration code (lines 59-133). Install `@privy-io/react-auth`, uncomment, remove `lib/embeddedWallet/embeddedWalletService.tsx` entirely, and update all imports.
- This is the "right" solution but requires real SDK integration work and testing.

In both cases: delete `lib/embeddedWallet/embeddedWalletService.tsx` since its current state is a liability (F-H-02).

### F-H-02 — `cryptoHash` in `embeddedWalletService.tsx` generates fake Ethereum addresses with no private keys; 32-bit collision entropy

**File:** `lib/embeddedWallet/embeddedWalletService.tsx:261-282, 244-259, 210-213, 221-223, 233-235`.

The `cryptoHash` function:

```typescript
private cryptoHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;  // coerce to 32-bit int
  }
  let result = '';
  for (let i = 0; i < 10; i++) {
    const mixed = (hash * (i + 1) * 2654435761) >>> 0;  // Knuth's multiplicative
    result += mixed.toString(16).padStart(8, '0');
  }
  return result.slice(0, 40);  // 20 bytes, Ethereum address length
}
```

This is not cryptographic:

1. **32 bits of real entropy regardless of input length.** The first-pass accumulator is coerced to a 32-bit signed integer via `hash & hash`. Everything after the first loop is deterministic distribution of that 32-bit value into 80 hex chars (truncated to 40).
2. **Collision probability.** Birthday paradox: ~50% chance of collision at √(2^32) ≈ 65,536 distinct inputs. At 100k users, most share addresses with other users.
3. **No private key exists for the resulting address.** The address is a hash — not derived from a keypair. No private key computation, no secp256k1 curve point, no ECDSA capability. Just a 40-hex output that happens to fit the shape of an Ethereum address.

This hash is called by `createMockUser(identifier, method)` at line 244-259:

```typescript
const hash = this.cryptoHash(identifier);
const address = ('0x' + hash.slice(0, 40)) as Address;
return { /* ... */ walletAddress: address };
```

Which is called by `loginWithEmail`/`loginWithOAuth`/`loginWithSMS` in `isDemoMode()`:

```typescript
private isDemoMode(): boolean {
  return !this.config.appId || this.config.appId === 'vfide-demo';
}

private async loginWithEmail(email: string): Promise<EmbeddedUser> {
  if (this.isDemoMode()) {
    return this.createMockUser(email, 'email');
  }
  throw new Error('Embedded wallet email login is not configured');
}
```

Currently the whole path is dead code because nobody mounts `<EmbeddedWalletProvider>` (F-H-01). But the moment someone "fixes" F-H-01 by adding `<EmbeddedWalletProvider config={{ appId: '' }}>{children}</EmbeddedWalletProvider>` (the natural first attempt), demo mode activates, `createMockUser` fires, and every user gets a fake address.

Downstream consequences once active:

1. **Funds sent to the displayed address are permanently lost.** No private key → no signing → no ability to spend. Anyone who reads "Your VFIDE wallet: 0xabc..." and sends real ETH/USDC to it has no recovery path.
2. **Collision creates cross-user contamination.** Two users with colliding inputs see the same address. The system's UI presents them as the same user (stored session keyed on walletAddress).
3. **The inline comment at line 245 says "Generate deterministic address from identifier using crypto hash"** — "crypto hash" is a misnomer. Any developer reviewing this file who doesn't read the `cryptoHash` implementation will assume a real cryptographic hash is being used.
4. **File header claims "Secure key management" and "Automatic wallet creation"** (line 10-11). Neither is implemented. Marketing text, not code.

**Remediation:**

1. **Delete the entire `lib/embeddedWallet/` directory.** Currently there are no legitimate consumers (see F-H-01) — only the onboarding wizard that's already broken.
2. Remove re-exports from `components/wallet/index.ts` lines 66-73.
3. If embedded wallet functionality is genuinely needed: integrate a real SDK (Privy, Web3Auth, Dynamic, Magic) per the commented-out code in `lib/wallet/EmbeddedWalletAdapter.tsx`. Those SDKs manage keypairs via HSM or threshold cryptography — they produce real addresses backed by real signing capability.
4. **Never re-implement cryptographic primitives from scratch.** If a future developer needs a hash, reach for `crypto.subtle.digest('SHA-256', ...)` or `viem`'s `keccak256` — both are real hash functions.

### F-H-03 — Paper wallet served from live web page; "offline device" advice contradicts delivery model

**File:** `app/paper-wallet/page.tsx`, `app/paper-wallet/components/GenerateTab.tsx:44-47`.

The security banner at the top of the Generate tab reads:

> Only generate paper wallets on a trusted, offline device. Never share your private key or seed phrase. VFIDE does not store this data — if you lose it, the funds cannot be recovered.

But the page itself is a server-rendered Next.js route delivered from `https://vfide.app/paper-wallet` every time a user visits. The user cannot follow the "offline device" advice because:

- Loading the page requires network access.
- The JavaScript that generates the keys is served from VFIDE's servers/CDN on each visit (subject to caching).
- Any compromise of the served bundle — NPM supply-chain, CDN compromise, XSS in the page, browser-extension tampering with the page's JS — extracts every key that will ever be generated on that version of the page.

What a real "offline paper wallet" tool looks like:

1. **Downloadable HTML bundle with explicit offline usage.** MyEtherWallet historically distributed a zip file users downloaded, unzipped, and opened from local disk — ideally on an air-gapped machine. The user sees "file://" in the address bar, not "https://", and understands the tool runs from their own disk.
2. **Verified reproducible build.** The downloadable zip is signed; users verify the signature before running.
3. **Service worker + "install for offline use" flow.** A PWA can cache its bundle and run offline, but the user must explicitly install and then disconnect from the internet before generating — not a drop-in from a normal page visit.

None of that is present here. The page loads via normal web delivery every time, and the advice text is a hand-wave toward a better practice the implementation doesn't support.

**Remediation:**

1. **Publish a downloadable offline HTML bundle** as the primary paper-wallet tool. Distribute from a signed release (GitHub Releases, IPFS with known hash). The served web page either links to the download OR is marked "demonstration only, do not use with real funds."
2. **Remove the "offline device" advice** from the web-served version if it remains the only option. Honest advice: "This page generates keys in your browser. If your browser or device is compromised, the generated keys are compromised."
3. **If continuing to serve the web page:** add Subresource Integrity (SRI) on all third-party scripts, enforce the strictest possible CSP (`default-src 'none'; script-src 'self' 'sha256-...'`), and include a content-hash verification step where the page displays its own JS bundle hash that the user can verify against a known-good value.
4. **Long-term:** recommend users with real funds use a hardware wallet (Ledger, Trezor, Keystone). The paper-wallet path is a fallback for users who can't afford a hardware wallet ($50-200 USD), but even then, a proper offline process matters.

### F-H-04 — Paper wallet `VerifyTab` accepts private key input on live web page (phishing-training anti-pattern)

**File:** `app/paper-wallet/components/VerifyTab.tsx:70-79, 35-39`.

```tsx
<label>Private Key <span>(optional — verifies key matches address)</span></label>
<input
  type="password"
  value={pkInput}
  onChange={(e) => { setPkInput(e.target.value); setResult(null); }}
/>
```

```typescript
const normalizedPk = pk.startsWith('0x') ? pk : `0x${pk}`;
const wallet = new ethers.Wallet(normalizedPk);
```

Users are prompted to paste their paper-wallet private key into a text field on a live web page. `type="password"` masks visual display but does nothing else:

- The key enters page JavaScript (`pkInput` state).
- `new ethers.Wallet(normalizedPk)` constructs a wallet object holding the key.
- `wallet.address` is read and stored in `derivedAddress` state.
- React DevTools shows component state including the pasted key.
- Any XSS or malicious browser extension in the origin has full access to the state.
- Browser form autofill may save the input value (depends on `autocomplete` attribute — none specified).

Worse: **this trains users to paste private keys into web forms.** Phishing sites are then one hop from success. "VFIDE's paper-wallet verifier wants your key" becomes indistinguishable from "VFIDE-lookalike's paper-wallet verifier wants your key" when the real verifier legitimately asks for it.

The verification operation itself (is this key the private key for this address?) is trivial and can be done offline — either by the user using the same downloadable bundle that generated the key, or by a command-line tool, or by mental arithmetic comparing the public key derivation.

**Remediation:**

1. **Delete the VerifyTab.** The use case it addresses (confirm that a written-down paper wallet is recoverable) should happen on the same offline device that generated the wallet — not on a second, online device.
2. If verification must be offered: make it local-only via a downloadable offline bundle. Do not accept private keys as input on the live web page.
3. If the VerifyTab is retained against this advice: add `autocomplete="off"` and `spellcheck="false"` on the input, warn the user prominently that they are entering a private key into a website, clear the state immediately after verification, and never construct a wallet object in long-lived state.

### F-H-05 — `UnifiedWalletModal` also crashes via the same broken `useEmbeddedWallet` chain (F-H-01 cascade)

**File:** `components/wallet/UnifiedWalletModal.tsx:86-94, 108-112`.

```typescript
export function UnifiedWalletModal({ isOpen, onClose, ... }: UnifiedWalletModalProps) {
  const { isConnected, address } = useAccount();
  const { capabilities } = useSmartWallet();
  const { state: embeddedState } = useEmbeddedWallet();  // throws if no provider
  const [view, setView] = useState<WalletView>(...);

  const isAuthenticated = isConnected || embeddedState.isAuthenticated;
  const walletAddress = address || embeddedState.walletAddress;

  if (!isOpen) return null;
  // ...
}
```

Like `EmbeddedLogin` (F-H-01), this component unconditionally calls `useEmbeddedWallet()` at render time — before the `if (!isOpen) return null` early exit. So even while closed (or about to close), the component throws `"useEmbeddedWallet must be used within EmbeddedWalletProvider"` on every render.

Currently unused in the app (grep finds no consumers outside `components/wallet/`), but exported from the barrel index (`components/wallet/index.ts:38-39`). The moment a developer reads the export list, decides to use "the unified wallet modal" as the project's wallet-connect UX, and mounts it somewhere — the page it's mounted on crashes.

It also embeds `<EmbeddedLogin>` at line 108-112, inheriting EmbeddedLogin's own crash path.

**Remediation:** Remove the `useEmbeddedWallet()` call. If email/social state is needed in the modal, it must come from a real embedded wallet SDK (via `lib/wallet/EmbeddedWalletAdapter.tsx` once wired). Until then, the modal should only surface wagmi-based wallet state. When F-H-02's remediation (delete `lib/embeddedWallet/`) is applied, this import will automatically break — a forcing function to remove the dependency.

### F-H-06 — `lib/crypto.ts` uses JavaScript floating-point arithmetic for wei amounts, causing precision errors on larger balances and transaction amounts

**File:** `lib/crypto.ts:105-116, 250-260`.

Balance read:
```typescript
const balance = asString(await provider.request({
  method: 'eth_getBalance',
  params: [address, 'latest'],
}), 'balance');

const balanceWei = parseInt(balance, 16);  // returns Number
const ethBalance = balanceWei / 1e18;       // float64 division
```

Transaction amount computation:
```typescript
const amountFloat = parseFloat(amount);
// ...
const amountWei = '0x' + (amountFloat * 1e18).toString(16);
```

Both patterns use JavaScript's `Number` type (IEEE-754 float64). `Number.MAX_SAFE_INTEGER` is 2^53 − 1 ≈ 9.007 × 10^15. One ether = 10^18 wei, three orders of magnitude above the safe integer range.

Consequences:

- **Balances above ~0.009 ETH (9 × 10^15 wei) lose precision** at the wei level. Display (`toFixed(4)`) shows 4 decimals which mostly hides this, but the underlying number is imprecise.
- **Transaction amounts like `"1.2345678901234567"` ETH lose precision in the wei computation.** `(1.2345678901234567 * 1e18).toString(16)` produces a hex value that is approximate, not exact. The user's intent (pay X.YZW ETH) does not match what's submitted to the blockchain.
- **Token amounts can hit the same issue.** USDC has 6 decimals (max representable precisely as float64: amounts below ~9 × 10^9 USDC = $9 billion, so safe). But USDT, DAI, and VFIDE may have 18 decimals — same problem as ETH.

The Ethereum community standard is `BigInt` (ES2020) or `bignumber.js` throughout. viem, which is already a dependency, exports `parseEther`, `parseUnits`, `formatEther`, `formatUnits` — all of which use BigInt internally and produce exact results.

**Remediation:**

1. Replace `parseInt(balance, 16)` with `BigInt(balance)` for the raw wei value. Keep wei as BigInt throughout.
2. Replace `amountFloat * 1e18` with `parseEther(amount)` from viem. Token amounts: `parseUnits(amount, decimals)`.
3. For display only, convert to string via `formatEther(balanceWei)` or `formatUnits(balanceWei, decimals)`.
4. Audit all other `lib/crypto*.ts` files, `lib/stealthAddresses.ts`, and any component that does arithmetic on wei amounts for the same pattern.

### F-H-07 — Checkout "View Transaction" link hardcodes zkSync explorer regardless of the chain the transaction was executed on

**File:** `app/checkout/[id]/page.tsx:330-337`.

```tsx
<a
  href={`https://explorer.zksync.io/tx/${txHash}`}
  target="_blank"
  rel="noopener noreferrer"
>
  View Transaction <ExternalLink className="w-3 h-3" />
</a>
```

VFIDE deploys across Base, Polygon, and zkSync Era (per Phase 1 context). A payment made via Wagmi's configured chain (which can be any of the supported networks) gets a transaction hash. The "View Transaction" link always points to zkSync Era's explorer.

If the user's payment happened on Base, the zkSync explorer returns "Transaction not found." The user — who just paid — sees an error message and may reasonably conclude the payment failed. A natural response is to retry, resulting in a **double-charge**.

**Remediation:**

1. Read the transaction's chain ID from wagmi's `useChainId()` or from the payment result.
2. Maintain a chain-id → explorer-URL mapping:
   ```typescript
   const EXPLORER_BY_CHAIN: Record<number, string> = {
     8453: 'https://basescan.org/tx/',
     84532: 'https://sepolia.basescan.org/tx/',
     137: 'https://polygonscan.com/tx/',
     324: 'https://explorer.zksync.io/tx/',
     300: 'https://sepolia.explorer.zksync.io/tx/',
   };
   ```
3. Render the link as `${EXPLORER_BY_CHAIN[chainId]}${txHash}`, or hide the link if the chain is unknown.
4. Audit all other "View on explorer" links in the codebase — likely the same pattern is repeated in transaction-success components, admin pages, etc.

---

## 5. Findings — Medium

### F-M-01 — `exportWallet()` throws placeholder text implying a feature exists

**File:** `lib/embeddedWallet/embeddedWalletService.tsx:193-201`.

```typescript
async exportWallet(): Promise<{ privateKey?: string; mnemonic?: string }> {
  if (!this.state.isAuthenticated) {
    throw new Error('Not authenticated');
  }
  // In production, this would securely export the key
  // For now, show that it requires additional authentication
  throw new Error('Please complete additional verification to export your wallet');
}
```

Unreachable today (F-H-01), but the function is exported through `EmbeddedWalletContextValue.exportWallet` and the UI could invoke it. When invoked, the user-facing error message says "Please complete additional verification to export your wallet" — implying that (a) a feature exists, (b) there's an additional verification flow they can complete, and (c) export is merely gated behind that flow. None of which is true. The function will never succeed in its current form.

Similar to P2-H-06 (half-built 2FA) — user-facing text for nonexistent features.

**Remediation:**

1. If the embedded wallet module is retained: throw an explicit unimplemented error: `"Wallet export is not yet implemented. This feature will be available in a future release."`
2. If the module is deleted (F-H-02 remediation): no action needed.

### F-M-02 — Embedded session stored in localStorage with PII (email, phone, wallet address)

**File:** `lib/embeddedWallet/embeddedWalletService.tsx:331-334, 289-329`.

```typescript
private storeSession(user: EmbeddedUser): void {
  if (typeof window === 'undefined') return;
  safeLocalStorage.setItem('vfide_embedded_session', JSON.stringify(user));
}
```

Where `user: EmbeddedUser` has shape `{ id, email?, phone?, name?, avatar?, authMethod, walletAddress, createdAt, lastLoginAt }`. All of this is serialized to localStorage on successful login.

Issues:

1. **XSS accessibility.** localStorage is readable by any script in the origin. A single XSS on any page on vfide.app extracts the user's email and phone number.
2. **Persistence across tabs and restarts.** localStorage survives browser restarts, syncs via Chrome Profile Sync to other devices, and is readable by service workers. The session outlives the browser window.
3. **No expiration.** The stored session has `lastLoginAt` but no explicit expiration timestamp — it's valid indefinitely unless the code checks age (which `getStoredSession` at line 289-329 does NOT).

Currently dead code (F-H-01), but if the embedded wallet is activated, this is how PII persistence works.

**Remediation:**

1. If the module is retained: switch to `sessionStorage` (clears on tab close) or in-memory React state only. For "remember me" functionality, set an HTTP-only cookie with the session ID from the server, and have the server resolve to the full session.
2. Add a `validUntil` timestamp; reject sessions older than 24 hours.
3. Encrypt sensitive fields (email, phone) with a key derived from the user's wallet signature — so the stored session is useless without the wallet's consent to decrypt it.
4. If the module is deleted: no action needed.

### F-M-03 — Paper wallet `VerifyTab` introduces 300ms artificial delay during key validation

**File:** `app/paper-wallet/components/VerifyTab.tsx:22-49`.

```typescript
setTimeout(() => {
  try {
    // ... ethers.isAddress(addr), new ethers.Wallet(normalizedPk), ...
  } catch { /* ... */ }
}, 300);
```

The 300ms delay is wrapped around the verification logic for a "feels like real work" UX effect. Functionally harmless, but for a security-critical operation the extra window during which the private key sits in React state increases the exposure surface (any XSS or extension fired during those 300ms gets additional sampling time on the key).

Security-sensitive code should not have artificial delays. If loading state matters UX-wise, do actual work in those 300ms (e.g., proof-of-work or a derive-and-verify over the full keypair).

**Remediation:** Remove the `setTimeout` wrapper. Verification is synchronous and should complete instantly. If the button-press feels too abrupt, use a minimum visual duration for the spinner itself without actually delaying the key handling.

### F-M-04 — `lib/crypto.ts` uses `Math.random()` for transaction IDs

**File:** `lib/crypto.ts:214`.

```typescript
const transaction: Transaction = {
  id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  // ...
};
```

Same pattern as Phase 2's P2-H-13 (session keys) and P2-L-24. `Math.random()` is not cryptographically secure; Chrome/Firefox use xorshift128+ which is publicly broken. If transaction IDs are used for any security-sensitive purpose (receipt lookup, audit trail correlation, idempotency keys to prevent replay), predictable IDs enable enumeration and race-condition attacks.

Even absent direct exploitation: `Math.random()` in rapid succession produces colliding values more often than a CSPRNG. Two payments fired within the same millisecond could produce identical `id` fields, corrupting the deduplication logic that `saveTransaction` likely depends on.

**Remediation:** Replace with `crypto.randomUUID()` (available in both Node and modern browsers) or `crypto.getRandomValues()` for custom-length IDs. `Date.now()` prefix is fine for ordering; the random component just needs real entropy.

### F-M-05 — Checkout page's "Secured by VFIDE" label gives false confidence when VFIDE does not verify merchant identity

**File:** `app/checkout/[id]/page.tsx:222-226`.

```tsx
<div className="text-center mb-6">
  <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-2">
    <Shield className="w-4 h-4" />
    <span>Secured by VFIDE</span>
  </div>
```

The label implies VFIDE has verified the transaction's legitimacy. VFIDE's actual role in the checkout flow:

- Hosts the invoice data in its database.
- Routes the payment via the `payMerchant` contract path.
- Records the payment in the invoice table.

VFIDE does **not**:

- Verify the merchant's legal identity.
- Check whether the token contract is the canonical USDC/USDT/DAI or a fake lookalike.
- Confirm the invoice represents a real commercial transaction.
- Guarantee anything about the recipient.

"Secured by VFIDE" is the kind of reassurance that phishing attackers rely on — it anchors the user's trust to a known brand while the actual transaction is unverified.

This pairs with F-C-03 to compound risk: the UI tells the user this is safe and hides the recipient address, so nothing in the VFIDE UI can alert them to a spoofed invoice.

**Remediation:**

1. Remove the "Secured by VFIDE" banner, or replace with factual phrasing: "Invoice hosted by VFIDE. Verify recipient address before paying."
2. If the brand reassurance is important (for buyer trust in VFIDE as a platform), pair it with explicit verification UI: a checkmark next to the merchant name if VFIDE has KYC'd them, a warning if not.

---

## 6. Findings — Low

### F-L-01 — JSON-LD subcomponents reflect merchant/product strings into `dangerouslySetInnerHTML`

**File:** `components/seo/StructuredData.tsx:99-120, 146-169, 171-202, 204-240`.

`MerchantStructuredData`, `ProductStructuredData`, `FAQSchema`, and `PageBreadcrumbSchema` accept user-supplied strings (name, description, URL, items, etc.) and serialize them via `safeJsonLd` → `dangerouslySetInnerHTML` into `<script type="application/ld+json">` tags.

`safeJsonLd` correctly escapes `<` → `\u003c`, preventing the one real injection vector (`</script>` closing the script tag and breaking out). The content inside `application/ld+json` tags is not executed as JavaScript — it's structured data for search engines.

So: **not XSS.** But:

- Merchants who control the `name`/`description`/`url` strings in these components (via the merchant onboarding flow) can inject misleading JSON-LD. Google and other search engines parse this to decide how to display search result snippets. A merchant could inject fake ratings, fake offer prices, or falsely claim organization membership in schema.org types.
- This is an integrity concern for VFIDE's SEO surface: bad merchants can poison the knowledge graph with misleading claims that affect user perception before they reach the site.

**Remediation:**

1. **Allowlist the props.** Merchant descriptions are free text but shouldn't contain HTML-like content or structured-data keywords (`@context`, `@type`, `aggregateRating`, etc.). Strip or reject strings containing such tokens.
2. Only populate the JSON-LD schema with fields VFIDE controls (organization name, canonical URL). Merchant-supplied content goes in page text, not JSON-LD.
3. Consider dropping merchant-supplied JSON-LD entirely until there's a merchant verification process that establishes trust for the SEO surface.

### F-L-02 — `lib/crypto.ts` stores wallet state in localStorage with inconsistent key naming; disconnect flow may leave stale state

**File:** `lib/crypto.ts:186-189`.

```typescript
export function disconnectWallet(): void {
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('wallet_connected');
}
```

This function removes two localStorage keys (`wallet_address` and `wallet_connected`) that must be set somewhere else in the codebase. The setter location isn't obvious from this file. Possible issues:

- If the keys are set elsewhere under different names (e.g., `vfide_wallet_address` vs `wallet_address`), disconnect misses them.
- If wagmi manages its own wallet-connection state (it does, via `cookieStorage` or its default persister), these manually-managed keys duplicate/conflict with wagmi's state.
- The key `wallet_connected` as a boolean-ish string has historically been a source of "ghost connection" bugs: user disconnects, wagmi says disconnected, but the old localStorage flag makes some other code path think the wallet is still connected.

**Remediation:**

1. Delete this function. Rely on wagmi's `useDisconnect` for wallet disconnection — it handles persister cleanup correctly.
2. If additional app-specific state needs clearing on disconnect (preferences, session keys, etc.), route them through a single `disconnect()` action that invokes both wagmi's disconnect and any app-specific cleanup, in one place. Use consistent `vfide_*` prefixing for all keys.
3. Grep the codebase for all `localStorage.setItem(...)` calls and ensure disconnect-time cleanup is complete. The 104 localStorage call sites identified in Session 1 recon are likely to reveal several wallet-related keys not covered here.

---

## 7. Positive Observations

- **Paper wallet uses `ethers.Wallet.createRandom()`** which internally uses Node's `randomBytes(32)` / browser `crypto.getRandomValues()`. Real CSPRNG → real keypair → real private key. This is the right primitive (the issue is what happens to the key after generation, not the generation itself).
- **Paper wallet has a prominent red security warning** explaining non-custodial unrecoverability and encouraging offline usage. The wording is honest even where the implementation doesn't fully support the advice.
- **Private key and mnemonic are hidden by default** (Eye/EyeOff toggles). Reduces shoulder-surfing risk. Combined with the red-border on the key's container, the UI signals sensitivity clearly.
- **`safeJsonLd` correctly escapes `<` to `\u003c`** — blocks `</script>` breakout. Subtle but important for JSON-LD safety.
- **Root provider tree is clean and tiered.** `CoreProviders` → `ThemeProvider > LocaleProvider > AdaptiveProvider > OnboardingProvider > ToastProvider > Web3Providers` at root; feature-specific providers scoped to route-group layouts; `(marketing)` has no client JS at all. Good separation of concerns; reduces bundle size for users on marketing pages.
- **Per-route-group provider splitting** (`SocialProviders`, `GamificationProviders`, `CommerceProviders`) correctly scopes Presence/Cart/AchievementToast to the routes that need them — performance and security win.
- **The `lib/wallet/EmbeddedWalletAdapter.tsx` commented-out Privy integration** is a correct scaffold for when the SDK is wired. The current fail-closed `EmbeddedWalletProvider` fallback throws "Embedded wallet not configured" — correct fail-closed behavior. This is the implementation to keep (if any embedded-wallet feature is retained); delete `lib/embeddedWallet/` and use this instead.
- **`components/onboarding/OnboardingManager` exposes `window.enableVFIDEWizard()` / `window.disableVFIDEWizard()` / `window.startVFIDETour()`** — useful debug surface without exposing sensitive APIs. The enable/disable toggle allows users who hit onboarding issues (F-H-01) to bypass the broken wizard.
- **Checkout page uses React's default string interpolation for all invoice fields** (line items, memo, totals). Standard React JSX auto-escaping protects against XSS in the user-visible fields — so even though the data is merchant-controlled, it can't inject script. The (real) issue is merchant-identity display (F-C-03), not injection.
- **Checkout page consistently uses `invoice.total` for both display and payment.** Lines 168 (`payMerchant(..., String(invoice.total), ...)`), 287 (display), 304 (display), 356 (button label). No split between "shown amount" and "actual charge" — so users can't be charged a different amount than what they saw, even if other bugs exist.
- **External explorer links use `rel="noopener noreferrer"`** (line 333). Tabnabbing mitigated. Same attention needed elsewhere (see "What Is Still Uncovered" for the broader `target="_blank"` audit).
- **`lib/crypto.ts` validates balance format** (line 112-113: `if (isNaN(balanceWei) || !isFinite(balanceWei)) throw`) and price format (line 160: `if (typeof data.ethPrice !== 'number' || !Number.isFinite(data.ethPrice) || data.ethPrice <= 0) return 0`). Defensive against malformed API responses. The precision issue (F-H-06) is orthogonal — the validation structure itself is good.
- **`lib/crypto.ts` uses helpers `assertNonZeroAddress` and `assertCorrectChain` before every transaction** (line 252-253, and likely replicated in `sendTokenTransaction`). Prevents the common bugs of sending to the zero address or signing on the wrong chain. Good defensive layering.

---

## 8. What Is Still Uncovered

Session 1 covered ~12 files. Substantial remaining scope:

**High-priority for Session 2+:**
- `lib/crypto.ts` (577 LOC) — payment integration, approval flows
- `lib/stealthAddresses.ts` (653 LOC) — stealth address protocol
- `app/checkout/[id]/page.tsx` (409 LOC) — transaction signing UI
- `components/wallet/UnifiedWalletModal.tsx` — depends on the broken `useEmbeddedWallet` hook (F-H-01), may also crash
- `components/wallet/EmbeddedLogin.tsx` — full review (the error-trigger component from F-H-01)
- `app/admin/`, `app/control-panel/`, `app/council/` — privileged operation pages

**Pattern analysis (breadth, not depth):**
- 104 localStorage/sessionStorage call sites — what's stored where, which are sensitive
- 20 IndexedDB call sites
- 17 privateKey/mnemonic/seedPhrase references across the codebase
- All `target="_blank"` without `rel="noopener noreferrer"` — tabnabbing surface

**Other high-risk routes to sample:**
- `app/cross-chain/` — bridge transactions
- `app/crypto/` — direct crypto operations
- `app/disputes/`, `app/appeals/` — user-facing workflow that touches on-chain evidence
- `app/buy/`, `app/checkout/` (checkout top-level) — commerce flows
- `app/developer/` — API key display? webhook configuration UI?

**Hooks layer:**
- `hooks/useSmartWallet.ts`, `hooks/useWalletPersistence.ts`, `hooks/useSignatureRequests.ts` (if exists)

**Providers layer:**
- `providers/SecurityProvider.tsx` — security context provider (referenced by Web3Providers)

---

## 9. How to Use This Report

Same guidance as Phase 1 and Phase 2: this is a pre-audit deliverable, not a substitute for professional audit. Commission a professional firm before mainnet.

**Immediate action items (before professional audit):**

1. **Delete `lib/embeddedWallet/` entirely.** Remove the re-exports from `components/wallet/index.ts`. Remove the `<EmbeddedLogin>` mount from `BeginnerWizard`. This resolves F-H-01 and F-H-02 simultaneously and eliminates the fake-address trap. (15 minutes of work.)
2. **Remove the "Print" button from paper wallet** or gate it behind a prominent confirmation. Remove the "Copy private key" button or add auto-clear with a warning. (30 minutes.)
3. **Remove the `VerifyTab` from paper wallet** or move the verification logic to an offline-bundle distribution. (1 hour.)
4. **Add a banner on the paper wallet page** clarifying that the web-served version is for demonstration only; real use requires an offline-downloaded build. (30 minutes.)

Those four changes eliminate all of Session 1's Criticals and three of four Highs — immediate user-protection win before any audit engagement.

---

*End of Phase 3 report, Session 1. In progress — continues.*
