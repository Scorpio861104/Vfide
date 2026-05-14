'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Footer } from '@/components/layout/Footer';
import { TransactionHistory } from '@/components/vault/TransactionHistory';
import { TrendingUp } from 'lucide-react';

import { useVaultOperations } from './useVaultOperations';
import { VaultHeader } from './VaultHeader';
import { VaultOverviewStats } from './VaultOverviewStats';
import { VaultQuickActions } from './VaultQuickActions';
import { MerchantApprovalPanel } from './MerchantApprovalPanel';
import { VaultSecuritySection } from './VaultSecuritySection';
import { VaultRecoveryPanel } from './VaultRecoveryPanel';
import { VaultInheritancePanel } from './VaultInheritancePanel';
import { VaultQueueSection } from './VaultQueueSection';
import { WithdrawModal } from './WithdrawModal';

export function VaultContent() {
  const ops = useVaultOperations();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 relative">
        {/* Ambient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-150 h-150 bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-0 w-125 h-125 bg-cyan-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        </div>

        <VaultHeader
          address={ops.address}
          hasVault={ops.hasVault}
          isLoadingVault={ops.isLoadingVault}
          createVault={ops.createVault}
          isCreatingVault={ops.isCreatingVault}
          isOnCorrectChain={ops.isOnCorrectChain}
          expectedChainName={ops.expectedChainName}
          refetchVault={ops.refetchVault}
        />

        {ops.hasVault && (
          <>
            <VaultOverviewStats
              vaultBalance={ops.vaultBalance}
              isLoadingBalance={ops.isLoadingBalance}
              guardianCount={ops.guardianCount}
            />

            <VaultQuickActions
              onTransfer={() => { ops.setWithdrawRecipient(''); ops.setShowWithdrawModal(true); }}
            />

            <MerchantApprovalPanel
              vaultAddress={ops.vaultAddress}
            />

            <VaultSecuritySection vaultAddress={ops.vaultAddress} />

            <VaultQueueSection
              vaultAddress={ops.vaultAddress}
              queuedWithdrawals={ops.queuedWithdrawals}
              activeQueuedWithdrawals={ops.activeQueuedWithdrawals}
              maxPerTransfer={ops.maxPerTransfer}
              dailyTransferLimit={ops.dailyTransferLimit}
              remainingDailyCapacity={ops.remainingDailyCapacity}
              largeTransferThreshold={ops.largeTransferThreshold}
              pendingQueueActionIndex={ops.pendingQueueActionIndex}
              pendingQueueActionType={ops.pendingQueueActionType}
              spendLimitPerTransfer={ops.spendLimitPerTransfer}
              setSpendLimitPerTransfer={ops.setSpendLimitPerTransfer}
              spendLimitPerDay={ops.spendLimitPerDay}
              setSpendLimitPerDay={ops.setSpendLimitPerDay}
              largeTransferThresholdInput={ops.largeTransferThresholdInput}
              setLargeTransferThresholdInput={ops.setLargeTransferThresholdInput}
              isUpdatingSpendLimits={ops.isUpdatingSpendLimits}
              isUpdatingLargeTransferThreshold={ops.isUpdatingLargeTransferThreshold}
              onExecuteQueuedWithdrawal={ops.handleExecuteQueuedWithdrawal}
              onCancelQueuedWithdrawal={ops.handleCancelQueuedWithdrawal}
              onSetSpendLimits={ops.handleSetSpendLimits}
              onSetLargeTransferThreshold={ops.handleSetLargeTransferThreshold}
            />

            <VaultRecoveryPanel
              guardianCount={ops.guardianCount}
              isUserGuardian={ops.isUserGuardian}
            />

            <VaultInheritancePanel
              vaultAddress={ops.vaultAddress as `0x${string}` | undefined}
              userAddress={ops.address as `0x${string}` | undefined}
            />

            {/* Transaction History */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6" hover={false}>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-cyan-400" size={24} />
                    Transaction History
                  </h2>
                  <TransactionHistory />
                </GlassCard>
              </div>
            </section>
          </>
        )}

        <WithdrawModal
          show={ops.showWithdrawModal}
          onClose={() => ops.setShowWithdrawModal(false)}
          vaultBalance={ops.vaultBalance}
          withdrawAmount={ops.withdrawAmount}
          setWithdrawAmount={ops.setWithdrawAmount}
          withdrawRecipient={ops.withdrawRecipient}
          setWithdrawRecipient={ops.setWithdrawRecipient}
          isWithdrawing={ops.isWithdrawing}
          onWithdraw={ops.handleWithdraw}
        />
      </div>

      <Footer />
    </>
  );
}
