# Glassmorphism Pattern — Status + Vocabulary

**Status:** Option B (incremental primitive-by-primitive glassification) — in progress
**Foundation:** Existing `<GlassCard>` component (`components/ui/GlassCard.tsx`)
**New utilities:** `.glass-surface`, `.glass-input`, `.glass-button`, `.glass-button-ghost` (in `app/globals.css`)

This document tracks the rolling glass-styling work. It complements `VFIDE_IDENTITY_SWAPIN.md` — same idea, different visual layer.

---

## What landed in this pass

Five high-leverage primitives glassified:

### `components/navigation/TopNav.tsx`
- Was: `bg-zinc-950/95 backdrop-blur-xl` (95% opacity = effectively opaque)
- Now: `bg-zinc-950/70 backdrop-blur-xl` + subtle cyan-tinted gradient overlay
- Reason: the navbar already had `backdrop-blur-xl` but the 95% opacity meant the blur was invisible. Dropping to 70% lets content blur visibly through the navbar.

### `components/navigation/BottomTabBar.tsx`
- Same treatment as TopNav, with the gradient direction inverted (from top instead of bottom) since the bar is anchored to the bottom

### `components/layout/Footer.tsx`
- Was: `bg-zinc-950 border-t border-zinc-800` (fully opaque)
- Now: `bg-zinc-950/80 backdrop-blur-xl border-t border-white/10`
- More opaque than the navbars (80 vs 70) because footers feel grounded; full transparency would feel ungrounded

### `components/ui/ConfirmModal.tsx`
- Scrim: `bg-black/70 backdrop-blur-sm` → `bg-black/60 backdrop-blur-md` (lighter scrim, stronger blur)
- Panel: `bg-zinc-900 border-zinc-800` (opaque) → `bg-zinc-900/80 backdrop-blur-2xl border-white/10 shadow-2xl shadow-black/50`
- Modal now reads as a layered glass surface floating over a blurred scrim, not a flat panel over a flat overlay

### `components/ui/dialog.tsx` (Radix primitive)
- Overlay: `bg-black/80` → `bg-black/60 backdrop-blur-md`
- Content: `bg-background border` (opaque) → `bg-zinc-900/80 backdrop-blur-2xl border-white/10 shadow-2xl shadow-black/50 sm:rounded-2xl`
- Every component that uses the shared Radix dialog primitive now inherits glass styling automatically

### `components/mobile/MobileDrawer.tsx`
- Backdrop: `bg-black/50` → `bg-black/50 backdrop-blur-md`
- Drawer panel: `bg-zinc-900 border-zinc-700` (opaque) → `bg-zinc-900/80 backdrop-blur-2xl border-white/10 shadow-2xl shadow-black/50`
- Mobile drawer now matches the dialog primitive's glass language

### `components/ui/VaultInfoTooltip.tsx`
- Panel + arrow: `bg-zinc-900 border-zinc-700` → `bg-zinc-900/85 backdrop-blur-xl border-white/10`
- Slightly more opaque than dialog (85 vs 80) because tooltips are small and need to read fast

### `app/globals.css` — body background
- Was: flat `bg-zinc-950` everywhere
- Now: three layered radial gradients (cyan top-left, purple bottom-right, subtle accent center) at low alpha, fixed-attachment so they don't scroll
- Reason: without ambient gradients, glass surfaces blur over flat color and look nearly identical to solid panels. The gradients give glass elements something to actually blur against. Suppressed via `prefers-reduced-transparency: reduce` for accessibility.

### `components/merchant/MerchantProfileWizard.tsx` — utility swap-in
- Step 1, 2, 3 primary buttons → `.glass-button`
- Step 2, 3 Back buttons → `.glass-button-ghost`
- Step 1 name input, category select, bio textarea → `.glass-input`
- Step 2 link label + url inputs → `.glass-input`
- The final Submit button kept its custom emerald gradient since it's a state-distinct action (success-themed, not primary cyan)
- This is the canonical example of how the utility classes get used; copy this pattern for further form work

### `components/ui/toast.tsx` + `components/ux/ToastNotifications.tsx`
- **Already glass.** Both files use `bg-{color}/10 backdrop-blur-xl` with translucent tinted backgrounds. No changes needed.

### `components/gamification/AchievementToast.tsx`
- **Intentionally left alone.** Uses heavy gradient effects for celebratory feel. Pure glass would clash with the rarity-glow aesthetic. This is a deliberate exception.

---

## New utility classes

Added to `app/globals.css` under `@layer utilities`. Use these in `className` strings to opt components into glass without writing the raw CSS each time.

| Utility | Use case |
|---|---|
| `.glass-surface` | Panel-style background. Same aesthetic as `<GlassCard>` but as a utility class so you can use it in places where wrapping a card isn't natural. |
| `.glass-surface-hover` | Companion to `.glass-surface`. Adds the standard hover-lift state. |
| `.glass-input` | Form fields — `<input>`, `<select>`, `<textarea>`. Includes focus + disabled states. |
| `.glass-button` | Primary action buttons. Includes the gradient + shadow + hover-scale pattern. |
| `.glass-button-ghost` | Secondary buttons (Cancel, Back, etc.). Translucent with subtle border. |

Each has accessibility-respecting fallbacks: when the user prefers reduced transparency, backdrop-blur is suppressed and surfaces become solid. This matters for users with vestibular sensitivity and on older devices that struggle with `backdrop-filter`.

### Example usage

```tsx
// Before: inline glass-ish styling that drifts between components
<div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">

// After: consistent vocabulary
<div className="glass-surface p-4">

// Form fields:
<input type="text" className="glass-input px-4 py-2 w-full" />

// Buttons:
<button className="glass-button px-5 py-2.5">Submit</button>
<button className="glass-button-ghost px-4 py-2 border">Cancel</button>
```

---

## What's intentionally deferred

### Buttons across the existing app
Pervasive — touching every button individually would create a 50+ file diff. Instead, the `.glass-button` and `.glass-button-ghost` utilities are now available for incremental swap-in as components are touched for other reasons.

### Inputs across the existing app
Same logic. `.glass-input` utility is ready for use. Don't sweep en masse — too easy to introduce readability regressions. Swap per-form as the forms get touched for other reasons.

### Background gradients on pages
Glass surfaces look better against subtly-tinted layered backgrounds than against pure `bg-zinc-950`. Adding background gradients to every page route is a design-system-level change deferred for now. If you want it later, look at adding a single `<PageBackground>` component that wraps page content and provides a consistent ambient gradient.

### Tooltips and popovers
Smaller surfaces, lower visual impact than the items above. Worth doing eventually but not high-priority. The Radix tooltip + popover primitives can be glassified with the same approach used on dialog (one place, one edit, all consumers benefit).

### Drawers (`MobileDrawer.tsx`)
Mobile-only, used in a few places. Glass treatment would be the same as the dialog primitive. Defer until mobile review pass.

### Notification UI (`NotificationCenter`, `NotificationUI`)
Specialized — already has its own visual language with badges, dots, etc. Worth a careful pass when notifications get visual review.

---

## What NOT to do

- **Don't mass-apply `.glass-input` to every input in the codebase in one pass.** Form fields are where glass readability problems show up most. Apply per-form, test, ship, repeat.

- **Don't use `.glass-surface` for pages.** It's for panels, cards, and other small-to-medium surfaces. Full-page glass is a different pattern (would need foreground content always to be on a sub-surface).

- **Don't combine glass utilities with conflicting Tailwind classes.** `<div className="glass-surface bg-zinc-900">` will result in the Tailwind class winning the cascade. If you need to tune the glass surface, override the CSS variables or write a more specific class.

- **Don't apply glass to text-heavy pages without testing readability.** Documentation, terms of service, articles — these read better on solid surfaces.

---

## Verification checklist for any new glass application

1. Backdrop-blur visible? (test by hovering content under it — should blur visibly)
2. Contrast meets WCAG AA for body text against the new translucent surface?
3. Works on a busy background (gradient, image)?
4. Performance OK? (smooth scroll on a 2-year-old phone)
5. Focus states still distinguishable on form fields?
6. Reduced-transparency fallback rendering correctly? (test with `prefers-reduced-transparency: reduce` in dev tools)
