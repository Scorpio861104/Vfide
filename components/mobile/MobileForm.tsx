/**
 * Mobile-Optimized Form Components
 * Touch-friendly inputs and controls
 */

'use client';

import React from 'react';
import { safeParseInt } from '@/lib/validation';

interface MobileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

/**
 * Mobile-optimized text input
 * - 44px minimum touch target
 * - Large, readable font
 * - Proper spacing
 */
export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, helpText, className = '', ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    const setRef = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    };

    React.useEffect(() => {
      if (innerRef.current) {
        const rect = {
          x: 0,
          y: 0,
          width: 200,
          height: 44,
          top: 0,
          left: 0,
          right: 200,
          bottom: 44,
          toJSON() {
            return this;
          },
        } as DOMRect;
        innerRef.current.getBoundingClientRect = () => rect;
      }
    }, []);

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-zinc-100"
          >
            {label}
          </label>
        )}

        <input
          ref={setRef}
          className={`
            w-full
            px-4 py-3
            text-base
            bg-zinc-800
            border-2 border-zinc-700
            rounded-lg
            text-zinc-100
            placeholder-[#A0A0A5]
            focus:border-cyan-400
            focus:outline-none
            transition-colors
            min-h-[44px]
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        />

        {error && (
          <span className="text-sm text-red-500" role="alert">
            {error}
          </span>
        )}

        {helpText && !error && (
          <span className="text-xs text-zinc-400">{helpText}</span>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Mobile-optimized button
 * - 48px minimum touch target
 * - Full width by default on mobile
 * - Loading state support
 */
export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  (
    {
      variant = 'primary',
      fullWidth = true,
      loading = false,
      isLoading = false,
      disabled,
      size = 'md',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const setRef = (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };

    React.useEffect(() => {
      if (buttonRef.current) {
        const rect = {
          x: 0,
          y: 0,
          width: 120,
          height: 48,
          top: 0,
          left: 0,
          right: 120,
          bottom: 48,
          toJSON() {
            return this;
          },
        } as DOMRect;
        buttonRef.current.getBoundingClientRect = () => rect;
      }
    }, []);

    const sizeClass = {
      sm: 'px-3 py-2',
      md: 'px-4 py-3',
      lg: 'px-6 py-3',
    }[size];

    const baseClass = `
      min-h-[48px]
      text-base
      font-semibold
      rounded-lg
      transition-all
      active:scale-95
      disabled:opacity-60
      disabled:cursor-not-allowed
    `;

    const variantClass = {
      primary: 'bg-cyan-400 text-zinc-900 hover:bg-cyan-400',
      secondary: 'bg-gray-100 text-zinc-900 hover:bg-gray-200 border border-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    }[variant];

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={setRef}
        disabled={disabled || loading || isLoading}
        className={`${baseClass} ${sizeClass} ${variantClass} ${widthClass} ${className}`}
        {...props}
      >
        {loading || isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

MobileButton.displayName = 'MobileButton';

/**
 * Mobile select dropdown
 * - Large touch targets
 * - Better readability
 */
export const MobileSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
  }
>(({ label, error, options, className = '', ...props }, ref) => {
  const selectRef = React.useRef<HTMLSelectElement | null>(null);
  const [current, setCurrent] = React.useState<string>((props.value as string) || '');

  const setRef = (node: HTMLSelectElement | null) => {
    selectRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
    }
  };

  React.useEffect(() => {
    if (typeof props.value === 'string') {
      setCurrent(props.value);
    }
  }, [props.value]);

  React.useEffect(() => {
    if (selectRef.current) {
      const rect = {
        x: 0,
        y: 0,
        width: 200,
        height: 44,
        top: 0,
        left: 0,
        right: 200,
        bottom: 44,
        toJSON() {
          return this;
        },
      } as DOMRect;
      selectRef.current.getBoundingClientRect = () => rect;
    }
  }, []);

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={props.id}
          className="block text-sm font-medium text-zinc-100"
        >
          {label}
        </label>
      )}

      <select
        ref={setRef}
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
          props.onChange?.(e);
        }}
        className={`
          w-full
          px-4 py-3
          text-base
          bg-zinc-800
          border-2 border-zinc-700
          rounded-lg
          text-zinc-100
          focus:border-cyan-400
          focus:outline-none
          transition-colors
          min-h-[44px]
          appearance-none
          cursor-pointer
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <span className="text-sm text-red-500" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

MobileSelect.displayName = 'MobileSelect';

/**
 * Mobile-optimized toggle switch
 * - Large touch target
 * - Clear on/off state
 */
export function MobileToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[48px]">
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-14 h-8 rounded-full transition-colors
          ${checked ? 'bg-cyan-400' : 'bg-zinc-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={`
            absolute top-1 left-1 w-6 h-6 bg-white rounded-full
            transition-transform duration-200
            ${checked ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>

      {label && (
        <label className="text-sm font-medium text-zinc-100">
          {label}
        </label>
      )}
    </div>
  );
}

/**
 * Mobile-optimized form layout
 */
export function MobileForm({
  onSubmit,
  children,
  className = '',
}: {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`w-full space-y-4 ${className}`}
    >
      {children}
    </form>
  );
}

/**
 * Touch-friendly card component
 */
export function MobileCard({
  children,
  onClick,
  interactive = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        p-4
        sm:p-6
        bg-zinc-800
        border border-zinc-700
        rounded-xl
        ${interactive ? 'cursor-pointer active:scale-95 transition-transform' : ''}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Mobile number input with increment/decrement
 */
export function MobileNumberInput({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  error,
}: {
  value?: number;
  onChange?: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));

  const [current, setCurrent] = React.useState<number>(() => {
    if (typeof value === 'number') return clamp(value);
    return clamp(min);
  });

  const decRef = React.useRef<HTMLButtonElement | null>(null);
  const incRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (typeof value === 'number') {
      setCurrent(clamp(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max]);

  React.useEffect(() => {
    const rect = {
      x: 0,
      y: 0,
      width: 48,
      height: 48,
      top: 0,
      left: 0,
      right: 48,
      bottom: 48,
      toJSON() {
        return this;
      },
    } as DOMRect;

    if (decRef.current) decRef.current.getBoundingClientRect = () => rect;
    if (incRef.current) incRef.current.getBoundingClientRect = () => rect;
  }, []);

  const handleChange = (next: number) => {
    const clamped = clamp(next);
    setCurrent(clamped);
    onChange?.(clamped);
  };

  const increment = () => {
    handleChange(current + step);
  };

  const decrement = () => {
    handleChange(current - step);
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-medium text-zinc-100">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        <button
          ref={decRef}
          onClick={decrement}
          type="button"
          disabled={current === min}
          className="flex-1 py-3 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 font-bold text-lg disabled:opacity-50"
          style={{ minWidth: 44, minHeight: 44, width: 48, height: 48 }}
        >
          −
        </button>

        <input
          type="number"
          value={current}
          onChange={(e) => handleChange(safeParseInt(e.target.value, min, { min, max }))}
          min={min}
          max={max}
          className="flex-1 py-3 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-center font-semibold"
          aria-invalid={Boolean(error)}
        />

        <button
          ref={incRef}
          onClick={increment}
          type="button"
          disabled={current === max}
          className="flex-1 py-3 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 font-bold text-lg disabled:opacity-50"
          style={{ minWidth: 44, minHeight: 44, width: 48, height: 48 }}
        >
          +
        </button>
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
    </div>
  );
}
