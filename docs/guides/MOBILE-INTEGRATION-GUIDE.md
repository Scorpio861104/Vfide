# Mobile-First Component Integration Guide

## Overview

This guide demonstrates how to integrate mobile-first components into your VFIDE frontend application. Mobile components are now available and ready for use across all pages.

## Available Mobile Components

### 1. MobileDrawer
A responsive hamburger menu component that provides navigation on small screens.

**Location:** `components/mobile/MobileDrawer.tsx`

**Features:**
- Hamburger menu button (automatically hidden on desktop)
- Slide-in drawer navigation panel
- Backdrop overlay with smooth animations
- Keyboard accessible (Escape to close)
- Touch-friendly (48px minimum button)
- Focus management

**Usage:**
```typescript
import { MobileDrawer } from '@/components/mobile/MobileDrawer';

export default function Layout() {
  return (
    <MobileDrawer>
      <nav className="space-y-2">
        <a href="/dashboard" className="block px-4 py-2">Dashboard</a>
        <a href="/portfolio" className="block px-4 py-2">Portfolio</a>
        <a href="/governance" className="block px-4 py-2">Governance</a>
      </nav>
    </MobileDrawer>
  );
}
```

### 2. MobileInput
Touch-optimized text input field with 44px minimum height.

**Location:** `components/mobile/MobileForm.tsx`

**Features:**
- Large touch target (44px minimum)
- Error state display
- Help text support
- Large, readable font
- Proper spacing
- Accessibility attributes

**Usage:**
```typescript
import { MobileInput } from '@/components/mobile/MobileForm';

<MobileInput
  label="Email Address"
  type="email"
  placeholder="name@example.com"
  error={errors.email}
  helpText="We'll never share your email"
  required
/>
```

### 3. MobileButton
Touch-optimized button with 48px minimum height.

**Location:** `components/mobile/MobileForm.tsx`

**Features:**
- 48px minimum height (WCAG AA)
- Multiple variants (primary, secondary, outline)
- Size options (sm, base, lg)
- Full-width support
- Loading states
- Disabled states

**Usage:**
```typescript
import { MobileButton } from '@/components/mobile/MobileForm';

<MobileButton 
  onClick={handleSubmit}
  isLoading={loading}
  variant="primary"
  size="lg"
  fullWidth
>
  Submit Form
</MobileButton>
```

### 4. MobileSelect
Touch-friendly dropdown selector.

**Location:** `components/mobile/MobileForm.tsx`

**Features:**
- Large touch target (44px)
- Option list support
- Error messages
- Value selection
- Help text

**Usage:**
```typescript
import { MobileSelect } from '@/components/mobile/MobileForm';

<MobileSelect
  label="Select Token"
  options={[
    { value: 'eth', label: 'Ethereum' },
    { value: 'btc', label: 'Bitcoin' },
  ]}
  value={selectedToken}
  onChange={(value) => setSelectedToken(value)}
  error={errors.token}
/>
```

### 5. MobileToggle
Touch-optimized toggle switch.

**Location:** `components/mobile/MobileForm.tsx`

**Features:**
- Clear on/off states
- Label display
- Help text
- Disabled states
- Change event handling

**Usage:**
```typescript
import { MobileToggle } from '@/components/mobile/MobileForm';

<MobileToggle
  label="Enable Notifications"
  checked={notificationsEnabled}
  onChange={(checked) => setNotificationsEnabled(checked)}
  helpText="Receive updates about your account"
/>
```

### 6. MobileNumberInput
Increment/decrement input with large touch buttons.

**Location:** `components/mobile/MobileForm.tsx`

**Features:**
- Large +/- buttons (44px minimum)
- Min/max value constraints
- Manual input support
- Error handling
- Loading states

**Usage:**
```typescript
import { MobileNumberInput } from '@/components/mobile/MobileForm';

<MobileNumberInput
  label="Amount"
  value={amount}
  onChange={setAmount}
  min={0}
  max={100}
  step={1}
  error={errors.amount}
/>
```

## Responsive Utilities

**Location:** `lib/mobile.ts`

### Media Query Hook
```typescript
import { useMedia } from '@/lib/mobile';

export function MyComponent() {
  const isMobile = useMedia('(max-width: 639px)');
  
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### Breakpoints
```typescript
import { BREAKPOINTS } from '@/lib/mobile';

// Values
BREAKPOINTS.mobile     // 0px
BREAKPOINTS.sm         // 640px
BREAKPOINTS.md         // 768px
BREAKPOINTS.lg         // 1024px
BREAKPOINTS.xl         // 1280px
BREAKPOINTS.twoXl      // 1536px
```

### Responsive Spacing Scale
```typescript
import { MOBILE_SPACING } from '@/lib/mobile';

MOBILE_SPACING.xs      // 4px
MOBILE_SPACING.sm      // 8px
MOBILE_SPACING.md      // 12px
MOBILE_SPACING.lg      // 16px
MOBILE_SPACING.xl      // 24px
MOBILE_SPACING.twoXl   // 32px
```

### Responsive Typography
```typescript
import { MOBILE_TYPOGRAPHY } from '@/lib/mobile';

// Mobile-first approach
className={`
  text-${MOBILE_TYPOGRAPHY.body.mobile}
  sm:text-${MOBILE_TYPOGRAPHY.body.sm}
  lg:text-${MOBILE_TYPOGRAPHY.body.lg}
`}
```

### Grid Layouts
```typescript
import { RESPONSIVE_GRIDS } from '@/lib/mobile';

<div className={RESPONSIVE_GRIDS.cards}>
  {/* Auto-responsive grid: 1 col mobile, 2 cols tablet, 3+ cols desktop */}
</div>
```

## Component Integration Patterns

### 1. Mobile Navigation
```typescript
import { MobileDrawer } from '@/components/mobile/MobileDrawer';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row">
      <MobileDrawer>
        <NavLinks />
      </MobileDrawer>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

### 2. Responsive Form
```typescript
import { 
  MobileInput, 
  MobileButton,
  MobileSelect 
} from '@/components/mobile/MobileForm';

export function TransferForm() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  return (
    <form className="space-y-4">
      <MobileInput
        label="Recipient Address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        error={errors.recipient}
      />
      
      <MobileInput
        label="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
      
      <MobileButton 
        fullWidth 
        onClick={handleSubmit}
      >
        Send Transfer
      </MobileButton>
    </form>
  );
}
```

### 3. Mobile-First Card Grid
```typescript
import { RESPONSIVE_GRIDS } from '@/lib/mobile';

export function DashboardCards() {
  return (
    <div className={RESPONSIVE_GRIDS.cards}>
      <Card>...</Card>
      <Card>...</Card>
      <Card>...</Card>
    </div>
  );
}
```

### 4. Responsive Hero Section
```typescript
import { ResponsiveContainer } from '@/lib/mobile';

export function HeroSection() {
  return (
    <ResponsiveContainer>
      <h1 className="text-3xl md:text-5xl font-bold">
        Welcome to VFIDE
      </h1>
      <p className="text-base md:text-lg mt-4">
        World-class DeFi platform
      </p>
    </ResponsiveContainer>
  );
}
```

## Testing Mobile Components

### Unit Tests
Mobile components have comprehensive test coverage:
- **MobileDrawer.test.tsx** - 13 test cases
- **MobileForm.test.tsx** - 45+ test cases
- **mobile-responsive.test.ts** - Viewport and touch testing

### Testing Utilities
```typescript
import {
  renderAtViewport,
  VIEWPORTS,
  TouchSimulator,
  hasSufficientTouchTarget,
} from '@/__tests__/mobile-responsive.test';

// Test at specific viewport
renderAtViewport(<MyComponent />, VIEWPORTS.iPhone14.width);

// Simulate touch interaction
await TouchSimulator.tap(button);
await TouchSimulator.swipe(drawer, 'left');
await TouchSimulator.pinch(image, 1.5);

// Validate touch targets
expect(hasSufficientTouchTarget(button, 44)).toBe(true);
```

### Running Tests
```bash
# Run all tests
npm test

# Run mobile tests only
npm test -- --testPathPattern="mobile"

# Run with coverage
npm test -- --coverage
```

## Accessibility Guidelines

All mobile components follow WCAG 2.1 AA standards:

### Touch Targets
- **Minimum size:** 44x44px (WCAG AA)
- **Recommended:** 48x48px for primary actions
- **Spacing:** 8px minimum between touch targets

### Labels & ARIA
- All inputs have associated labels
- ARIA attributes for dynamic content
- Semantic HTML throughout
- Focus management for modals/drawers

### Keyboard Navigation
- All components keyboard accessible
- Tab order follows visual flow
- Escape key to close overlays
- Arrow keys for selection

### Color & Contrast
- 4.5:1 contrast ratio for normal text
- 3:1 contrast ratio for large text
- Not relying on color alone

## Performance Optimizations

### Code Splitting
Mobile components are automatically code-split by Next.js for faster loading.

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  sizes="(max-width: 640px) 100vw,
         (max-width: 1024px) 50vw,
         100vw"
  responsive
/>
```

### Lazy Loading
```typescript
import dynamic from 'next/dynamic';

const MobileDrawer = dynamic(
  () => import('@/components/mobile/MobileDrawer'),
  { loading: () => <p>Loading...</p> }
);
```

## Common Patterns

### 1. Mobile-First Responsive Class
```typescript
// Mobile: 1 column
// Tablet (640px+): 2 columns  
// Desktop (1024px+): 3 columns
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

### 2. Hide on Mobile, Show on Desktop
```typescript
className="hidden md:block"
```

### 3. Show on Mobile, Hide on Desktop
```typescript
className="block md:hidden"
```

### 4. Responsive Font Sizing
```typescript
className="text-sm sm:text-base md:text-lg lg:text-xl"
```

### 5. Touch-Friendly Spacing
```typescript
className="p-4 sm:p-6 md:p-8 gap-4 sm:gap-6"
```

## Troubleshooting

### Issue: Horizontal Scrolling
**Solution:** Use responsive classes and avoid fixed widths
```typescript
// ❌ Bad
<div style={{ width: '1000px' }} />

// ✅ Good
<div className="w-full max-w-6xl mx-auto" />
```

### Issue: Small Font on Mobile
**Solution:** Use responsive font sizes
```typescript
// ✅ Good
className="text-sm md:text-base lg:text-lg"
```

### Issue: Buttons Too Small to Tap
**Solution:** Ensure 44px minimum height
```typescript
// ✅ Good
className="h-12 px-4 py-3" // = 48px height
```

### Issue: Images Not Scaling
**Solution:** Use responsive image syntax
```typescript
<img 
  src="..." 
  className="w-full h-auto"
  alt="..."
/>
```

## Next Steps

1. **Integration:** Add MobileDrawer to your layout component
2. **Forms:** Replace existing inputs with MobileInput/MobileSelect
3. **Navigation:** Update top-level navigation to use MobileDrawer
4. **Testing:** Run mobile tests to validate integration
5. **Optimization:** Monitor Core Web Vitals (LCP, FID, CLS)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Mobile Design Patterns](./MOBILE-FIRST-GUIDE.md)
- [Component Library](./COMPONENT-LIBRARY.md)
- [Accessibility Audit](./ACCESSIBILITY-AUDIT.md)

---

**Total Mobile Components:** 6  
**Test Coverage:** 60+ test cases  
**Accessibility Level:** WCAG 2.1 AA  
**Performance:** Optimized for LCP < 2.5s, CLS < 0.1
