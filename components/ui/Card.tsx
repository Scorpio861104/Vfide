'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card — VFIDE's canonical card primitive.
 *
 * Tier 3 Phase 4 (2026-05-17). Built to consolidate the 5 different card
 * background patterns scattered across the codebase (bg-zinc-800/50,
 * bg-zinc-900, bg-white/5, bg-gradient-to-br from-zinc, GlassCard).
 *
 * Variant ladder (high → low elevation):
 *   elevated  — bg-zinc-900 border-zinc-800. Modals, hero cards, primary panels.
 *   surface   — bg-zinc-800/50 border-zinc-700. Standard card. The default.
 *   subtle    — bg-zinc-900/40 border-zinc-800. De-emphasized panels.
 *   ghost     — no background, just border. Section dividers / outlines.
 *
 * Distinct from:
 *   • `GlassCard` — kept for gradient-backed feature cards with the
 *     `from-cyan-500/10 to-purple-500/5` treatment. Different aesthetic role:
 *     marketing emphasis, not data display.
 *
 * Radius convention (locked in Tier 3 P4):
 *   md (rounded-xl)  — standard cards, modals, inputs    ← default
 *   lg (rounded-2xl) — hero cards, primary panels
 *
 * The "subcomponent" pattern (Header / Content / Footer) is optional but
 * recommended for cards with structured content. Cards without it just render
 * children directly.
 */

const cardVariants = cva(
  'border transition-colors',
  {
    variants: {
      variant: {
        elevated: 'bg-zinc-900 border-zinc-800',
        surface: 'bg-zinc-800/50 border-zinc-700',
        subtle: 'bg-zinc-900/40 border-zinc-800',
        ghost: 'bg-transparent border-zinc-800',
      },
      radius: {
        md: 'rounded-xl',
        lg: 'rounded-2xl',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'surface',
      radius: 'md',
      padding: 'md',
    },
  },
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, radius, padding, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, radius, padding }), className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

// ─── Optional subcomponents for structured cards ────────────────────────────

export function CardHeader({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3 mb-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-bold text-zinc-100', className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-zinc-400', className)}
      {...rest}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm text-zinc-300', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 mt-4 pt-4 border-t border-zinc-800', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export { cardVariants };
