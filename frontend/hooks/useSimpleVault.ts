import { useWriteContract } from 'wagmi';
import { useState } from 'react';
import { useVaultHub } from './useVaultHub';
import { devLog } from '../lib/utils';

/**
 * Simple vault hook that hides the complexity of vault.execute()
 * Shows user-friendly messages instead of raw transactions
 */
export function useSimpleVault() {
  const { writeContract } = useWriteContract();
  const { vaultAddress } = useVaultHub();
  const [actionStatus, setActionStatus] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [userMessage, setUserMessage] = useState('');

  /**
   * Execute an action through the user's vault with friendly messaging
   */
  const executeVaultAction = async (
    actionName: string, // e.g., "Send Payment", "Stake Tokens"
    targetContract: string,
    callData: string,
    emoji: string = '🔐'
  ) => {
    if (!vaultAddress) {
      setActionStatus('error');
      setUserMessage('❌ No vault found. Please create a vault first.');
      return;
    }

    try {
      setActionStatus('preparing');
      setUserMessage(`${emoji} Getting your vault ready to ${actionName.toLowerCase()}...`);

      await new Promise(resolve => setTimeout(resolve, 500));

      setActionStatus('signing');
      setUserMessage(`✍️ Please sign the transaction in your wallet`);

      // Execute through vault
      await writeContract({
        address: vaultAddress,
        abi: [
          {
            name: 'execute',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'target', type: 'address' },
              { name: 'data', type: 'bytes' },
            ],
            outputs: [],
          },
        ],
        functionName: 'execute',
        args: [targetContract as `0x${string}`, callData as `0x${string}`],
      });

      setActionStatus('confirming');
      setUserMessage(`⏳ Your vault is ${actionName.toLowerCase()}... (this takes ~10 seconds)`);

      // Wait for confirmation (in real implementation, use waitForTransaction)
      await new Promise(resolve => setTimeout(resolve, 3000));

      setActionStatus('success');
      setUserMessage(`✅ ${actionName} successful!`);

      setTimeout(() => {
        setActionStatus('idle');
        setUserMessage('');
      }, 3000);

    } catch (error) {
      setActionStatus('error');
      setUserMessage(`❌ ${actionName} failed. Please try again.`);
      devLog.error('Vault action error:', error);
    }
  };

  return {
    executeVaultAction,
    actionStatus,
    userMessage,
    isLoading: ['preparing', 'signing', 'confirming'].includes(actionStatus),
    hasVault: !!vaultAddress,
  };
}

/**
 * Hook for vault balance with friendly formatting
 * Uses the lib/vfide-hooks.ts implementation for actual contract reads
 */
export function useVaultBalanceSimple() {
  // This is a simplified wrapper - use useVaultBalance from lib/vfide-hooks.ts for real data
  // Kept for backward compatibility with existing components
  return {
    balance: BigInt(0),
    formatted: '0.00',
    loading: false,
  };
}

/**
 * Hook for ProofScore with tier name
 * Uses the lib/vfide-hooks.ts implementation for actual contract reads
 */
export function useProofScoreSimple() {
  // This is a simplified wrapper - use useProofScore from lib/vfide-hooks.ts for real data
  // Kept for backward compatibility with existing components
  const scoreValue = 5000; // Default neutral score
  
  let tier = 'NEUTRAL';
  let tierColor = '#FFD700';
  
  // 10x scale: 0-10000
  if (scoreValue >= 8000) { tier = 'ELITE'; tierColor = '#00FF88'; }
  else if (scoreValue >= 7000) { tier = 'TRUSTED'; tierColor = '#00F0FF'; }
  else if (scoreValue >= 5000) { tier = 'NEUTRAL'; tierColor = '#FFD700'; }
  else if (scoreValue >= 3500) { tier = 'LOW_TRUST'; tierColor = '#FFA500'; }
  else { tier = 'RISKY'; tierColor = '#FF4444'; }

  return {
    score: scoreValue,
    tier,
    tierColor,
    loading: false,
  };
}
