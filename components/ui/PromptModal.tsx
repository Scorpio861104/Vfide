'use client';

/**
 * PromptModal — async, accessible replacement for window.prompt().
 *
 * Why this exists: window.prompt() looks unprofessional, can't be styled,
 * and on iOS in-app browsers it silently no-ops. This modal provides a
 * consistent, themeable input + validation flow.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   const handleSubmit = (value: string) => { ... };
 *
 *   <PromptModal
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     onSubmit={handleSubmit}
 *     title="Describe the dispute"
 *     description="This text is recorded on-chain and visible to the DAO."
 *     placeholder="Why is this transaction in dispute?"
 *     submitText="Open dispute"
 *     multiline
 *     minLength={5}
 *     maxLength={500}
 *   />
 */

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { LoadingButton } from './LoadingButton';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  description?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
  isLoading?: boolean;
  /** Custom validator. Return error string or null for valid. */
  validate?: (value: string) => string | null;
}

export function PromptModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder,
  defaultValue = '',
  submitText = 'Submit',
  cancelText = 'Cancel',
  multiline = false,
  minLength = 1,
  maxLength = 1000,
  isLoading = false,
  validate,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
      // autofocus after animation
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen, defaultValue]);

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      setError(`Please enter at least ${minLength} character${minLength === 1 ? '' : 's'}.`);
      return;
    }
    if (trimmed.length > maxLength) {
      setError(`Please keep this under ${maxLength} characters.`);
      return;
    }
    if (validate) {
      const v = validate(trimmed);
      if (v) {
        setError(v);
        return;
      }
    }
    setError(null);
    await onSubmit(trimmed);
  }, [value, minLength, maxLength, validate, onSubmit]);

  // Escape closes; Cmd/Ctrl-Enter submits
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) onClose();
      if ((e.key === 'Enter') && (e.metaKey || e.ctrlKey) && !isLoading) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [isOpen, onClose, isLoading, handleSubmit],
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={!isLoading ? onClose : undefined}
            role="presentation"
          />

          {/* Modal */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[calc(100vw-2rem)] max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-modal-title"
          >
            <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
                <h2 id="prompt-modal-title" className="text-lg font-semibold text-white">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={!isLoading ? onClose : undefined}
                  disabled={isLoading}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {description && (
                <div className="px-5 pb-3 text-sm text-zinc-400 leading-relaxed">{description}</div>
              )}

              <div className="px-5 pb-5">
                {multiline ? (
                  <textarea
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={isLoading}
                    rows={4}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent resize-y disabled:opacity-60"
                  />
                ) : (
                  <input
                    ref={(el) => {
                      inputRef.current = el;
                    }}
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={isLoading}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-accent disabled:opacity-60"
                  />
                )}
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className={error ? 'text-red-400' : 'text-zinc-500'}>
                    {error || `${value.length}/${maxLength}`}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 px-5 pb-5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  {cancelText}
                </button>
                <LoadingButton
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  variant="primary"
                  className="flex-1"
                >
                  {submitText}
                </LoadingButton>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PromptModal;
