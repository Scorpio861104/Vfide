'use client';

import { useMemo, useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useChainId, useSignTypedData } from 'wagmi';
import { isAddress, parseUnits, formatUnits } from 'viem';
import { useToast } from '@/components/ui/toast';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultBalance } from '@/lib/vfide-hooks';
import { safeParseFloat } from '@/lib/validation';
import { devLog } from '@/lib/utils';
import { CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, VAULT_HUB_ABI, VFIDETokenABI, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';

export interface QueuedWithdrawal {
  index: bigint;
  amount: bigint;
  executeAfter: bigint;
}

export function useVaultOperations() {
  const { showToast } = useToast();
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const isVfideTokenAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken);
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);

  const vaultHub = useVaultHub();
  const { vaultAddress } = vaultHub;
  const hasVaultAddress = !!vaultAddress && isAddress(vaultAddress) && vaultAddress !== ZERO_ADDRESS;
  const { balance: vaultBalance, isLoading: isLoadingBalance } = useVaultBalance();
  const usdValue = '0.00'; // requires live price feed

  const recovery = useVaultRecovery(vaultAddress);

  // Deposit/Withdraw state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositStep, setDepositStep] = useState<'approve' | 'deposit'>('approve');
  const [pendingQueueActionIndex, setPendingQueueActionIndex] = useState<bigint | null>(null);
  const [pendingQueueActionType, setPendingQueueActionType] = useState<'execute' | 'cancel' | null>(null);
  const [spendLimitPerTransfer, setSpendLimitPerTransfer] = useState('');
  const [spendLimitPerDay, setSpendLimitPerDay] = useState('');
  const [largeTransferThresholdInput, setLargeTransferThresholdInput] = useState('');
  const [isUpdatingSpendLimits, setIsUpdatingSpendLimits] = useState(false);
  const [isUpdatingLargeTransferThreshold, setIsUpdatingLargeTransferThreshold] = useState(false);

  // Guardian/NextOfKin form state
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [newNextOfKinAddress, setNewNextOfKinAddress] = useState('');

  const { writeContractAsync } = useWriteContract();

  const { data: walletBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isVfideTokenAvailable },
  });
  const walletBalanceFormatted = walletBalance ? formatUnits(walletBalance as bigint, 18) : '0';

  const { data: transferNonce } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'nextNonce',
    query: { enabled: hasVaultAddress },
  });

  const { data: walletEpoch } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'walletEpoch',
    query: { enabled: hasVaultAddress },
  });

  const { data: isDestinationVault } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'isVault',
    args: withdrawRecipient && isAddress(withdrawRecipient) ? [withdrawRecipient as `0x${string}`] : undefined,
    query: { enabled: isVaultHubAvailable && !!withdrawRecipient && isAddress(withdrawRecipient) },
  });

  const { data: pendingQueuedWithdrawalData, refetch: refetchPendingQueuedWithdrawals } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'getPendingQueuedWithdrawals',
    query: { enabled: hasVaultAddress },
  });

  const { data: activeQueuedWithdrawals } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'activeQueuedWithdrawals',
    query: { enabled: hasVaultAddress },
  });

  const { data: dailyTransferLimit } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'dailyTransferLimit',
    query: { enabled: hasVaultAddress },
  });

  const { data: maxPerTransfer } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'maxPerTransfer',
    query: { enabled: hasVaultAddress },
  });

  const { data: largeTransferThreshold } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'largeTransferThreshold',
    query: { enabled: hasVaultAddress },
  });

  const { data: remainingDailyCapacity, refetch: refetchRemainingDailyCapacity } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'viewRemainingDailyCapacity',
    query: { enabled: hasVaultAddress },
  });

  const queuedWithdrawals = useMemo<QueuedWithdrawal[]>(() => {
    if (!pendingQueuedWithdrawalData) {
      return [];
    }

    const [indices = [], amounts = [], executeAfters = []] = pendingQueuedWithdrawalData as readonly [bigint[], bigint[], bigint[]];

    return indices.map((index, position) => ({
      index,
      amount: amounts[position] ?? 0n,
      executeAfter: executeAfters[position] ?? 0n,
    }));
  }, [pendingQueuedWithdrawalData]);

  const handleDeposit = async () => {
    showToast('Vault-only mode disables direct wallet deposits here. Use vault-to-vault transfer.', 'error');
    return;
  };

  const handleWithdraw = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!withdrawRecipient || !isAddress(withdrawRecipient)) {
      showToast('Enter a valid destination vault address', 'error');
      return;
    }
    if (!hasVaultAddress) {
      showToast('No vault found', 'error');
      return;
    }
    if (!isVaultHubAvailable) {
      showToast('Vault hub contract is not configured.', 'error');
      return;
    }

    const amountWei = parseUnits(withdrawAmount, 18);
    setIsWithdrawing(true);
    try {
      if (transferNonce === undefined || walletEpoch === undefined) {
        showToast('Vault transfer state unavailable. Please retry.', 'error');
        return;
      }
      if (!isDestinationVault) {
        showToast('Destination must be a registered vault address.', 'error');
        return;
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const transferChainId = BigInt(chainId);

      const signature = await signTypedDataAsync({
        domain: {
          name: 'CardBoundVault',
          version: '1',
          chainId,
          verifyingContract: vaultAddress,
        },
        types: {
          TransferIntent: [
            { name: 'vault', type: 'address' },
            { name: 'toVault', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'walletEpoch', type: 'uint64' },
            { name: 'deadline', type: 'uint64' },
            { name: 'chainId', type: 'uint256' },
          ],
        },
        primaryType: 'TransferIntent',
        message: {
          vault: vaultAddress,
          toVault: withdrawRecipient as `0x${string}`,
          amount: amountWei,
          nonce: transferNonce as bigint,
          walletEpoch: walletEpoch as bigint,
          deadline,
          chainId: transferChainId,
        },
      });

      showToast('Signing and sending vault-to-vault transfer...', 'info');
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'executeVaultToVaultTransfer',
        args: [
          {
            vault: vaultAddress,
            toVault: withdrawRecipient as `0x${string}`,
            amount: amountWei,
            nonce: transferNonce as bigint,
            walletEpoch: walletEpoch as bigint,
            deadline,
            chainId: transferChainId,
          },
          signature,
        ],
      });

      showToast('Vault transfer successful!', 'success');
      setWithdrawAmount('');
      setWithdrawRecipient('');
      setShowWithdrawModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('cooldown')) {
        showToast('Withdrawal cooldown active. Please wait 24 hours.', 'error');
      } else if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Withdrawal failed: ' + message.slice(0, 50), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setIsWithdrawing(false);
    }
  };

  const refreshQueuedWithdrawals = async () => {
    await Promise.all([
      refetchPendingQueuedWithdrawals(),
      refetchRemainingDailyCapacity(),
    ]);
  };

  const handleSetSpendLimits = async () => {
    if (!hasVaultAddress) {
      return;
    }

    const maxTransferValue = safeParseFloat(spendLimitPerTransfer, 0);
    const dailyLimitValue = safeParseFloat(spendLimitPerDay, 0);

    if (maxTransferValue <= 0 || dailyLimitValue <= 0) {
      showToast('Enter valid positive spend limits.', 'error');
      return;
    }

    if (maxTransferValue > dailyLimitValue) {
      showToast('Per-transfer limit cannot exceed daily limit.', 'error');
      return;
    }

    setIsUpdatingSpendLimits(true);
    try {
      showToast('Updating spend limits...', 'info');
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setSpendLimits',
        args: [parseUnits(spendLimitPerTransfer, 18), parseUnits(spendLimitPerDay, 18)],
      });
      showToast('Spend limits updated.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Failed to update spend limits: ' + message.slice(0, 60), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setIsUpdatingSpendLimits(false);
    }
  };

  const handleSetLargeTransferThreshold = async () => {
    if (!hasVaultAddress) {
      return;
    }

    const thresholdValue = safeParseFloat(largeTransferThresholdInput, -1);
    if (thresholdValue < 0) {
      showToast('Enter a valid large-transfer threshold.', 'error');
      return;
    }

    setIsUpdatingLargeTransferThreshold(true);
    try {
      showToast('Updating queue threshold...', 'info');
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setLargeTransferThreshold',
        args: [parseUnits(largeTransferThresholdInput || '0', 18)],
      });
      showToast('Queue threshold updated.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Failed to update queue threshold: ' + message.slice(0, 60), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setIsUpdatingLargeTransferThreshold(false);
    }
  };

  const handleExecuteQueuedWithdrawal = async (queueIndex: bigint) => {
    if (!hasVaultAddress) {
      return;
    }

    setPendingQueueActionIndex(queueIndex);
    setPendingQueueActionType('execute');
    try {
      showToast('Executing queued withdrawal...', 'info');
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'executeQueuedWithdrawal',
        args: [queueIndex],
      });
      await refreshQueuedWithdrawals();
      showToast('Queued withdrawal executed.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Queued withdrawal execution failed: ' + message.slice(0, 60), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setPendingQueueActionIndex(null);
      setPendingQueueActionType(null);
    }
  };

  const handleCancelQueuedWithdrawal = async (queueIndex: bigint) => {
    if (!hasVaultAddress) {
      return;
    }

    setPendingQueueActionIndex(queueIndex);
    setPendingQueueActionType('cancel');
    try {
      showToast('Cancelling queued withdrawal...', 'info');
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'cancelQueuedWithdrawal',
        args: [queueIndex],
      });
      await refreshQueuedWithdrawals();
      showToast('Queued withdrawal cancelled.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Queued withdrawal cancellation failed: ' + message.slice(0, 60), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setPendingQueueActionIndex(null);
      setPendingQueueActionType(null);
    }
  };

  const handleSetNextOfKin = async () => {
    showToast('Next of Kin is not available in vault-only mode.', 'error');
    return;
  };

  const handleAddGuardian = async () => {
    showToast('Manage vault guardians from the Guardians dashboard.', 'error');
    return;
  };

  const hasNextOfKin = false;

  return {
    // Identity
    address,
    cardBoundMode: true,
    // Vault hub
    ...vaultHub,
    // Balances
    vaultBalance,
    isLoadingBalance,
    usdValue,
    walletBalanceFormatted,
    // Recovery
    ...recovery,
    hasNextOfKin,
    // Deposit state + handler
    showDepositModal, setShowDepositModal,
    depositAmount, setDepositAmount,
    isDepositing, depositStep,
    handleDeposit,
    // Withdraw state + handler
    showWithdrawModal, setShowWithdrawModal,
    withdrawAmount, setWithdrawAmount,
    withdrawRecipient, setWithdrawRecipient,
    isWithdrawing,
    handleWithdraw,
    queuedWithdrawals,
    activeQueuedWithdrawals: Number(activeQueuedWithdrawals ?? 0),
    maxPerTransfer: (maxPerTransfer as bigint | undefined) ?? 0n,
    dailyTransferLimit: (dailyTransferLimit as bigint | undefined) ?? 0n,
    remainingDailyCapacity: (remainingDailyCapacity as bigint | undefined) ?? 0n,
    largeTransferThreshold: (largeTransferThreshold as bigint | undefined) ?? 0n,
    pendingQueueActionIndex,
    pendingQueueActionType,
    spendLimitPerTransfer,
    setSpendLimitPerTransfer,
    spendLimitPerDay,
    setSpendLimitPerDay,
    largeTransferThresholdInput,
    setLargeTransferThresholdInput,
    isUpdatingSpendLimits,
    isUpdatingLargeTransferThreshold,
    handleExecuteQueuedWithdrawal,
    handleCancelQueuedWithdrawal,
    handleSetSpendLimits,
    handleSetLargeTransferThreshold,
    // Guardian/NextOfKin form
    newGuardianAddress, setNewGuardianAddress,
    newNextOfKinAddress, setNewNextOfKinAddress,
    handleSetNextOfKin,
    handleAddGuardian,
  };
}
