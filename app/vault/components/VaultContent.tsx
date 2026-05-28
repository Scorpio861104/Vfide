'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Footer } from '@/components/layout/Footer';
import { TransactionHistory } from '@/components/vault/TransactionHistory';
import { TrendingUp } from 'lucide-react';

import { useVaultOperations } from './useVaultOperations';
import { useVaultTransactions } from '@/hooks/useVaultTransactions';
import { VaultHeader } from './VaultHeader';
import { VaultOverviewStats } from './VaultOverviewStats';
import { VaultQuickActions } from './VaultQuickActions';
import { MerchantApprovalPanel } from './MerchantApprovalPanel';
import { VaultSecuritySection } from './VaultSecuritySection';
import { VaultRecoveryPanel } from './VaultRecoveryPanel';
import { VaultInheritancePanel } from './VaultInheritancePanel';
import { VaultQueueSection } from './VaultQueueSection';
import { WithdrawModal } from './WithdrawModal';
import { VaultPendingChangesBanner } from '@/components/vault/VaultPendingChangesBanner';
import { VaultGuardianSetupBanner } from '@/components/vault/VaultGuardianSetupBanner';
import { IncomingRefunds } from '@/components/vault/IncomingRefunds';

export function VaultContent() {
  const ops = useVaultOperations();
  const { transactions, isLoading: txLoading } = useVaultTransactions(ops.vaultAddress as `0x${string}` | undefined);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden">
        {/* Ambient Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.07), transparent 65%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-1/4 -left-24 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.06), transparent 65%)', filter: 'blur(80px)' }} />
          <div className="absolute top-1/2 right-0 w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.05), transparent 65%)', filter: 'blur(80px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        <VaultHeader
          address={ops.address}
          hasVault={ops.hasVault}
          isLoadingVault={ops.isLoadingVault}
          createVault={ops.createVault}
          isCreatingVault={ops.isCreatingVault}
          isOnCorrectChain={ops.isOnCorrectChain}
          expectedChainName={ops.expectedChainName}
          refetchVault={ops.refetchVault}
          switchToPreferredChain={ops.switchToPreferredChain}
          isSwitchingChain={ops.isSwitchingChain}
          isContractConfigured={ops.isContractConfigured}
        />

        {ops.hasVault && (
          <>
            <VaultOverviewStats
              vaultBalance={ops.vaultBalance}
              isLoadingBalance={ops.isLoadingBalance}
              guardianCount={ops.guardianCount}
            />

            <VaultPendingChangesBanner vaultAddress={ops.vaultAddress} />

            <VaultGuardianSetupBanner vaultAddress={ops.vaultAddress as `0x${string}` | undefined} />

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

            {/* Incoming refunds — renders null when none pending */}
            <section className="py-2 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <IncomingRefunds />
              </div>
            </section>

            {/* Transaction History */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6" hover={false}>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-accent" size={24} />
                    Transaction History
                  </h2>
                  <TransactionHistory transactions={transactions} loading={txLoading} />
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
