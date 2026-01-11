# Enhanced UI Components Documentation

A comprehensive library of premium UI components with beautiful animations and effects.

## 🎨 Component Overview

### Buttons

#### EnhancedButton
Premium button component with multiple variants and animations.

```tsx
import { EnhancedButton } from "@/components/ui/enhanced-index";
import { Rocket } from "lucide-react";

<EnhancedButton 
  variant="primary" // primary, secondary, accent, glass, glow, gradient
  size="md" // sm, md, lg, xl
  icon={<Rocket />}
  iconPosition="left"
  loading={false}
  fullWidth={false}
>
  Launch Token
</EnhancedButton>
```

**Variants:**
- `primary` - Cyan gradient with glow effect
- `secondary` - Dark with border, subtle hover
- `accent` - Rainbow gradient
- `glass` - Glassmorphism effect
- `glow` - Glowing border effect
- `gradient` - Animated gradient background

---

### Cards

#### EnhancedCard
Beautiful card component with glassmorphism and glow effects.

```tsx
import { EnhancedCard } from "@/components/ui/enhanced-index";

<EnhancedCard 
  variant="glass" // default, glass, gradient, glow, elevated
  hover={true}
  padding="md" // none, sm, md, lg, xl
  glow={true}
  shine={true}
>
  <h3>Card Content</h3>
</EnhancedCard>
```

---

### Inputs

#### EnhancedInput
Premium form input with multiple variants and icon support.

```tsx
import { EnhancedInput } from "@/components/ui/enhanced-index";
import { Mail } from "lucide-react";

<EnhancedInput
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  icon={<Mail className="w-5 h-5" />}
  iconPosition="left"
  variant="glow" // default, glass, glow
  error="Invalid email format"
/>
```

#### EnhancedTextarea
Multi-line text input with premium styling.

```tsx
<EnhancedTextarea
  label="Description"
  placeholder="Enter description..."
  rows={4}
  variant="glass"
/>
```

#### EnhancedSelect
Dropdown select with premium styling.

```tsx
<EnhancedSelect
  label="Select Network"
  options={[
    { value: "mainnet", label: "Mainnet" },
    { value: "testnet", label: "Testnet" }
  ]}
  variant="glow"
/>
```

---

### Stats & Metrics

#### EnhancedStatCard
Beautiful statistics card with trend indicators.

```tsx
import { EnhancedStatCard } from "@/components/ui/enhanced-index";
import { Users } from "lucide-react";

<EnhancedStatCard
  label="Total Users"
  value="12,345"
  change={15.3} // Positive or negative percentage
  changeLabel="vs last month"
  icon={<Users className="w-6 h-6" />}
  variant="glow" // default, gradient, glow
  color="cyan" // cyan, green, purple, gold
/>
```

---

### Badges

#### EnhancedBadge
Premium badge component with multiple styles.

```tsx
import { EnhancedBadge, SuccessBadge, ErrorBadge } from "@/components/ui/enhanced-index";
import { Star } from "lucide-react";

<EnhancedBadge 
  variant="glow" // default, gradient, glow, outline, solid
  color="cyan" // cyan, green, red, purple, gold, gray
  size="md" // sm, md, lg
  icon={<Star className="w-4 h-4" />}
  pulse={true}
  removable={true}
  onRemove={() => {}}
>
  Premium
</EnhancedBadge>

// Pre-styled variants
<SuccessBadge>Success</SuccessBadge>
<ErrorBadge>Error</ErrorBadge>
<InfoBadge>Info</InfoBadge>
<WarningBadge>Warning</WarningBadge>
```

---

### Modals

#### EnhancedModal
Premium modal dialog with animations.

```tsx
import { EnhancedModal } from "@/components/ui/enhanced-index";

const [isOpen, setIsOpen] = useState(false);

<EnhancedModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  size="md" // sm, md, lg, xl, full
  variant="glass" // default, glass, gradient
  showCloseButton={true}
  closeOnOverlayClick={true}
  closeOnEscape={true}
>
  <div>Modal content here</div>
</EnhancedModal>
```

---

### Progress

#### EnhancedProgressBar
Linear progress bar with animations.

```tsx
import { EnhancedProgressBar } from "@/components/ui/enhanced-index";

<EnhancedProgressBar
  value={65}
  max={100}
  label="Loading..."
  showValue={true}
  variant="gradient" // default, gradient, glow, striped
  color="cyan" // cyan, green, purple, gold
  size="md" // sm, md, lg
  animated={true}
/>
```

#### CircularProgress
Circular progress indicator.

```tsx
import { CircularProgress } from "@/components/ui/enhanced-index";

<CircularProgress
  value={75}
  max={100}
  size={120}
  strokeWidth={8}
  color="green"
  showValue={true}
  label="Complete"
/>
```

#### StepProgress
Multi-step progress indicator.

```tsx
import { StepProgress } from "@/components/ui/enhanced-index";

<StepProgress
  currentStep={2}
  totalSteps={4}
  labels={["Setup", "Configure", "Deploy", "Complete"]}
  color="cyan"
/>
```

---

### Toasts

#### useToast Hook
React hook for displaying toast notifications.

```tsx
import { useToast, ToastContainer } from "@/components/ui/enhanced-index";

function MyComponent() {
  const { toasts, closeToast, success, error, info, warning } = useToast();

  const handleSuccess = () => {
    success("Success!", "Operation completed successfully");
  };

  return (
    <>
      <button onClick={handleSuccess}>Show Toast</button>
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
}
```

---

### Backgrounds & Effects

#### AnimatedBackground
Ambient background with floating particles and gradients.

```tsx
import { AnimatedBackground } from "@/components/ui/enhanced-index";

<div className="relative">
  <AnimatedBackground />
  <div>Your content here</div>
</div>
```

#### HeroGradient
Hero section gradient overlay.

```tsx
import { HeroGradient } from "@/components/ui/enhanced-index";

<section className="relative">
  <HeroGradient />
  <h1>Hero Content</h1>
</section>
```

---

### Page Transitions

Smooth page transitions with animations.

```tsx
import { PageTransition, FadeTransition, SlideTransition, ScaleTransition } from "@/components/ui/enhanced-index";

// In your layout or page
<PageTransition>
  <YourPageContent />
</PageTransition>
```

**Available Transitions:**
- `PageTransition` - Fade + slide up
- `FadeTransition` - Simple fade
- `SlideTransition` - Horizontal slide
- `ScaleTransition` - Scale + fade

---

## 🎨 CSS Utilities

All components come with CSS utility classes in `enhanced-animations.css`:

### Animation Classes
- `.animate-gradient-shift` - Animated gradient background
- `.animate-glow-pulse` - Pulsing glow effect
- `.animate-shimmer` - Shimmer effect
- `.animate-float` - Floating animation
- `.animate-bounce-subtle` - Subtle bounce
- `.animate-rotate-glow` - Rotating with glow

### Text Effects
- `.text-shimmer` - Shimmering text
- `.text-gradient-cyan` - Cyan gradient text
- `.text-gradient-rainbow` - Rainbow gradient text

### Glass Effects
- `.glass` - Glassmorphism effect
- `.glass-strong` - Stronger glass effect

### Glow Effects
- `.glow-cyan` - Cyan glow
- `.glow-cyan-strong` - Strong cyan glow
- `.glow-blue` - Blue glow
- `.glow-purple` - Purple glow

### Hover Effects
- `.hover-lift` - Lift on hover
- `.hover-glow-cyan` - Glow on hover
- `.hover-scale` - Scale on hover

### Shadows
- `.shadow-premium` - Premium shadow
- `.shadow-premium-lg` - Large premium shadow
- `.shadow-glow-premium` - Shadow with glow

---

## 🚀 Quick Start

1. Import the components you need:
```tsx
import { EnhancedButton, EnhancedCard, useToast } from "@/components/ui/enhanced-index";
```

2. Use in your components:
```tsx
export function MyComponent() {
  return (
    <EnhancedCard variant="glass" padding="lg">
      <h2>Premium UI</h2>
      <EnhancedButton variant="gradient" size="lg">
        Get Started
      </EnhancedButton>
    </EnhancedCard>
  );
}
```

3. Add toast notifications:
```tsx
export function MyApp() {
  const { toasts, closeToast, success } = useToast();
  
  return (
    <>
      <YourApp />
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </>
  );
}
```

---

## 💡 Best Practices

1. **Use consistent variants** - Stick to 2-3 variants throughout your app
2. **Combine effects sparingly** - Too many glows/animations can be overwhelming
3. **Match colors to context** - Use green for success, red for errors, etc.
4. **Test performance** - Animated backgrounds work best on desktop
5. **Accessibility** - All components support keyboard navigation and ARIA labels

---

## 🎯 Color Palette

- **Cyan** (`#00F0FF`) - Primary brand color
- **Blue** (`#0080FF`) - Secondary accent
- **Green** (`#10b981`) - Success states
- **Red** (`#ef4444`) - Error states
- **Purple** (`#a78bfa`) - Premium features
- **Gold** (`#eab308`) - Rewards/achievements

All colors are available in the component `color` prop where applicable.
