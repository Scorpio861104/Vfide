# Mobile-First Responsive Design Guide

## Overview
This guide documents VFIDE's mobile-first approach to responsive design, ensuring optimal user experience across all devices from small phones to large desktops.

## Core Principles

### 1. Mobile-First Development
- **Start with mobile:** Design for smallest screen first
- **Progressive enhancement:** Add features for larger screens
- **Breakpoints:** mobile → sm (640px) → md (768px) → lg (1024px) → xl (1280px) → 2xl (1536px)

### 2. Touch-Friendly Design
- **Minimum touch targets:** 44×44px (WCAG requirement)
- **Recommended:** 48×48px or larger
- **Spacing:** Minimum 8px gap between touch targets
- **Interaction feedback:** Active/hover states on all interactive elements

### 3. Responsive Typography
```
Mobile: 16px base (readable on small screens)
Tablet: 18px base (more breathing room)
Desktop: 20px base (larger displays)
Headings scale responsively
```

### 4. Layout Patterns
```
Mobile:    Single column stack
Tablet:    2 columns or asymmetric
Desktop:   3+ columns or complex grids
```

## Component Guidelines

### Mobile Input Fields
```tsx
// ✅ DO: Large, readable, easy to tap
<input className="min-h-[44px] text-base px-4 py-3" />

// ❌ DON'T: Small text, tight spacing
<input className="h-8 text-xs px-2" />
```

### Mobile Buttons
```tsx
// ✅ DO: Full width, clear states
<button className="w-full min-h-[48px] py-3 text-base font-semibold" />

// ❌ DON'T: Small, ambiguous state
<button className="px-2 py-1 text-xs" />
```

### Mobile Navigation
```tsx
// ✅ DO: Slide-in drawer for mobile
<MobileDrawer items={navItems} />

// ❌ DON'T: Horizontal scrolling nav
<nav className="overflow-x-auto" />
```

### Mobile Forms
```tsx
// ✅ DO: Full width, one field per line
<form className="space-y-4">
  <MobileInput label="Email" />
  <MobileInput label="Password" />
</form>

// ❌ DON'T: Side-by-side fields on mobile
<div className="flex gap-2">
  <input />
  <input />
</div>
```

## Responsive Utilities

### Spacing
```tsx
// Mobile-first padding approach
className="px-4 sm:px-6 lg:px-8"    // Horizontal padding
className="py-4 sm:py-6 lg:py-8"    // Vertical padding
className="gap-3 sm:gap-4 lg:gap-6" // Gap between elements
```

### Visibility
```tsx
// Show/hide based on breakpoint
className="block sm:hidden"    // Mobile only
className="hidden sm:block"    // Tablet and up
className="hidden lg:block"    // Desktop only
className="block lg:hidden"    // Mobile and tablet only
```

### Grid Layouts
```tsx
// 1 column on mobile, 2 on tablet, 3 on desktop
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// 1 column on mobile, 2 on desktop
className="grid grid-cols-1 lg:grid-cols-2"
```

### Flex Layouts
```tsx
// Stack on mobile, row on desktop
className="flex flex-col md:flex-row"

// Center on mobile, space-between on desktop
className="flex flex-col sm:flex-row sm:justify-between sm:items-center"
```

## Typography Scaling

### Headings
```css
/* Mobile → Desktop scaling */
h1 { font-size: 24px }          /* Mobile */
@media (min-width: 640px) { h1 { font-size: 32px } }   /* Tablet */
@media (min-width: 1024px) { h1 { font-size: 40px } }  /* Desktop */

/* Using Tailwind */
className="text-2xl sm:text-3xl lg:text-4xl"
```

### Body Text
```css
/* Ensure readability on all devices */
body { font-size: 16px; line-height: 1.6 }
@media (min-width: 1024px) { body { font-size: 18px; line-height: 1.8 } }
```

## Image Optimization

### Responsive Images
```tsx
import Image from 'next/image';

<Image
  src={image}
  alt="Description"
  responsive
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 1024px"
  // Formats: WebP, AVIF for optimal performance
/>
```

### Background Images
```css
/* Mobile: single column */
.hero { background-image: url('hero-mobile.webp') }

/* Desktop: wider image */
@media (min-width: 1024px) {
  .hero { background-image: url('hero-desktop.webp') }
}
```

## Navigation Patterns

### Mobile Navigation (Drawer/Hamburger)
```tsx
<MobileDrawer
  items={[
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Settings', href: '/settings' },
  ]}
/>
```

### Desktop Navigation (Horizontal)
```tsx
<nav className="hidden md:flex gap-8">
  {items.map(item => (
    <Link key={item.href} href={item.href}>
      {item.label}
    </Link>
  ))}
</nav>
```

## Testing Checklist

### Device Testing
- [ ] iPhone 12 mini (375px)
- [ ] iPhone 14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] iPad (768px)
- [ ] iPad Pro (1024px+)
- [ ] Android phones (360-412px)
- [ ] Desktop (1280px+)

### Interaction Testing
- [ ] Touch events work (no hover required)
- [ ] Buttons are easily tappable (44×44px min)
- [ ] Forms are mobile-friendly
- [ ] Navigation is accessible
- [ ] Modals don't overlap content
- [ ] Scrolling is smooth
- [ ] No horizontal scrolling (except intentional)

### Performance Testing
- [ ] Images load quickly
- [ ] Fonts don't cause layout shift (use `font-display: swap`)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Touch feedback is immediate
- [ ] No janky scrolling

### Accessibility Testing
- [ ] Touch targets are at least 44×44px
- [ ] Color contrast is sufficient
- [ ] Touch targets have adequate spacing
- [ ] Form labels are associated
- [ ] Focus is visible
- [ ] Keyboard navigation works

## Common Responsive Patterns

### Hero Section
```tsx
<section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
  <div className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
      {title}
    </h1>
    <p className="text-lg sm:text-xl text-secondary">
      {subtitle}
    </p>
  </div>
</section>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {items.map(item => (
    <Card key={item.id}>{item.content}</Card>
  ))}
</div>
```

### Two-Column Layout
```tsx
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
  <div className="flex-1">{/* Main content */}</div>
  <aside className="w-full lg:w-80">{/* Sidebar */}</aside>
</div>
```

### Feature List
```tsx
<ul className="space-y-4 sm:space-y-6">
  {features.map(feature => (
    <li
      key={feature.id}
      className="flex flex-col sm:flex-row gap-4 items-start"
    >
      <Icon className="w-6 h-6 flex-shrink-0 text-primary" />
      <div>
        <h3 className="font-semibold text-base sm:text-lg">
          {feature.title}
        </h3>
        <p className="text-sm sm:text-base text-secondary mt-1">
          {feature.description}
        </p>
      </div>
    </li>
  ))}
</ul>
```

## Performance Considerations

### Mobile Performance
- Target LCP <2.5s on 4G
- Limit JavaScript for mobile browsers
- Lazy load images and components
- Use WebP/AVIF formats
- Minimize CSS (use utility-first approach)
- Avoid large animations on mobile

### Breakpoint Strategy
```css
/* Mobile first: base styles for mobile */
.card { padding: 16px; }

/* Enhanced for larger screens */
@media (min-width: 768px) {
  .card { padding: 24px; }
}

@media (min-width: 1024px) {
  .card { padding: 32px; }
}
```

## Useful Resources

- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile Usability Guidelines](https://developers.google.com/web/fundamentals/design-and-ux/mobile)
- [Touch Target Sizing](https://www.smashingmagazine.com/2020/12/css-data-queries-component-toggles/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Web Vitals](https://web.dev/vitals/)

## Troubleshooting

### Issue: Horizontal scrolling on mobile
**Solution:** Remove fixed widths, use `max-w-full`

### Issue: Text too small on mobile
**Solution:** Increase base font size, scale headings responsively

### Issue: Buttons hard to tap
**Solution:** Ensure minimum 44×44px with adequate spacing

### Issue: Images stretched on mobile
**Solution:** Use `object-fit: cover` and responsive sizing

### Issue: Navigation cluttered on mobile
**Solution:** Use hamburger menu or bottom navigation

---

## Implementation Checklist

- [ ] Mobile drawer navigation implemented
- [ ] Touch-friendly form inputs created
- [ ] Responsive spacing system applied
- [ ] Typography scales responsively
- [ ] Images optimized for all screen sizes
- [ ] All breakpoints tested
- [ ] Performance optimized for mobile
- [ ] Accessibility standards met
- [ ] No horizontal scrolling
- [ ] Touch targets 44×44px minimum
