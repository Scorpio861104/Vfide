/**
 * Optimistic Update Utilities
 * 
 * Provides instant UI feedback before server/blockchain confirmation
 * Improves perceived performance and user experience
 */

import { useCallback, useState } from 'react';

interface OptimisticState<T> {
  data: T;
  pending: boolean;
  error: string | null;
  optimisticData: T | null;
}

interface OptimisticOptions<T> {
  /** Revert to original after this duration if no confirmation (ms) */
  revertTimeout?: number;
  /** Callback when optimistic update is applied */
  onOptimistic?: (newData: T) => void;
  /** Callback when confirmed */
  onConfirm?: (newData: T) => void;
  /** Callback when reverted */
  onRevert?: (originalData: T, error?: Error) => void;
}

/**
 * Hook for managing optimistic updates
 * 
 * @example
 * const { data, update, isPending } = useOptimistic(initialBalance);
 * 
 * // Instant UI update, then confirm with actual transaction
 * update(
 *   newBalance,
 *   async () => await sendTransaction()
 * );
 */
export function useOptimistic<T>(
  initialData: T,
  options: OptimisticOptions<T> = {}
) {
  const { revertTimeout = 30000, onOptimistic, onConfirm, onRevert } = options;
  
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null,
    optimisticData: null,
  });

  const update = useCallback(async (
    optimisticValue: T,
    confirmFn: () => Promise<T | void>
  ) => {
    const originalData = state.data;
    
    // Immediately apply optimistic update
    setState(prev => ({
      ...prev,
      data: optimisticValue,
      optimisticData: optimisticValue,
      pending: true,
      error: null,
    }));
    
    onOptimistic?.(optimisticValue);

    // Set revert timeout
    const timeoutId = setTimeout(() => {
      setState(prev => {
        if (prev.pending) {
          onRevert?.(originalData, new Error('Timeout'));
          return {
            ...prev,
            data: originalData,
            optimisticData: null,
            pending: false,
            error: 'Operation timed out',
          };
        }
        return prev;
      });
    }, revertTimeout);

    try {
      const result = await confirmFn();
      clearTimeout(timeoutId);
      
      const confirmedData = result ?? optimisticValue;
      
      setState(prev => ({
        ...prev,
        data: confirmedData,
        optimisticData: null,
        pending: false,
        error: null,
      }));
      
      onConfirm?.(confirmedData);
      return confirmedData;
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Revert to original
      setState(prev => ({
        ...prev,
        data: originalData,
        optimisticData: null,
        pending: false,
        error: err instanceof Error ? err.message : 'Update failed',
      }));
      
      onRevert?.(originalData, err instanceof Error ? err : undefined);
      throw err;
    }
  }, [state.data, revertTimeout, onOptimistic, onConfirm, onRevert]);

  const reset = useCallback((newData?: T) => {
    setState({
      data: newData ?? initialData,
      pending: false,
      error: null,
      optimisticData: null,
    });
  }, [initialData]);

  return {
    data: state.data,
    isPending: state.pending,
    isOptimistic: state.optimisticData !== null,
    error: state.error,
    update,
    reset,
  };
}

/**
 * Optimistic list operations helper
 * 
 * @example
 * const { items, addOptimistic, removeOptimistic } = useOptimisticList(initialItems);
 */
export function useOptimisticList<T extends { id: string | number }>(
  initialItems: T[],
  options: OptimisticOptions<T[]> = {}
) {
  const { data: items, update, isPending, isOptimistic, error, reset } = 
    useOptimistic(initialItems, options);

  const addOptimistic = useCallback(async (
    newItem: T,
    confirmFn: () => Promise<T | void>
  ) => {
    return update(
      [...items, newItem],
      confirmFn
    );
  }, [items, update]);

  const removeOptimistic = useCallback(async (
    itemId: T['id'],
    confirmFn: () => Promise<void>
  ) => {
    return update(
      items.filter(item => item.id !== itemId),
      confirmFn
    );
  }, [items, update]);

  const updateOptimistic = useCallback(async (
    itemId: T['id'],
    updates: Partial<T>,
    confirmFn: () => Promise<T | void>
  ) => {
    return update(
      items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
      confirmFn
    );
  }, [items, update]);

  return {
    items,
    isPending,
    isOptimistic,
    error,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    reset,
  };
}

/**
 * Simple optimistic toggle for boolean states
 * 
 * @example
 * const { value, toggle, isPending } = useOptimisticToggle(isLiked, toggleLike);
 */
export function useOptimisticToggle(
  initialValue: boolean,
  confirmFn: (newValue: boolean) => Promise<void>,
  options: Omit<OptimisticOptions<boolean>, 'revertTimeout'> & { revertTimeout?: number } = {}
) {
  const { data: value, update, isPending, error } = 
    useOptimistic(initialValue, { revertTimeout: 10000, ...options });

  const toggle = useCallback(async () => {
    const newValue = !value;
    return update(newValue, () => confirmFn(newValue));
  }, [value, update, confirmFn]);

  return {
    value,
    toggle,
    isPending,
    error,
  };
}

export default {
  useOptimistic,
  useOptimisticList,
  useOptimisticToggle,
};
