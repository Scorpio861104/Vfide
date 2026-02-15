'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES ====================

export type OptimisticStatus = 'pending' | 'success' | 'error' | 'rollback';

export interface OptimisticUpdate<T> {
  id: string;
  optimisticData: T;
  originalData?: T;
  status: OptimisticStatus;
  timestamp: number;
  error?: Error;
}

export interface UseOptimisticOptions<T, R = T> {
  /** Initial data */
  initialData: T;
  /** Function to apply optimistic update */
  onOptimisticUpdate?: (current: T, optimistic: Partial<T>) => T;
  /** Function to merge server response */
  onServerResponse?: (current: T, response: R) => T;
  /** Rollback timeout in ms (default: 30000) */
  rollbackTimeout?: number;
  /** Maximum pending updates (default: 10) */
  maxPending?: number;
}

// ==================== HOOK ====================

/**
 * useOptimistic - Hook for optimistic UI updates
 * 
 * Provides immediate UI feedback while waiting for server confirmation.
 * Automatically rolls back on error or timeout.
 */
export function useOptimistic<T, R = T>(options: UseOptimisticOptions<T, R>) {
  const {
    initialData,
    onOptimisticUpdate = (current, optimistic) => ({ ...current, ...optimistic } as T),
    onServerResponse = (_, response) => response as unknown as T,
    rollbackTimeout = 30000,
    maxPending = 10,
  } = options;

  const [data, setData] = useState<T>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map());
  const [isOptimistic, setIsOptimistic] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up timeout on unmount
  const cleanupTimeout = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  /**
   * Apply optimistic update immediately
   */
  const applyOptimistic = useCallback(
    (update: Partial<T>): string => {
      const id = uuidv4();
      const timestamp = Date.now();

      // Store original data for potential rollback
      setData((current) => {
        const optimisticData = onOptimisticUpdate(current, update);
        
        const newUpdate: OptimisticUpdate<T> = {
          id,
          optimisticData,
          originalData: current,
          status: 'pending',
          timestamp,
        };

        setPendingUpdates((prev) => {
          const updated = new Map(prev);
          
          // Enforce max pending limit
          if (updated.size >= maxPending) {
            const oldest = Array.from(updated.entries())
              .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
              cleanupTimeout(oldest[0]);
              updated.delete(oldest[0]);
            }
          }
          
          updated.set(id, newUpdate);
          return updated;
        });

        setIsOptimistic(true);
        return optimisticData;
      });

      // Set up rollback timeout
      const timeout = setTimeout(() => {
        rollback(id, new Error('Optimistic update timed out'));
      }, rollbackTimeout);
      
      timeoutRefs.current.set(id, timeout);

      return id;
    },
    [onOptimisticUpdate, rollbackTimeout, maxPending, cleanupTimeout, rollback]
  );

  /**
   * Confirm optimistic update with server response
   */
  const confirm = useCallback(
    (id: string, serverResponse?: R) => {
      cleanupTimeout(id);

      setData((current) => {
        if (serverResponse !== undefined) {
          return onServerResponse(current, serverResponse);
        }
        return current;
      });

      setPendingUpdates((prev) => {
        const updated = new Map(prev);
        const update = updated.get(id);
        if (update) {
          updated.set(id, { ...update, status: 'success' });
          // Remove after brief delay for UI feedback
          setTimeout(() => {
            setPendingUpdates((p) => {
              const u = new Map(p);
              u.delete(id);
              if (u.size === 0) setIsOptimistic(false);
              return u;
            });
          }, 100);
        }
        return updated;
      });
    },
    [onServerResponse, cleanupTimeout]
  );

  /**
   * Rollback optimistic update
   */
  const rollback = useCallback(
    (id: string, error?: Error) => {
      cleanupTimeout(id);

      setPendingUpdates((prev) => {
        const update = prev.get(id);
        if (!update) return prev;

        // Revert to original data
        if (update.originalData !== undefined) {
          setData(update.originalData);
        }

        const updated = new Map(prev);
        updated.set(id, {
          ...update,
          status: 'rollback',
          error,
        });

        // Remove after delay for error display
        setTimeout(() => {
          setPendingUpdates((p) => {
            const u = new Map(p);
            u.delete(id);
            if (u.size === 0) setIsOptimistic(false);
            return u;
          });
        }, 3000);

        return updated;
      });
    },
    [cleanupTimeout]
  );

  /**
   * Rollback all pending updates
   */
  const rollbackAll = useCallback(() => {
    pendingUpdates.forEach((_, id) => {
      rollback(id, new Error('All updates rolled back'));
    });
  }, [pendingUpdates, rollback]);

  // Computed values
  const hasPending = useMemo(() => {
    return Array.from(pendingUpdates.values()).some((u) => u.status === 'pending');
  }, [pendingUpdates]);

  const hasError = useMemo(() => {
    return Array.from(pendingUpdates.values()).some(
      (u) => u.status === 'error' || u.status === 'rollback'
    );
  }, [pendingUpdates]);

  return {
    /** Current data (with optimistic updates applied) */
    data,
    /** Set data directly (bypasses optimistic flow) */
    setData,
    /** Apply an optimistic update, returns update ID */
    applyOptimistic,
    /** Confirm an optimistic update with server response */
    confirm,
    /** Rollback an optimistic update */
    rollback,
    /** Rollback all pending updates */
    rollbackAll,
    /** Map of pending updates */
    pendingUpdates,
    /** Whether any optimistic updates are applied */
    isOptimistic,
    /** Whether any updates are pending confirmation */
    hasPending,
    /** Whether any updates failed/rolled back */
    hasError,
  };
}

// ==================== LIST VARIANT ====================

export interface UseOptimisticListOptions<T> {
  initialItems: T[];
  getId: (item: T) => string;
}

/**
 * useOptimisticList - Hook for optimistic list operations
 * 
 * Provides optimistic add, remove, and update operations for lists.
 */
export function useOptimisticList<T>(options: UseOptimisticListOptions<T>) {
  const { initialItems, getId } = options;

  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [pendingRemoves, setPendingRemoves] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const rollbackData = useRef<Map<string, { type: 'add' | 'remove' | 'update'; data: T | null }>>(
    new Map()
  );

  /**
   * Optimistically add an item
   */
  const addOptimistic = useCallback(
    (item: T): string => {
      const id = getId(item);
      
      setItems((prev) => [...prev, item]);
      setPendingAdds((prev) => new Set(prev).add(id));
      rollbackData.current.set(id, { type: 'add', data: null });
      
      return id;
    },
    [getId]
  );

  /**
   * Optimistically remove an item
   */
  const removeOptimistic = useCallback(
    (id: string): void => {
      setItems((prev) => {
        const item = prev.find((i) => getId(i) === id);
        if (item) {
          rollbackData.current.set(id, { type: 'remove', data: item });
        }
        return prev.filter((i) => getId(i) !== id);
      });
      setPendingRemoves((prev) => new Set(prev).add(id));
    },
    [getId]
  );

  /**
   * Optimistically update an item
   */
  const updateOptimistic = useCallback(
    (id: string, updates: Partial<T>): void => {
      setItems((prev) => {
        const index = prev.findIndex((i) => getId(i) === id);
        if (index === -1) return prev;

        const original = prev[index];
        if (original) {
          rollbackData.current.set(id, { type: 'update', data: original });
        }

        const updated = [...prev];
        updated[index] = { ...original, ...updates } as T;
        return updated;
      });
      setPendingUpdates((prev) => new Set(prev).add(id));
    },
    [getId]
  );

  /**
   * Confirm an optimistic operation
   */
  const confirm = useCallback((id: string, serverItem?: T): void => {
    setPendingAdds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    setPendingRemoves((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    setPendingUpdates((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
    rollbackData.current.delete(id);

    // Update with server data if provided
    if (serverItem) {
      setItems((prev) => {
        const index = prev.findIndex((i) => getId(i) === id);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = serverItem;
        return updated;
      });
    }
  }, [getId]);

  /**
   * Rollback an optimistic operation
   */
  const rollback = useCallback(
    (id: string): void => {
      const data = rollbackData.current.get(id);
      if (!data) return;

      if (data.type === 'add') {
        // Remove the optimistically added item
        setItems((prev) => prev.filter((i) => getId(i) !== id));
      } else if (data.type === 'remove' && data.data) {
        // Restore the removed item
        setItems((prev) => [...prev, data.data!]);
      } else if (data.type === 'update' && data.data) {
        // Restore original version
        setItems((prev) => {
          const index = prev.findIndex((i) => getId(i) === id);
          if (index === -1) return [...prev, data.data!];
          const updated = [...prev];
          updated[index] = data.data!;
          return updated;
        });
      }

      // Clean up pending state
      setPendingAdds((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      setPendingRemoves((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      setPendingUpdates((prev) => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      rollbackData.current.delete(id);
    },
    [getId]
  );

  /**
   * Check if an item has pending operations
   */
  const isPending = useCallback(
    (id: string): boolean => {
      return pendingAdds.has(id) || pendingRemoves.has(id) || pendingUpdates.has(id);
    },
    [pendingAdds, pendingRemoves, pendingUpdates]
  );

  /**
   * Get pending status for an item
   */
  const getPendingStatus = useCallback(
    (id: string): 'adding' | 'removing' | 'updating' | null => {
      if (pendingAdds.has(id)) return 'adding';
      if (pendingRemoves.has(id)) return 'removing';
      if (pendingUpdates.has(id)) return 'updating';
      return null;
    },
    [pendingAdds, pendingRemoves, pendingUpdates]
  );

  return {
    items,
    setItems,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    confirm,
    rollback,
    isPending,
    getPendingStatus,
    hasPending: pendingAdds.size > 0 || pendingRemoves.size > 0 || pendingUpdates.size > 0,
  };
}

// ==================== EXPORTS ====================

export default useOptimistic;
