'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useChainId, useSignTypedData } from 'wagmi';
import { isAddress, parseUnits, formatUnits } from 'viem';
import { useToast } from '@/components/ui/toast';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultBalance } from '@/lib/vfide-hooks';
import { safeParseFloat } from '@/lib/validation';
import { devLog } from '@/lib/utils';
import { CONTRACT_ADDRESSES, VFIDETokenABI, UserVaultABI, CARD_BOUND_VAULT_ABI, isCardBoundVaultMode } from '@/lib/contracts';
import { TOKEN_REFERENCE_PRICE } from '@/lib/constants';

export function useVaultOperations() {
  const { showToast } = useToast();
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const cardBoundMode = isCardBoundVaultMode();

  const vaultHub = useVaultHub();
  const { vaultAddress, hasVault } = vaultHub;
  const { balance: vaultBalance, isLoading: isLoadingBalance } = useVaultBalance();
  const usdValue = (safeParseFloat(vaultBalance, 0) * TOKEN_REFERENCE_PRICE).toFixed(2);

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

  // Guardian/NextOfKin form state
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [newNextOfKinAddress, setNewNextOfKinAddress] = useState('');

  const { writeContractAsync } = useWriteContract();

  const { data: walletBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  const walletBalanceFormatted = walletBalance ? formatUnits(walletBalance as bigint, 18) : '0';

  const { data: transferNonce } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'nextNonce',
    query: { enabled: !!vaultAddress && cardBoundMode },
  });

  const { data: walletEpoch } = useReadContract({
    address: vaultAddress || undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'walletEpoch',
    query: { enabled: !!vaultAddress && cardBoundMode },
  });

  const handleDeposit = async () => {
    if (cardBoundMode) {
      showToast('CardBound vaults do not support direct wallet deposits. Use vault-to-vault transfer.', 'error');
      return;
    }
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!vaultAddress) {
      showToast('No vault found. Create a vault first.', 'error');
      return;
    }

    const amountWei = parseUnits(depositAmount, 18);
    setIsDepositing(true);
    setDepositStep('deposit');
    try {
      showToast('Depositing to vault...', 'info');
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.VFIDEToken,
        abi: VFIDETokenABI,
        functionName: 'transfer',
        args: [vaultAddress, amountWei],
      });
      showToast('Deposit successful!', 'success');
      setDepositAmount('');
      setShowDepositModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast('Deposit failed: ' + message.slice(0, 50), 'error');
      } else {
        showToast('Transaction cancelled', 'info');
      }
    } finally {
      setIsDepositing(false);
      setDepositStep('approve');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (!withdrawRecipient || !isAddress(withdrawRecipient)) {
      showToast('Enter a valid recipient address', 'error');
      return;
    }
    if (!vaultAddress) {
      showToast('No vault found', 'error');
      return;
    }

    const amountWei = parseUnits(withdrawAmount, 18);
    setIsWithdrawing(true);
    try {
      if (cardBoundMode) {
        if (transferNonce === undefined || walletEpoch === undefined) {
          showToast('Vault transfer state unavailable. Please retry.', 'error');
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
      } else {
        showToast('Transferring from vault...', 'info');
        await writeContractAsync({
          address: vaultAddress,
          abi: UserVaultABI,
          functionName: 'transferVFIDE',
          args: [withdrawRecipient as `0x${string}`, amountWei],
        });
      }

      showToast(cardBoundMode ? 'Vault transfer successful!' : 'Withdrawal successful!', 'success');
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

  const handleSetNextOfKin = async () => {
    if (!isAddress(newNextOfKinAddress)) {
      showToast('Invalid address format', 'error');
      return;
    }
    try {
      await recovery.setNextOfKinAddress(newNextOfKinAddress as `0x${string}`);
      setNewNextOfKinAddress('');
      showToast('Next of Kin set successfully!', 'success');
    } catch (error) {
      devLog.error('Failed to set Next of Kin:', error);
      showToast('Failed to set Next of Kin', 'error');
    }
  };

  const handleAddGuardian = async () => {
    if (!isAddress(newGuardianAddress)) {
      showToast('Invalid address format', 'error');
      return;
    }
    try {
      await recovery.addGuardian(newGuardianAddress as `0x${string}`);
      setNewGuardianAddress('');
      showToast('Guardian added successfully!', 'success');
    } catch (error) {
      devLog.error('Failed to add guardian:', error);
      showToast('Failed to add guardian', 'error');
    }
  };

  const hasNextOfKin = recovery.nextOfKin && recovery.nextOfKin !== '0x0000000000000000000000000000000000000000';

  return {
    // Identity
    address,
    cardBoundMode,
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
    // Guardian/NextOfKin form
    newGuardianAddress, setNewGuardianAddress,
    newNextOfKinAddress, setNewNextOfKinAddress,
    handleSetNextOfKin,
    handleAddGuardian,
  };
}
