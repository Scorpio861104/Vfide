'use client';

/**
 * Optimized Form Components
 * 
 * Beautiful, accessible form components with real-time
 * validation feedback, animations, and mobile optimization.
 */

import React, { forwardRef, useState, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle,
  Search,
  ChevronDown,
  Copy,
  ExternalLink
} from 'lucide-react';
import { triggerHaptic, useCopyToClipboard, usePrefersReducedMotion } from '@/lib/ux/uxUtils';

// ==================== TYPES ====================

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
  maxLength?: number;
  showCount?: boolean;
}

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
}

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface FormToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface AddressInputProps extends Omit<FormInputProps, 'value' | 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  onResolve?: (address: string | null) => void;
}

// ==================== FORM INPUT ====================

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  hint,
  success,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  type = 'text',
  className = '',
  disabled,
  ...props
}, ref) => {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const sizes = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-13 text-lg',
  };

  const variants = {
    default: 'bg-gray-900 border-gray-700',
    filled: 'bg-gray-800 border-transparent',
    outlined: 'bg-transparent border-gray-600',
  };

  const getBorderColor = () => {
    if (error) return 'border-red-500 focus-within:border-red-500';
    if (success) return 'border-green-500 focus-within:border-green-500';
    return 'focus-within:border-cyan-500';
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-300"
        >
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <motion.div
        animate={isFocused && !reducedMotion ? { scale: 1.01 } : { scale: 1 }}
        className={`
          relative flex items-center rounded-xl border transition-colors
          ${variants[variant]}
          ${getBorderColor()}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute left-3 text-gray-400">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={id}
          type={inputType}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full bg-transparent text-white placeholder-gray-500
            rounded-xl outline-none
            ${sizes[size]}
            ${leftIcon ? 'pl-10' : 'pl-4'}
            ${rightIcon || isPassword ? 'pr-10' : 'pr-4'}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />

        {/* Password toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-gray-400 hover:text-white transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {/* Right icon or status */}
        {!isPassword && (rightIcon || success !== undefined) && (
          <div className="absolute right-3">
            {success !== undefined ? (
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-green-400"
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : error ? (
                  <motion.div
                    key="error"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            ) : (
              <div className="text-gray-400">{rightIcon}</div>
            )}
          </div>
        )}
      </motion.div>

      {/* Error or hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            id={`${id}-error`}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id={`${id}-hint`}
            className="text-sm text-gray-500"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

FormInput.displayName = 'FormInput';

// ==================== FORM TEXTAREA ====================

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(({
  label,
  error,
  hint,
  success,
  maxLength,
  showCount = false,
  className = '',
  disabled,
  value,
  onChange,
  ...props
}, ref) => {
  const id = useId();
  const [charCount, setCharCount] = useState(typeof value === 'string' ? value.length : 0);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    onChange?.(e);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full min-h-25 px-4 py-3 bg-gray-900 border rounded-xl
            text-white placeholder-gray-500
            outline-none transition-colors resize-y
            ${error ? 'border-red-500' : success ? 'border-green-500' : 'border-gray-700 focus:border-cyan-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />

        {/* Character count */}
        {showCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            <span className={charCount >= maxLength * 0.9 ? 'text-yellow-400' : ''}>
              {charCount}
            </span>
            /{maxLength}
          </div>
        )}
      </div>

      {/* Error or hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            id={`${id}-error`}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p
            key="hint"
            id={`${id}-hint`}
            className="text-sm text-gray-500"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

FormTextarea.displayName = 'FormTextarea';

// ==================== FORM SELECT ====================

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(({
  label,
  error,
  hint,
  options,
  size = 'md',
  placeholder = 'Select an option',
  className = '',
  disabled,
  ...props
}, ref) => {
  const id = useId();

  const sizes = {
    sm: 'h-9 text-sm',
    md: 'h-11 text-base',
    lg: 'h-13 text-lg',
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          className={`
            w-full appearance-none bg-gray-900 border rounded-xl
            text-white pl-4 pr-10
            outline-none transition-colors cursor-pointer
            ${sizes[size]}
            ${error ? 'border-red-500' : 'border-gray-700 focus:border-cyan-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {/* Error or hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            id={`${id}-error`}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" id={`${id}-hint`} className="text-sm text-gray-500">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

// ==================== FORM CHECKBOX ====================

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(({
  label,
  description,
  error,
  size = 'md',
  className = '',
  disabled,
  ...props
}, ref) => {
  const id = useId();

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            className={`
              peer appearance-none bg-gray-900 border-2 border-gray-600 rounded
              checked:bg-cyan-500 checked:border-cyan-500
              focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-0
              transition-colors cursor-pointer
              ${sizes[size]}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-500' : ''}
            `}
            aria-describedby={description ? `${id}-description` : undefined}
            {...props}
          />
          <Check className={`
            absolute pointer-events-none text-white
            opacity-0 peer-checked:opacity-100 transition-opacity
            ${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'}
          `} />
        </div>

        <div className="flex-1">
          <label 
            htmlFor={id} 
            className={`
              text-sm font-medium cursor-pointer
              ${disabled ? 'text-gray-500' : 'text-gray-200'}
            `}
          >
            {label}
          </label>
          {description && (
            <p id={`${id}-description`} className="text-sm text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
});

FormCheckbox.displayName = 'FormCheckbox';

// ==================== FORM TOGGLE ====================

export function FormToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: FormToggleProps) {
  const id = useId();

  const handleToggle = useCallback(() => {
    if (disabled) return;
    triggerHaptic('light');
    onChange(!checked);
  }, [disabled, checked, onChange]);

  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-7', thumb: 'w-6 h-6', translate: 'translate-x-7' },
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label 
              htmlFor={id}
              className={`text-sm font-medium ${disabled ? 'text-gray-500' : 'text-gray-200'}`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex shrink-0 rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900
          ${sizes[size].track}
          ${checked ? 'bg-cyan-500' : 'bg-gray-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <motion.span
          initial={false}
          animate={{ x: checked ? '100%' : '0%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            absolute top-0.5 left-0.5 rounded-full bg-white shadow-lg
            ${sizes[size].thumb}
          `}
        />
      </button>
    </div>
  );
}

// ==================== SEARCH INPUT ====================

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  className = '',
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
}) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="
          w-full h-11 pl-10 pr-10 bg-gray-900 border border-gray-700 rounded-xl
          text-white placeholder-gray-500
          outline-none focus:border-cyan-500 transition-colors
        "
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== ADDRESS INPUT ====================

export function AddressInput({
  value,
  onChange,
  onResolve,
  label,
  error,
  hint,
  className = '',
  ...props
}: AddressInputProps) {
  const id = useId();
  const { copy, copied } = useCopyToClipboard();
  const [isResolving, setIsResolving] = useState(false);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(value);
  const isENS = value.endsWith('.eth') || value.includes('.');

  const handleCopy = () => {
    if (isValidAddress) {
      copy(value);
      triggerHaptic('light');
    }
  };

  // Mock ENS resolution
  const handleResolve = async () => {
    if (!isENS) return;
    setIsResolving(true);
    
    // Simulate ENS resolution
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mock resolved address
    const mockAddress = `0x${'1234'.repeat(10)}`;
    onResolve?.(mockAddress);
    setIsResolving(false);
  };

  React.useEffect(() => {
    if (isENS) {
      handleResolve();
    }
  }, [isENS]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x... or ENS name"
          className={`
            w-full h-11 px-4 pr-20 bg-gray-900 border rounded-xl
            text-white font-mono text-sm placeholder-gray-500
            outline-none transition-colors
            ${error ? 'border-red-500' : isValidAddress ? 'border-green-500' : 'border-gray-700 focus:border-cyan-500'}
          `}
          {...props}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isResolving && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"
            />
          )}

          {isValidAddress && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                aria-label={copied ? 'Copied!' : 'Copy address'}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://etherscan.io/address/${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                aria-label="View on Etherscan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Error or hint */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-sm text-gray-500">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ==================== AMOUNT INPUT ====================

export function AmountInput({
  value,
  onChange,
  max,
  symbol = 'ETH',
  usdValue,
  label,
  error,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  symbol?: string;
  usdValue?: string;
  label?: string;
  error?: string;
  className?: string;
}) {
  const id = useId();

  const handleMax = () => {
    if (max) {
      onChange(max);
      triggerHaptic('light');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow valid number input
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-sm font-medium text-gray-300">
            {label}
          </label>
          {max && (
            <span className="text-sm text-gray-500">
              Balance: {max} {symbol}
            </span>
          )}
        </div>
      )}

      <div className={`
        relative flex items-center bg-gray-900 border rounded-xl
        ${error ? 'border-red-500' : 'border-gray-700 focus-within:border-cyan-500'}
      `}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder="0.00"
          className="
            flex-1 h-14 px-4 bg-transparent text-white text-xl font-medium
            placeholder-gray-500 outline-none
          "
        />

        <div className="flex items-center gap-2 pr-4">
          {max && (
            <button
              type="button"
              onClick={handleMax}
              className="px-2 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded-lg transition-colors"
            >
              MAX
            </button>
          )}
          <span className="text-gray-400 font-medium">{symbol}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {usdValue && (
          <span className="text-sm text-gray-500">≈ ${usdValue}</span>
        )}
        {error && (
          <span className="text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

export default {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormToggle,
  SearchInput,
  AddressInput,
  AmountInput,
};
