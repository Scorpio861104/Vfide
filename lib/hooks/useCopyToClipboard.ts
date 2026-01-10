/**
 * Reusable clipboard copy hook with automatic reset
 * Eliminates duplicate setTimeout patterns across the codebase
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCopyToClipboardOptions {
  /**
   * Duration in milliseconds before resetting copied state
   * @default 2000
   */
  resetDelay?: number;
  /**
   * Callback fired on successful copy
   */
  onSuccess?: () => void;
  /**
   * Callback fired on copy error
   */
  onError?: (error: Error) => void;
}

interface UseCopyToClipboardReturn {
  /**
   * Whether text was recently copied
   */
  copied: boolean;
  /**
   * Copy text to clipboard
   * @param text Text to copy
   * @returns Promise that resolves to true on success
   */
  copy: (text: string) => Promise<boolean>;
  /**
   * Manually reset the copied state
   */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with automatic state reset
 * 
 * @example
 * ```tsx
 * function Component() {
 *   const { copied, copy } = useCopyToClipboard({ resetDelay: 2000 });
 *   
 *   return (
 *     <button onClick={() => copy('Hello World')}>
 *       {copied ? 'Copied!' : 'Copy'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const { resetDelay = 2000, onSuccess, onError } = options;
  
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopied(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        // Modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers or non-HTTPS
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          textArea.remove();
          
          if (!successful) {
            throw new Error('Copy command failed');
          }
        }

        setCopied(true);
        onSuccess?.();

        // Auto-reset after delay
        timeoutRef.current = setTimeout(() => {
          setCopied(false);
          timeoutRef.current = null;
        }, resetDelay);

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to copy');
        onError?.(err);
        setCopied(false);
        return false;
      }
    },
    [resetDelay, onSuccess, onError]
  );

  return { copied, copy, reset };
}

/**
 * Hook for tracking copied state with item ID
 * Useful for lists where multiple items can be copied
 * 
 * @example
 * ```tsx
 * function ItemList({ items }) {
 *   const { copiedId, copyWithId } = useCopyWithId();
 *   
 *   return items.map(item => (
 *     <button onClick={() => copyWithId(item.id, item.text)}>
 *       {copiedId === item.id ? 'Copied!' : 'Copy'}
 *     </button>
 *   ));
 * }
 * ```
 */
export function useCopyWithId<T = string | number>(
  options: UseCopyToClipboardOptions = {}
) {
  const { resetDelay = 2000, onSuccess, onError } = options;
  
  const [copiedId, setCopiedId] = useState<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCopiedId(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const copyWithId = useCallback(
    async (id: T, text: string): Promise<boolean> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          
          const successful = document.execCommand('copy');
          textArea.remove();
          
          if (!successful) {
            throw new Error('Copy command failed');
          }
        }

        setCopiedId(id);
        onSuccess?.();

        timeoutRef.current = setTimeout(() => {
          setCopiedId(null);
          timeoutRef.current = null;
        }, resetDelay);

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to copy');
        onError?.(err);
        setCopiedId(null);
        return false;
      }
    },
    [resetDelay, onSuccess, onError]
  );

  return { copiedId, copyWithId, reset };
}
