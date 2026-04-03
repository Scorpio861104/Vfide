'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function useRiskAnalysis(tx: TransactionDetails, allowlistedRecipients: string[] = []): RiskWarning[] {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  return useMemo(() => {
    const warnings: RiskWarning[] = [];

    // Check if sending to new address
    if (tx.to) {
      const allowlisted = allowlistedRecipients.map((a) => a.toLowerCase()).includes(tx.to.toLowerCase());
      if (!allowlisted) {
        warnings.push({
          level: 'high',
          title: 'Recipient not in allowlist',
          description: 'The recipient is not in your trusted allowlist.',
          recommendation: 'Confirm destination address out-of-band before signing.',
        });
      }

      // In production, check address history
      warnings.push({
        level: 'low',
        title: 'First interaction',
        description: 'This is your first transaction to this address.',
        recommendation: 'Double-check the address is correct.',
      });
    }

    // Check value
    if (tx.value && tx.value > BigInt(0)) {
      const valueInEth = parseFloat(formatEther(tx.value));
      
      if (valueInEth > 1) {
        warnings.push({
          level: 'medium',
          title: 'Large transaction',
          description: `You are sending ${valueInEth.toFixed(4)} ETH.`,
          recommendation: 'Verify the amount is correct before confirming.',
        });
      }

      if (valueInEth > 10) {
        warnings.push({
          level: 'high',
          title: 'Very large transaction',
          description: `You are sending ${valueInEth.toFixed(4)} ETH.`,
          recommendation: 'Consider sending a small test transaction first.',
        });
      }
    }

    // Check contract interaction
    if (tx.data && tx.data !== '0x') {
      const selector = tx.data.slice(0, 10).toLowerCase();
      if (selector === '0x095ea7b3') {
        warnings.push({
          level: 'critical',
          title: 'Token approval detected',
          description: 'This can grant spending permission to another contract.',
          recommendation: 'Use limited allowance and verify spender contract.',
        });
      }

      warnings.push({
        level: 'low',
        title: 'Contract interaction',
        description: 'This transaction interacts with a smart contract.',
        recommendation: 'Make sure you trust this contract.',
      });
    }

    // Check balance sufficiency
    if (balance && tx.value) {
      const totalCost = tx.value + (tx.gasLimit || BigInt(21000)) * (tx.maxFeePerGas || BigInt(0));
      if (totalCost > balance.value) {
        warnings.push({
          level: 'critical',
          title: 'Insufficient balance',
          description: 'You do not have enough funds to complete this transaction.',
        });
      }
    }

    return warnings;
  }, [tx, balance, allowlistedRecipients]);
}
