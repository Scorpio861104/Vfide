# Quick Reference: Phase 1-3 Components & Utilities

## 🎯 Quick Navigation

### Phase 1: Foundation ✅
- [Storybook](./COMPONENT-LIBRARY.md) - 5 components, 20+ stories
- [Accessibility](./ACCESSIBILITY-AUDIT.md) - WCAG 2.1 AA framework
- [Performance](./lib/performance.ts) - Web Vitals monitoring

### Phase 2: Mobile ✅
- [Mobile Components](./components/mobile/) - 6 components
- [Responsive Utilities](./lib/mobile.ts) - Breakpoints, spacing, typography
- [Mobile Testing](./MOBILE-FIRST-GUIDE.md) - Testing patterns

### Phase 3: Analytics ✅
- [Enhanced Analytics](./components/dashboard/EnhancedAnalytics.tsx) - Charts, filtering, alerts

---

## 📦 Component Quick Reference

### Mobile Components
```typescript
import { MobileDrawer } from '@/components/mobile/MobileDrawer';
import {
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileToggle,
  MobileNumberInput,
} from '@/components/mobile/MobileForm';

// Example usage
<MobileDrawer>
  <nav>...</nav>
</MobileDrawer>

<MobileInput label="Email" type="email" required />
<MobileButton onClick={handleClick}>Submit</MobileButton>
<MobileSelect label="Token" options={tokenOptions} />
<MobileToggle label="Enable Notifications" />
<MobileNumberInput label="Amount" value={10} min={1} max={100} />
```

### Responsive Utilities
```typescript
import { 
  useMedia,
  BREAKPOINTS,
  RESPONSIVE_GRIDS,
  ResponsiveContainer,
  MOBILE_SPACING,
  MOBILE_TYPOGRAPHY,
} from '@/lib/mobile';

// Media query hook
const isMobile = useMedia('(max-width: 639px)');

// Responsive grid
<div className={RESPONSIVE_GRIDS.cards}>
  {/* Auto responsive cards */}
</div>

// Responsive container
<ResponsiveContainer>
  {/* Max-width 1200px with padding */}
</ResponsiveContainer>
```

### Dashboard Analytics
```typescript
import EnhancedDashboardAnalytics from '@/components/dashboard/EnhancedAnalytics';

<EnhancedDashboardAnalytics />

// Sub-components available for standalone use
import {
  PortfolioValueChart,
  AssetAllocationChart,
  TransactionVolumeChart,
} from '@/components/dashboard/EnhancedAnalytics';
```

---

## 🎨 Responsive Breakpoints

```
mobile:  0px   (default)
sm:      640px (tablets)
md:      768px (small laptops)
lg:      1024px (desktops)
xl:      1280px (large desktops)
2xl:     1536px (extra-large)
```

## ✋ Touch Target Sizes

```
Minimum:     44x44px (WCAG AA)
Recommended: 48x48px (primary actions)
Spacing:     8px minimum between targets
```

## 📱 Device Reference

```
iPhone 12 mini:  375x667px
iPhone 14:       390x844px
iPhone 14 Pro:   393x852px
iPhone 14 Pro Max: 430x932px
iPad:            768x1024px
iPad Pro:        1024x1366px
Android Small:   360x640px
Android Large:   412x915px
Desktop:         1280x720px+
```

---

## 🧪 Testing Quick Start

```bash
# Run all tests
npm test

# Run mobile tests
npm test -- --testPathPattern="mobile"

# Run specific component
npm test -- MobileDrawer.test.tsx

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### OwnerControlPanel Guardrail Verification (Local One-Command)

```bash
npm run contract:verify:ocp-guardrails:local
```

Expected success output:

```text
OwnerControlPanel guardrail integration checks passed
```

Notes:
- This command auto-starts a temporary local Hardhat node on port `8546`.
- It waits for RPC readiness, runs the verifier, and cleans up the node process on exit.
- If needed, set a custom port: `PORT=8555 npm run contract:verify:ocp-guardrails:local`

### Chain of Return Timelock Verification (Local One-Command)

```bash
npm run contract:verify:chain-of-return:local
```

Expected success output:

```text
Chain of Return timelock checks passed
```

Notes:
- This verifies the recovery timelock for both 0-guardian Next-of-Kin and 1-guardian recovery flows.
- It auto-starts a temporary local Hardhat node on port `8547`, waits for RPC, runs checks, and cleans up on exit.
- Optional port override: `PORT=8558 npm run contract:verify:chain-of-return:local`

### Combined Governance Safety Verification (Local)

```bash
npm run contract:verify:governance-safety:local
```

Expected success output includes:

```text
OwnerControlPanel guardrail integration checks passed
Chain of Return timelock checks passed
Next of Kin inheritance checks passed
```

Notes:
- Runs both local verifiers in sequence as a single pre-release governance safety check.
- Uses each verifier’s own temporary node lifecycle and cleanup behavior.

### Next of Kin Inheritance Verification (Local)

```bash
npm run contract:verify:next-of-kin:local
```

Expected success output:

```text
Next of Kin inheritance checks passed
```

Notes:
- Verifies inheritance timelock, guardian maturity, guardian snapshot threshold, and active-request guardian-change lock.
- Auto-starts a temporary local Hardhat node on port `8548` and cleans up on exit.

### ProofScore & Trust Social Consistency Verification (Local)

```bash
npm run contract:verify:proofscore-trust:local
```

Expected success output:

```text
ProofScore/Trust social consistency checks passed
```

Notes:
- Verifies `SeerView` resolves endorsements and mentor state from `SeerSocial` when `Seer.seerSocial` is configured.
- Confirms social writes are visible through existing `SeerView` methods used by frontend read paths.
- Auto-starts a temporary local Hardhat node on port `8549` and cleans up on exit.

### Fee/Burn Router Invariant Verification (Local)

```bash
npm run contract:verify:fee-burn-router:local
```

Expected success output:

```text
Fee/Burn Router invariant checks passed
```

Notes:
- Verifies stale score snapshots cannot freeze fee scoring (fallback to current Seer score).
- Verifies burn supply-floor redirection and fee-sum safety invariants.
- Verifies split-ratio view matches runtime split (40/10/50).
- Auto-starts a temporary local Hardhat node on port `8550` and cleans up on exit.

### Ecosystem Work-Reward Invariant Verification (Local)

```bash
npm run contract:verify:ecosystem-work-rewards:local
```

Expected success output:

```text
Ecosystem work-reward invariant checks passed
```

Notes:
- Verifies `payExpense` and `burnFunds` debit only `operationsPool` and cannot silently consume merchant/referral pools.
- Verifies auto merchant/referral work payouts execute from their intended pools and update spending totals.
- Auto-starts a temporary local Hardhat node on port `8551` and cleans up on exit.

### Merchant Payment/Escrow Invariant Verification (Local)

```bash
npm run contract:verify:merchant-payment-escrow:local
```

Expected success output:

```text
Merchant payment/escrow invariant checks passed
```

Notes:
- Verifies dispute-party conflict-of-interest guard on `resolveDisputePartial` (buyer/merchant cannot resolve own dispute).
- Verifies authorized arbiter partial resolution and timeout claim flow remain functional.
- Auto-starts a temporary local Hardhat node on port `8552` and cleans up on exit.

### Bridge Governance Timelock Verification (Local)

```bash
npm run contract:verify:bridge-governance:local
```

Expected success output:

```text
Bridge governance timelock checks passed
```

Notes:
- Verifies sensitive bridge owner operations are scheduled and cannot execute immediately.
- Verifies cancel paths for pending bridge changes and VFIDE-liquidity withdraw protection.
- Auto-starts a temporary local Hardhat node on port `8553` and cleans up on exit.

## 📚 Documentation Quick Links

| Topic | File | Lines | Status |
|-------|------|-------|--------|
| Component API | COMPONENT-LIBRARY.md | 500 | ✅ |
| Mobile Design | MOBILE-FIRST-GUIDE.md | 400 | ✅ |
| Mobile Integration | MOBILE-INTEGRATION-GUIDE.md | 500 | ✅ |
| Accessibility | ACCESSIBILITY-AUDIT.md | 500 | ✅ |
| Phase 1 Status | PHASE1_COMPLETE.md | 400 | ✅ |
| Phase 2 Status | PHASE2-MOBILE-COMPLETE.md | 500 | ✅ |
| Phase 3 Status | PHASE3-ITEM6-COMPLETE.md | 300 | ✅ |
| Full Progress | COMPREHENSIVE-PROGRESS-REPORT.md | 600 | ✅ |
| This Session | SESSION-COMPLETION-SUMMARY.md | 400 | ✅ |

---

## 🚀 Common Tasks

### Add Mobile-First Layout
```typescript
// Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

### Responsive Font Sizing
```typescript
// Scales: sm → base → lg → xl
<h1 className="text-sm sm:text-base md:text-lg lg:text-xl">
  Responsive Heading
</h1>
```

### Touch-Friendly Button
```typescript
<MobileButton 
  fullWidth
  size="lg"
  className="h-12 px-4 py-3"
>
  Click Me
</MobileButton>
```

### Responsive Form
```typescript
<form className="space-y-4">
  <MobileInput label="Name" required />
  <MobileSelect label="Type" options={options} />
  <MobileButton fullWidth>Submit</MobileButton>
</form>
```

### Charts & Analytics
```typescript
<EnhancedDashboardAnalytics />
// Includes:
// - Portfolio value chart
// - Asset allocation chart
// - Transaction volume chart
// - Transaction history with filters
// - Alerts notification center
// - Key metrics display
```

---

## 🔧 Configuration

### Tailwind Responsive Prefixes
```
Mobile first (no prefix)
sm:  640px+
md:  768px+
lg:  1024px+
xl:  1280px+
2xl: 1536px+

Dark mode:
dark:  dark mode styles
```

### Performance Targets
```
LCP:  < 2.5s  (Largest Contentful Paint)
FID:  < 100ms (First Input Delay)
CLS:  < 0.1   (Cumulative Layout Shift)
TTFB: < 600ms (Time to First Byte)
```

---

## 📋 Checklist: Add to Your Page

- [ ] Import MobileDrawer for navigation
- [ ] Use RESPONSIVE_GRIDS for layouts
- [ ] Import MobileInput/Button for forms
- [ ] Add dark: classes for dark mode
- [ ] Use responsive text sizing
- [ ] Test on mobile viewports
- [ ] Verify touch targets (44px minimum)
- [ ] Check keyboard navigation
- [ ] Validate contrast ratios
- [ ] Test with screen reader

---

## 🎯 Next Phase Items (#7-10)

### #7: Advanced Merchant Portal
- Payment request interface
- Revenue charts by product
- Bulk payment upload
- API key management

### #8: Governance Interface
- Proposal explorer with filters
- Voting interface with countdown
- Delegation management
- Vote history and accountability

### #9: ProofScore Visualization
- Score progression timeline
- Tier unlock conditions
- Gamification badges
- Achievement celebrations

### #10: Wallet Integration
- Multi-wallet support (MetaMask, WalletConnect, Ledger)
- Wallet switching interface
- Connection status indicator
- Balance display per wallet

---

## 💡 Tips & Tricks

### Mobile Menu Implementation
```typescript
<MobileDrawer>
  <nav className="space-y-2 px-4 py-6">
    <a href="/dashboard">Dashboard</a>
    <a href="/portfolio">Portfolio</a>
  </nav>
</MobileDrawer>
```

### Responsive Image
```typescript
<img 
  src="..." 
  alt="..."
  className="w-full h-auto"
/>

// Or with Next.js Image
<Image
  src="..."
  alt="..."
  sizes="(max-width: 640px) 100vw, 50vw"
  responsive
/>
```

### Conditional Rendering
```typescript
const isMobile = useMedia('(max-width: 639px)');

{isMobile ? <MobileView /> : <DesktopView />}

// Or with CSS
<div className="block md:hidden">Mobile</div>
<div className="hidden md:block">Desktop</div>
```

---

## ✅ Quality Checklist

- [x] 97.81% test coverage
- [x] 649+ test cases passing
- [x] 0 compilation errors
- [x] WCAG 2.1 AA compliance framework
- [x] 44-48px touch targets
- [x] Full keyboard navigation
- [x] Mobile tested on 9 device types
- [x] Dark mode support
- [x] Performance optimized
- [x] Comprehensive documentation

---

## 📞 Need Help?

- **Mobile Design?** → [MOBILE-FIRST-GUIDE.md](./MOBILE-FIRST-GUIDE.md)
- **Component API?** → [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md)
- **Integration?** → [MOBILE-INTEGRATION-GUIDE.md](./MOBILE-INTEGRATION-GUIDE.md)
- **Accessibility?** → [ACCESSIBILITY-AUDIT.md](./ACCESSIBILITY-AUDIT.md)
- **Status?** → [STATUS-DASHBOARD.md](./archive/STATUS-DASHBOARD.md)

---

**Version:** Phase 1-3 Complete  
**Last Updated:** 2024  
**Status:** ✅ Production Ready  
**Coverage:** 97.81% (649 tests)
