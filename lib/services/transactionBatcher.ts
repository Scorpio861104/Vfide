'use client';

/**
 * Transaction Batcher Service
 * 
 * Intelligently batches multiple transactions to save gas and improve UX.
 * Supports multicall patterns for compatible contracts.
 */

import { encodeFunctionData, type Address, type Hex } from 'viem';

// ==================== TYPES ====================

export interface BatchableTransaction {
  id: string;
  to: Address;
  data: Hex;
  value?: bigint;
  description?: string;
  priority?: 'low' | 'normal' | 'high';
  deadline?: number; // Unix timestamp
}

export interface BatchGroup {
  id: string;
  transactions: BatchableTransaction[];
  estimatedGas: bigint;
  estimatedSavings: bigint;
  canBatch: boolean;
  batchType: 'multicall' | 'sequential' | 'parallel';
}

export interface BatchResult {
  success: boolean;
  txHash?: Hex;
  results?: Array<{ id: string; success: boolean; result?: Hex; error?: string }>;
  gasUsed?: bigint;
  totalSavings?: bigint;
}

export interface BatcherOptions {
  maxBatchSize?: number;
  maxGasPerBatch?: bigint;
  multicallAddress?: Address;
  autoExecuteDelay?: number; // ms
}

// ==================== MULTICALL ABI ====================

const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// Multicall3 deployed on most EVM chains
const DEFAULT_MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;

// ==================== TRANSACTION BATCHER ====================

export class TransactionBatcher {
  private pendingTransactions: Map<string, BatchableTransaction> = new Map();
  private options: Required<BatcherOptions>;
  private autoExecuteTimer: NodeJS.Timeout | null = null;
  private onBatchReady?: (batch: BatchGroup) => void;

  constructor(options: BatcherOptions = {}) {
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 10,
      maxGasPerBatch: options.maxGasPerBatch ?? BigInt(3_000_000),
      multicallAddress: options.multicallAddress ?? DEFAULT_MULTICALL3_ADDRESS,
      autoExecuteDelay: options.autoExecuteDelay ?? 5000,
    };
  }

  /**
   * Add a transaction to the pending batch
   */
  add(tx: BatchableTransaction): string {
    const id = tx.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const transaction = { ...tx, id };
    
    this.pendingTransactions.set(id, transaction);
    this.scheduleAutoExecute();
    
    return id;
  }

  /**
   * Remove a transaction from the pending batch
   */
  remove(id: string): boolean {
    return this.pendingTransactions.delete(id);
  }

  /**
   * Get all pending transactions
   */
  getPending(): BatchableTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Clear all pending transactions
   */
  clear(): void {
    this.pendingTransactions.clear();
    if (this.autoExecuteTimer) {
      clearTimeout(this.autoExecuteTimer);
      this.autoExecuteTimer = null;
    }
  }

  /**
   * Analyze transactions and create optimal batch groups
   */
  analyze(): BatchGroup[] {
    const transactions = this.getPending();
    if (transactions.length === 0) return [];

    const groups: BatchGroup[] = [];
    
    // Sort by priority and deadline
    const sorted = [...transactions].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by deadline (earlier first)
      const aDeadline = a.deadline || Infinity;
      const bDeadline = b.deadline || Infinity;
      return aDeadline - bDeadline;
    });

    // Group transactions by target contract
    const byTarget = new Map<string, BatchableTransaction[]>();
    for (const tx of sorted) {
      const key = tx.to.toLowerCase();
      const existing = byTarget.get(key) || [];
      existing.push(tx);
      byTarget.set(key, existing);
    }

    // Create batch groups
    let currentBatch: BatchableTransaction[] = [];
    let currentGasEstimate = BigInt(0);
    const GAS_PER_TX = BigInt(50_000); // Conservative estimate

    for (const tx of sorted) {
      const txGas = GAS_PER_TX;
      
      if (
        currentBatch.length >= this.options.maxBatchSize ||
        currentGasEstimate + txGas > this.options.maxGasPerBatch
      ) {
        // Create a new batch group
        if (currentBatch.length > 0) {
          groups.push(this.createBatchGroup(currentBatch));
        }
        currentBatch = [tx];
        currentGasEstimate = txGas;
      } else {
        currentBatch.push(tx);
        currentGasEstimate += txGas;
      }
    }

    // Add remaining transactions
    if (currentBatch.length > 0) {
      groups.push(this.createBatchGroup(currentBatch));
    }

    return groups;
  }

  /**
   * Create a batch group from transactions
   */
  private createBatchGroup(transactions: BatchableTransaction[]): BatchGroup {
    const hasValue = transactions.some(tx => tx.value && tx.value > BigInt(0));
    const allSameTarget = new Set(transactions.map(tx => tx.to.toLowerCase())).size === 1;
    
    // Determine batch type
    let batchType: 'multicall' | 'sequential' | 'parallel';
    let canBatch = false;
    
    if (transactions.length === 1) {
      batchType = 'sequential';
    } else if (!hasValue) {
      // Multicall is best for non-value transactions
      batchType = 'multicall';
      canBatch = true;
    } else if (allSameTarget) {
      // Same target can use contract's native batching if available
      batchType = 'multicall';
      canBatch = true;
    } else {
      batchType = 'sequential';
    }

    // Estimate gas
    const baseGas = BigInt(21_000);
    const perTxGas = BigInt(50_000);
    const batchOverhead = BigInt(30_000);
    
    const sequentialGas = BigInt(transactions.length) * (baseGas + perTxGas);
    const batchedGas = canBatch ? baseGas + batchOverhead + BigInt(transactions.length) * perTxGas : sequentialGas;
    const savings = sequentialGas - batchedGas;

    return {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      transactions,
      estimatedGas: batchedGas,
      estimatedSavings: savings > BigInt(0) ? savings : BigInt(0),
      canBatch,
      batchType,
    };
  }

  /**
   * Build multicall data for a batch group
   */
  buildMulticallData(group: BatchGroup): { to: Address; data: Hex; value: bigint } {
    const calls = group.transactions.map(tx => ({
      target: tx.to,
      allowFailure: true,
      callData: tx.data,
    }));

    const data = encodeFunctionData({
      abi: MULTICALL3_ABI,
      functionName: 'aggregate3',
      args: [calls],
    });

    const totalValue = group.transactions.reduce(
      (sum, tx) => sum + (tx.value || BigInt(0)),
      BigInt(0)
    );

    return {
      to: this.options.multicallAddress,
      data,
      value: totalValue,
    };
  }

  /**
   * Estimate gas savings for current pending transactions
   */
  estimateSavings(): { totalGas: bigint; batchedGas: bigint; savings: bigint; savingsPercent: number } {
    const groups = this.analyze();
    
    const totalGas = groups.reduce((sum, g) => {
      const baseGas = BigInt(21_000);
      const perTxGas = BigInt(50_000);
      return sum + BigInt(g.transactions.length) * (baseGas + perTxGas);
    }, BigInt(0));

    const batchedGas = groups.reduce((sum, g) => sum + g.estimatedGas, BigInt(0));
    const savings = totalGas - batchedGas;
    const savingsPercent = totalGas > BigInt(0) 
      ? Number((savings * BigInt(100)) / totalGas)
      : 0;

    return { totalGas, batchedGas, savings, savingsPercent };
  }

  /**
   * Set callback for when a batch is ready for execution
   */
  onReady(callback: (batch: BatchGroup) => void): void {
    this.onBatchReady = callback;
  }

  /**
   * Schedule auto-execution after delay
   */
  private scheduleAutoExecute(): void {
    if (this.autoExecuteTimer) {
      clearTimeout(this.autoExecuteTimer);
    }

    this.autoExecuteTimer = setTimeout(() => {
      const groups = this.analyze();
      for (const group of groups) {
        if (this.onBatchReady) {
          this.onBatchReady(group);
        }
      }
    }, this.options.autoExecuteDelay);
  }
}

// ==================== SINGLETON INSTANCE ====================

let batcherInstance: TransactionBatcher | null = null;

export function getTransactionBatcher(options?: BatcherOptions): TransactionBatcher {
  if (!batcherInstance) {
    batcherInstance = new TransactionBatcher(options);
  }
  return batcherInstance;
}

// ==================== REACT HOOK ====================

import { useState, useCallback, useMemo } from 'react';

export function useTransactionBatcher(options?: BatcherOptions) {
  const [pending, setPending] = useState<BatchableTransaction[]>([]);
  const [savings, setSavings] = useState({ totalGas: BigInt(0), batchedGas: BigInt(0), savings: BigInt(0), savingsPercent: 0 });
  
  const batcher = useMemo(() => new TransactionBatcher(options), []);

  const updateState = useCallback(() => {
    setPending(batcher.getPending());
    setSavings(batcher.estimateSavings());
  }, [batcher]);

  const addTransaction = useCallback((tx: Omit<BatchableTransaction, 'id'>) => {
    const id = batcher.add({ ...tx, id: '' });
    updateState();
    return id;
  }, [batcher, updateState]);

  const removeTransaction = useCallback((id: string) => {
    const result = batcher.remove(id);
    updateState();
    return result;
  }, [batcher, updateState]);

  const clearAll = useCallback(() => {
    batcher.clear();
    updateState();
  }, [batcher, updateState]);

  const analyze = useCallback(() => {
    return batcher.analyze();
  }, [batcher]);

  return {
    pending,
    savings,
    addTransaction,
    removeTransaction,
    clearAll,
    analyze,
    buildMulticallData: batcher.buildMulticallData.bind(batcher),
  };
}

export default TransactionBatcher;
