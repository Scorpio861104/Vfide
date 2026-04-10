'use client';

import React, { forwardRef, useRef, useState, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Info,
  Loader2,
  X
} from 'lucide-react';
import { useFormContext, FieldError, FieldValues, Path, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string | FieldError;
  hint?: string;
  helperText?: string;
  showSuccessIndicator?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  isValidating?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

interface _FormState {
  isDirty: boolean;
  isTouched: boolean;
  isValid: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
}

// ==================== ENHANCED INPUT ====================

export const EnhancedInput = forwardRef<HTMLInputElement, FormFieldProps>(function EnhancedInput(
  {
    label,
    name,
    error,
    hint,
    helperText,
    showSuccessIndicator = true,
    showCharacterCount = false,
    maxLength,
    leftIcon,
    rightIcon,
    isLoading,
    isValidating,
    variant = 'default',
    type = 'text',
    className = '',
    required,
    disabled,
    value,
    onChange,
    onBlur,
    onFocus,
    ...props
  },
  ref
) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const isPassword = type === 'password';
  const hasError = !!error;
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const isSuccess = !hasError && charCount > 0 && !isValidating;

  useEffect(() => {
    if (typeof value === 'string') {
      setCharCount(value.length);
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCharCount(e.target.value.length);
    onChange?.(e);
  }, [onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  }, [onBlur]);

  const variantClasses = {
    default: 'bg-zinc-900/50 border-zinc-700 focus:border-cyan-500',
    filled: 'bg-zinc-800 border-transparent focus:border-cyan-500',
    outlined: 'bg-transparent border-zinc-600 focus:border-cyan-500',
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className={`text-sm font-medium transition-colors ${
            isFocused ? 'text-cyan-400' : 'text-zinc-300'
          }`}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {hint && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {hint}
          </span>
        )}
      </div>

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={id}
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || isLoading}
          maxLength={maxLength}
          aria-invalid={hasError}
          aria-describedby={errorMessage ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-white
            transition-all duration-200 outline-none
            placeholder:text-zinc-600
            disabled:opacity-50 disabled:cursor-not-allowed
            ${variantClasses[variant]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon || isPassword || isValidating || (showSuccessIndicator && isSuccess) ? 'pr-10' : ''}
            ${hasError ? 'border-red-500 focus:border-red-500 bg-red-500/5' : ''}
            ${isSuccess && showSuccessIndicator ? 'border-green-500 focus:border-green-500 bg-green-500/5' : ''}
          `}
          {...props}
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isValidating && (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          )}

          {!isValidating && showSuccessIndicator && isSuccess && !hasError && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-green-400"
            >
              <Check className="w-4 h-4" />
            </motion.div>
          )}

          {hasError && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-red-400"
            >
              <AlertCircle className="w-4 h-4" />
            </motion.div>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {rightIcon && !isPassword && !isValidating && !isSuccess && !hasError && rightIcon}
        </div>
      </div>

      {/* Bottom Row: Error/Helper + Character Count */}
      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          {hasError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${id}-error`}
              className="text-sm text-red-400 flex items-center gap-1"
              role="alert"
            >
              <AlertCircle className="w-3 h-3" />
              {errorMessage}
            </motion.p>
          ) : helperText ? (
            <motion.p
              key="helper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              id={`${id}-helper`}
              className="text-xs text-zinc-500"
            >
              {helperText}
            </motion.p>
          ) : (
            <span />
          )}
        </AnimatePresence>

        {showCharacterCount && maxLength && (
          <span className={`text-xs ${charCount >= maxLength ? 'text-red-400' : 'text-zinc-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});

// ==================== ENHANCED TEXTAREA ====================

interface EnhancedTextareaProps extends Omit<FormFieldProps, 'type'> {
  rows?: number;
  autoResize?: boolean;
}

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(function EnhancedTextarea(
  {
    label,
    name,
    error,
    hint,
    helperText,
    showCharacterCount = false,
    maxLength,
    rows = 4,
    autoResize = false,
    variant = 'default',
    className = '',
    required,
    disabled,
    value,
    onChange,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasError = !!error;
  const errorMessage = typeof error === 'string' ? error : error?.message;

  useEffect(() => {
    if (typeof value === 'string') {
      setCharCount(value.length);
    }
  }, [value]);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
  }, [onChange]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e as unknown as React.FocusEvent<HTMLInputElement>);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>);
  }, [onBlur]);

  const variantClasses = {
    default: 'bg-zinc-900/50 border-zinc-700 focus:border-cyan-500',
    filled: 'bg-zinc-800 border-transparent focus:border-cyan-500',
    outlined: 'bg-transparent border-zinc-600 focus:border-cyan-500',
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className={`text-sm font-medium transition-colors ${
            isFocused ? 'text-cyan-400' : 'text-zinc-300'
          }`}
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {hint && (
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {hint}
          </span>
        )}
      </div>

      <textarea
        ref={(node) =>  {
          textareaRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={hasError}
        aria-describedby={errorMessage ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={`
          w-full px-4 py-3 rounded-xl border-2 text-white resize-none
          transition-all duration-200 outline-none
          placeholder:text-zinc-600
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${hasError ? 'border-red-500 focus:border-red-500 bg-red-500/5' : ''}
        `}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />

      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          {hasError ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${id}-error`}
              className="text-sm text-red-400 flex items-center gap-1"
              role="alert"
            >
              <AlertCircle className="w-3 h-3" />
              {errorMessage}
            </motion.p>
          ) : helperText ? (
            <motion.p
              key="helper"
              id={`${id}-helper`}
              className="text-xs text-zinc-500"
            >
              {helperText}
            </motion.p>
          ) : (
            <span />
          )}
        </AnimatePresence>

        {showCharacterCount && maxLength && (
          <span className={`text-xs ${charCount >= maxLength ? 'text-red-400' : 'text-zinc-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
});

// ==================== FORM FIELD WRAPPER (for react-hook-form) ====================

interface FormFieldWrapperProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  children?: React.ReactNode;
  register?: UseFormRegister<T>;
  watch?: UseFormWatch<T>;
  hint?: string;
  helperText?: string;
  showSuccessIndicator?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
}

export function FormFieldWrapper<T extends FieldValues>({
  name,
  label,
  ...rest
}: FormFieldWrapperProps<T>) {
  const formContext = useFormContext<T>();

  if (!formContext) {
    logger.warn('FormFieldWrapper must be used within a FormProvider');
    return null;
  }

  const {
    register,
    formState: { errors },
  } = formContext;

  const error = errors[name] as FieldError | undefined;

  return (
    <EnhancedInput
      label={label}
      error={error}
      {...register(name)}
      {...rest}
    />
  );
}

// ==================== MULTI-STEP FORM ====================

interface MultiStepFormStep {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  isCompleted?: boolean;
  content: React.ReactNode;
}

interface MultiStepFormProps {
  steps: MultiStepFormStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  isLoading?: boolean;
  showProgressBar?: boolean;
  showStepNumbers?: boolean;
  allowSkip?: boolean;
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  isLoading = false,
  showProgressBar = true,
  showStepNumbers = true,
  allowSkip = false,
}: MultiStepFormProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="relative">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="absolute right-0 top-3 text-xs text-zinc-500">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
      )}

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => step.isCompleted || index < currentStep ? onStepChange(index) : null}
            disabled={!step.isCompleted && index > currentStep}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all
              ${index === currentStep
                ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                : step.isCompleted
                  ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }
            `}
          >
            {showStepNumbers && (
              <span className={`
                w-5 h-5 rounded-full flex items-center justify-center text-xs
                ${step.isCompleted ? 'bg-green-500 text-white' : 'bg-zinc-700'}
              `}>
                {step.isCompleted ? <Check className="w-3 h-3" /> : index + 1}
              </span>
            )}
            {step.title}
            {step.isOptional && (
              <span className="text-xs text-zinc-500">(Optional)</span>
            )}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepData?.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="min-h-50"
        >
          {currentStepData?.description && (
            <p className="text-zinc-400 mb-4">{currentStepData.description}</p>
          )}
          {currentStepData?.content}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstStep || isLoading}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${isFirstStep
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800'
            }
          `}
        >
          Previous
        </button>

        <div className="flex gap-2">
          {allowSkip && currentStepData?.isOptional && !isLastStep && (
            <button
              type="button"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLastStep ? 'Complete' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== TAG INPUT ====================

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  error?: string;
  suggestions?: string[];
  allowDuplicates?: boolean;
}

export function TagInput({
  label,
  value = [],
  onChange,
  placeholder = 'Add tags...',
  maxTags = 10,
  error,
  suggestions = [],
  allowDuplicates = false,
}: TagInputProps) {
  const id = useId();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      (allowDuplicates || !value.includes(s))
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (
      trimmed &&
      value.length < maxTags &&
      (allowDuplicates || !value.includes(trimmed))
    ) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">
        {label}
      </label>

      <div
        className={`
          flex flex-wrap gap-2 p-3 bg-zinc-900/50 border-2 rounded-xl
          transition-colors focus-within:border-cyan-500
          ${error ? 'border-red-500' : 'border-zinc-700'}
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <motion.span
            key={`${tag}-${index}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="hover:text-cyan-200"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={value.length >= maxTags}
          className="flex-1 min-w-25 bg-transparent outline-none text-white placeholder:text-zinc-600"
        />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden"
          >
            {filteredSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <span />
        )}
        <span className="text-xs text-zinc-500">
          {value.length}/{maxTags} tags
        </span>
      </div>
    </div>
  );
}

export default EnhancedInput;
