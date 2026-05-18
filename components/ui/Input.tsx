'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Input — VFIDE's canonical raw input primitive.
 *
 * Tier 3 Round 3 (2026-05-17, extended R15 2026-05-17). Built to consolidate
 * ~74 inline `<input>` tags that each rolled their own className. Distinct
 * from `FormInput` in `components/ux/FormComponents.tsx`, which wraps the
 * input in a heavily-decorated container with motion + icons — use that
 * when you want the full styled experience; use this `Input` when the
 * input sits inside a form grid where the wrapper is provided externally.
 *
 * R15 extension: optional `label`, `hint`, and `error` props. When any of
 * these is provided, the primitive wraps the input in a vertical stack and
 * wires up the proper a11y attributes (htmlFor, aria-describedby,
 * aria-invalid). When none is provided, it renders a bare `<input>`
 * exactly as before — full backward compatibility with existing call sites.
 *
 * API: extends `InputHTMLAttributes<HTMLInputElement>`. Drop-in for any
 * existing inline `<input>` — just swap the tag and remove the className
 * boilerplate. To level up to a labeled field, add `label="…"`.
 *
 * Variants:
 *   default — bg-zinc-900 border-white/10 (the dominant pattern)
 *   surface — bg-black/20 border-white/10 (location/grid forms)
 *   glass   — bg-white/5 border-white/10  (overlay forms on dark cards)
 *
 * Sizes:
 *   sm — px-3 py-1.5 text-sm
 *   md — px-3 py-2 text-sm     (default — matches the dominant inline shape)
 *   lg — px-4 py-2.5 text-base
 *
 * States baked in:
 *   - focus-visible (cyan border + ring)
 *   - hover (subtle border lighten)
 *   - disabled (opacity + no events)
 *   - invalid (red border via `aria-invalid` or via passing `error`)
 */

const inputVariants = cva(
  [
    'w-full rounded-lg text-white placeholder:text-zinc-500',
    'transition-colors duration-150',
    'outline-none',
    'focus-visible:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400/30',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:border-red-500 aria-[invalid=true]:focus-visible:ring-red-400/30',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-zinc-900 border border-white/10 hover:border-white/20',
        surface: 'bg-black/20 border border-white/10 hover:border-white/20',
        glass: 'bg-white/5 border border-white/10 hover:bg-white/10',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base',
      },
      mono: {
        true: 'font-mono',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      mono: false,
    },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Visible label above the input. Auto-wires htmlFor + id. */
  label?: ReactNode;
  /** Helper text shown below the input. Auto-wires aria-describedby. */
  hint?: ReactNode;
  /** Error message shown below the input. Implies aria-invalid + red border. */
  error?: ReactNode;
  /** Extra class on the outer wrapper (only used when label/hint/error are set). */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      mono,
      label,
      hint,
      error,
      wrapperClassName,
      id: idProp,
      required,
      ...rest
    },
    ref,
  ) => {
    // Stable auto-generated id so SSR + hydration match. Only used when the
    // caller doesn't pass an explicit `id` and we need one for htmlFor /
    // aria-describedby. useId() always runs but the value isn't read unless
    // a label/hint/error is provided.
    const autoId = useId();
    const fieldId = idProp ?? autoId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = errorId ?? hintId;

    // Caller did not opt into the wrapper layout — render a bare input,
    // identical to the pre-R15 behavior.
    if (!label && !hint && !error) {
      return (
        <input
          ref={ref}
          id={idProp}
          className={cn(inputVariants({ variant, size, mono }), className)}
          required={required}
          {...rest}
        />
      );
    }

    return (
      <div className={cn('space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-zinc-300"
          >
            {label}
            {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required ? true : undefined}
          required={required}
          className={cn(inputVariants({ variant, size, mono }), className)}
          {...rest}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-red-400">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-zinc-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { inputVariants };
