'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button — VFIDE's canonical button primitive.
 *
 * Tier 3 Phase 3 (2026-05-17). Built to replace ~100 inline `<button className="…">`
 * snowflakes scattered across the codebase. Distinct from:
 *   • `LoadingButton` — kept for transaction-flow buttons that need the
 *     gradient + shadow-glow treatment for high-emphasis CTAs.
 *   • `components/ui/button.tsx` (shadcn, lowercase) — uses generic CSS vars
 *     (`bg-primary`, `text-primary-foreground`) that aren't wired up in this
 *     codebase. Effectively dead (3 callers). Don't grow it; use this instead.
 *
 * API:
 *   <Button variant="primary" size="md" loading={pending} onClick={...}>Save</Button>
 *   <Button variant="outline" leftIcon={<Plus size={16} />}>Add</Button>
 *   <Button variant="danger" size="sm">Delete</Button>
 *
 * Variants ranked by visual weight (high → low):
 *   primary   — cyan-500 background, zinc-900 text. The page's main action.
 *   secondary — zinc-800 background. Equal-weight alt action.
 *   outline   — border-zinc-600, zinc-300 text. Tertiary / cancel / dismiss.
 *   ghost     — transparent, zinc-400 text → zinc-100 on hover. Inline actions.
 *   danger    — red-500 background. Destructive actions only.
 *
 * Sizes match the dominant inline patterns:
 *   sm — px-3 py-1.5 text-sm (badges-as-buttons, tag pills)
 *   md — px-4 py-2 text-sm  (most buttons — default)
 *   lg — px-6 py-3 text-base font-bold (hero CTAs, error-page actions)
 *
 * States baked in:
 *   - hover (background shift)
 *   - focus-visible (cyan ring offset)
 *   - active (subtle scale-down for tactile feedback)
 *   - disabled (50% opacity + no pointer events)
 *   - loading (spinner replaces leftIcon; button disabled while loading)
 */

const buttonVariants = cva(
  // base — applies to every variant
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-lg font-semibold whitespace-nowrap',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    'active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-cyan-500 text-zinc-900 hover:bg-cyan-400',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
        outline: 'border border-zinc-600 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
        ghost: 'bg-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
        danger: 'bg-red-500 text-white hover:bg-red-400',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base font-bold',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner in place of leftIcon and disable interaction. */
  loading?: boolean;
  /** Icon rendered before children (replaced by spinner when `loading`). */
  leftIcon?: ReactNode;
  /** Icon rendered after children. */
  rightIcon?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, loading, leftIcon, rightIcon, children, disabled, ...rest },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    // Icon size matches font size: sm → 14, md → 14, lg → 16.
    const iconSize = size === 'lg' ? 16 : 14;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
        ) : leftIcon ? (
          <span className="shrink-0 inline-flex">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon ? <span className="shrink-0 inline-flex">{rightIcon}</span> : null}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
