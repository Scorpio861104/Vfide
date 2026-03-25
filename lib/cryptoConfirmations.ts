/**
 * Transaction confirmation utilities
 * Wait for blockchain confirmations before marking as confirmed
 */

export interface ConfirmationStatus {
  confirmed: boolean;
  confirmations: number;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  status: 'pending' | 'confirmed' | 'failed';
  error?: string;
}

const REQUIRED_CONFIRMATIONS = 2; // Wait for 2 block confirmations
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_WAIT_TIME = 5 * 60 * 1000; // Maximum 5 minutes wait

/**
 * Wait for transaction confirmation on blockchain
 */
export async function waitForConfirmation(
  txHash: string,
  requiredConfirmations: number = REQUIRED_CONFIRMATIONS
): Promise<ConfirmationStatus> {
  const startTime = Date.now();
  
  try {
    while (Date.now() - startTime < MAX_WAIT_TIME) {
      // Get transaction receipt
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      // If receipt doesn't exist yet, transaction is still pending
      if (!receipt) {
        await sleep(POLL_INTERVAL);
        continue;
      }

      // Check if transaction failed
      if (receipt.status === '0x0') {
        const blockNum = parseInt(receipt.blockNumber, 16);
        if (isNaN(blockNum) || !isFinite(blockNum)) {
          throw new Error('Invalid block number in receipt');
        }
        
        return {
          confirmed: false,
          confirmations: 0,
          blockNumber: blockNum,
          blockHash: receipt.blockHash,
          status: 'failed',
          error: 'Transaction reverted or failed',
        };
      }

      // Get current block number
      const currentBlock = await window.ethereum.request({
        method: 'eth_blockNumber',
        params: [],
      });

      const txBlockNumber = parseInt(receipt.blockNumber, 16);
      const currentBlockNumber = parseInt(currentBlock, 16);
      
      if (isNaN(txBlockNumber) || isNaN(currentBlockNumber) || 
          !isFinite(txBlockNumber) || !isFinite(currentBlockNumber)) {
        throw new Error('Invalid block numbers from provider');
      }
      
      const confirmations = currentBlockNumber - txBlockNumber + 1;

      // Check if we have enough confirmations
      if (confirmations >= requiredConfirmations) {
        return {
          confirmed: true,
          confirmations,
          blockNumber: txBlockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice,
          status: 'confirmed',
        };
      }

      // Not enough confirmations yet, keep waiting
      await sleep(POLL_INTERVAL);
    }

    // Timeout reached
    return {
      confirmed: false,
      confirmations: 0,
      status: 'pending',
      error: 'Confirmation timeout - transaction may still be pending',
    };
  } catch (error) {
    logger.error('Failed to wait for confirmation:', error);
    return {
      confirmed: false,
      confirmations: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get transaction status without waiting
 */
export async function getTransactionStatus(txHash: string): Promise<ConfirmationStatus> {
  try {
    const receipt = await window.ethereum.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });

    if (!receipt) {
      return {
        confirmed: false,
        confirmations: 0,
        status: 'pending',
      };
    }

    if (receipt.status === '0x0') {
      const blockNum = parseInt(receipt.blockNumber, 16);
      if (isNaN(blockNum) || !isFinite(blockNum)) {
        throw new Error('Invalid block number in receipt');
      }
      
      return {
        confirmed: false,
        confirmations: 0,
        blockNumber: blockNum,
        blockHash: receipt.blockHash,
        status: 'failed',
        error: 'Transaction failed',
      };
    }

    const currentBlock = await window.ethereum.request({
      method: 'eth_blockNumber',
      params: [],
    });

    const txBlockNumber = parseInt(receipt.blockNumber, 16);
    const currentBlockNumber = parseInt(currentBlock, 16);
    
    if (isNaN(txBlockNumber) || isNaN(currentBlockNumber) || 
        !isFinite(txBlockNumber) || !isFinite(currentBlockNumber)) {
      throw new Error('Invalid block numbers from provider');
    }
    
    const confirmations = currentBlockNumber - txBlockNumber + 1;

    return {
      confirmed: confirmations >= REQUIRED_CONFIRMATIONS,
      confirmations,
      blockNumber: txBlockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'pending',
    };
  } catch (error) {
    logger.error('Failed to get transaction status:', error);
    return {
      confirmed: false,
      confirmations: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Watch transaction for real-time updates
 */
export function watchTransaction(
  txHash: string,
  onUpdate: (status: ConfirmationStatus) => void,
  onComplete: (status: ConfirmationStatus) => void
): () => void {
  let cancelled = false;

  const poll = async () => {
    while (!cancelled) {
      const status = await getTransactionStatus(txHash);
      onUpdate(status);

      if (status.confirmed || status.status === 'failed') {
        onComplete(status);
        break;
      }

      await sleep(POLL_INTERVAL);
    }
  };

  poll();

  // Return cancel function
  return () => {
    cancelled = true;
  };
}

/**
 * Wait for multiple transactions to confirm
 */
export async function waitForMultipleConfirmations(
  txHashes: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<ConfirmationStatus[]> {
  const results: ConfirmationStatus[] = [];
  let completed = 0;

  for (const txHash of txHashes) {
    const status = await waitForConfirmation(txHash);
    results.push(status);
    completed++;
    
    if (onProgress) {
      onProgress(completed, txHashes.length);
    }
  }

  return results;
}

/**
 * Check if transaction is still pending
 */
export async function isTransactionPending(txHash: string): Promise<boolean> {
  try {
    const tx = await window.ethereum.request({
      method: 'eth_getTransactionByHash',
      params: [txHash],
    });

    if (!tx) {
      return false; // Transaction not found
    }

    const receipt = await window.ethereum.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    });

    return !receipt; // Pending if no receipt yet
  } catch (error) {
    logger.error('Failed to check if transaction pending:', error);
    return false;
  }
}

/**
 * Estimate confirmation time based on network conditions
 */
export async function estimateConfirmationTime(): Promise<{
  seconds: number;
  blocks: number;
  fast: number;
  average: number;
  slow: number;
}> {
  try {
    // Get average block time (in practice, query from API like Etherscan)
    // For Ethereum mainnet, average is ~12 seconds
    // For testnets, can be faster
    const averageBlockTime = 12; // seconds

    return {
      seconds: REQUIRED_CONFIRMATIONS * averageBlockTime,
      blocks: REQUIRED_CONFIRMATIONS,
      fast: 1 * averageBlockTime,
      average: 2 * averageBlockTime,
      slow: 6 * averageBlockTime,
    };
  } catch (_error) {
    // Default estimates
    return {
      seconds: 24,
      blocks: 2,
      fast: 12,
      average: 24,
      slow: 72,
    };
  }
}

/**
 * Format confirmation status for display
 */
export function formatConfirmationStatus(status: ConfirmationStatus): string {
  if (status.status === 'failed') {
    return `Failed: ${status.error || 'Transaction reverted'}`;
  }

  if (status.status === 'pending') {
    if (status.confirmations === 0) {
      return 'Waiting for first confirmation...';
    }
    return `${status.confirmations}/${REQUIRED_CONFIRMATIONS} confirmations`;
  }

  if (status.confirmed) {
    return `Confirmed (${status.confirmations} blocks)`;
  }

  return 'Unknown status';
}

/**
 * Get block explorer URL for transaction
 */
export function getTransactionUrl(txHash: string, network: string = 'mainnet'): string {
  const explorers: Record<string, string> = {
    mainnet: 'https://etherscan.io',
    goerli: 'https://goerli.etherscan.io',
    sepolia: 'https://sepolia.etherscan.io',
    polygon: 'https://polygonscan.com',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
  };

  const baseUrl = explorers[network] || explorers.mainnet;
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Helper: Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * React hook for watching transaction confirmations
 */
export function useTransactionConfirmation(txHash: string | null) {
  const [status, setStatus] = React.useState<ConfirmationStatus | null>(null);
  const [isWatching, setIsWatching] = React.useState(false);

  React.useEffect(() => {
    if (!txHash) {
      setStatus(null);
      setIsWatching(false);
      return;
    }

    setIsWatching(true);

    const cancel = watchTransaction(
      txHash,
      (update) => setStatus(update),
      (final) => {
        setStatus(final);
        setIsWatching(false);
      }
    );

    return cancel;
  }, [txHash]);

  return { status, isWatching };
}

// For non-React contexts
import * as React from 'react';
import { logger } from '@/lib/logger';
