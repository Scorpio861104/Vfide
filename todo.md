# Frontend Audit - Comprehensive Fix Plan

## Critical Issues (High Priority)

### 1. Mobile Top Padding - CRITICAL
- [ ] Fix: All pages use `pt-[4.5rem]` (72px) but AppShell already adds `pt-7` (28px)
  - Mobile: 28px ticker + 72px page = 100px top gap (should be only 28px → WAY too much blank space)
  - Desktop: 28px appshell + 72px page = 100px (TopNav=56px + Ticker=28px = 84px → 16px extra ok-ish)
  - FIX: Change `pt-[4.5rem]` to `md:pt-[3.5rem]` (only add padding on desktop for TopNav)
  - Affects 104+ pages

### 2. Bottom padding missing on many pages
- [ ] AppShell has `pb-20 md:pb-0` which gives 80px mobile clearance for BottomTabBar
  - BUT pages that also have `pb-16` are adding extra 64px on mobile → total 144px of bottom padding  
  - FIX: Remove pb-16/pb-20 from individual pages (AppShell handles it)

### 3. Performance on low-end devices
- [ ] Ambient orbs: 600px×600px blurred radial gradients on EVERY page = massive GPU load on low-end phones
  - FIX: Add `@media (prefers-reduced-transparency: reduce)` and `@media (max-width: 480px)` to scale down/disable

### 4. Backdrop-filter performance
- [ ] `glass-card-premium` uses backdrop-filter: blur(32px) - devastating on 2G-phone-tier CPUs/GPUs
  - FIX: Add low-end fallback in premium-components.css

## Layout Issues

### 5. Missing `scrollbar-none` on tab bars  
- [ ] `control-panel/page.tsx` tab bar uses `overflow-x-auto py-4` without `scrollbar-hide`

### 6. ConnectButton on mobile
- [ ] TopNav's ConnectButton may overflow on small screens
- [ ] Check and add overflow handling

### 7. MoreSheet bottom on safe-area devices
- [ ] BottomTabBar has `safe-area-bottom` but MoreSheet is fixed at `bottom-16` - may not account for safe area on notched phones

### 8. AppShell pb-20 vs safe area
- [ ] The `pb-20` in AppShell doesn't account for `safe-area-inset-bottom` on notched devices
  - FIX: Use `calc(5rem + env(safe-area-inset-bottom, 0px))`

## CSS/Style Issues

### 9. grid-pattern missing definition
- [ ] Verify `grid-pattern` class is properly defined

### 10. prefers-reduced-motion for ambient orbs
- [ ] The ambient orb divs have `radial-gradient` backgrounds (static) - not animated, so OK
  - BUT their parent uses `pointer-events-none absolute inset-0 overflow-hidden` 
  - These are fine - no animation

### 11. Font loading fallbacks
- [ ] `@fontsource/inter` and `@fontsource/space-grotesk` are loaded in globals.css
  - Need font-display: swap to avoid FOIT

## Accessibility Issues

### 12. Focus indicators
- [ ] Check focus-visible states on interactive elements

### 13. Color contrast
- [ ] text-zinc-500 on bg-zinc-950 needs contrast check

## Viewport Issues

### 14. Large ambient orbs cause horizontal overflow on small screens
- [ ] `w-[600px] h-[600px]` divs with negative margins like `-left-20` 
  - These are inside `overflow-hidden` containers → should be fine IF container is `position: relative`
  - But some containers may not have `relative` → orbs escape and cause overflow

### 15. Fixed-width elements in tables/grids
- [ ] Check for any fixed widths that break on mobile

## Completed
