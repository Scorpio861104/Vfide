import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { useState } from 'react';

/**
 * Simple vault hook that hides the complexity of vault.execute()
 * Shows user-friendly messages instead of raw transactions
 */
export function useSimpleVault() {
  const { writeContract } = useWriteContract();
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
    try {
      setActionStatus('preparing');
      setUserMessage(`${emoji} Getting your vault ready to ${actionName.toLowerCase()}...`);

      // User's vault address from VaultFactory contract
      const vaultAddress = '0x...'; // Resolved via VaultHub.vaultOf()

      await new Promise(resolve => setTimeout(resolve, 500));

      setActionStatus('signing');
      setUserMessage(`✍️ Please sign the transaction in your wallet`);

      // Execute through vault
      await writeContract({
        address: vaultAddress as `0x${string}`,
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
      console.error(error);
    }
  };

  return {
    executeVaultAction,
    actionStatus,
    userMessage,
    isLoading: ['preparing', 'signing', 'confirming'].includes(actionStatus),
  };
}

/**
 * Hook for vault balance with friendly formatting
 */
export function useVaultBalance() {
  const { address } = useAccount();

  // Read from VaultHub or user's vault
  const { data: balance } = useReadContract({
    address: '0x...', // VaultFactory or user's vault
    abi: [],
    functionName: 'getBalance',
    args: [address],
  });

  return {
    balance: balance || BigInt(0),
    formatted: '0.00', // Format with formatUnits
    loading: false,
  };
}

/**
 * Hook for ProofScore with tier name
 */
export function useProofScore() {
  const { address } = useAccount();

  // Read from VFIDETrust (Seer) contract
  const { data: score } = useReadContract({
    address: '0x...', // VFIDETrust address
    abi: [],
    functionName: 'getScore',
    args: [address],
  });

  const scoreValue = Number(score || 0);
  
  let tier = 'NEW';
  if (scoreValue >= 850) tier = 'LEGENDARY';
  else if (scoreValue >= 700) tier = 'ELITE';
  else if (scoreValue >= 500) tier = 'TRUSTED';
  else if (scoreValue >= 300) tier = 'NEW';

  let tierColor = '#A0A0A5';
  if (tier === 'LEGENDARY') tierColor = '#FFD700';
  else if (tier === 'ELITE') tierColor = '#FF10F0';
  else if (tier === 'TRUSTED') tierColor = '#00F0FF';
  else if (tier === 'NEW') tierColor = '#50C878';

  return {
    score: scoreValue,
    tier,
    tierColor,
    loading: false,
  };
}
