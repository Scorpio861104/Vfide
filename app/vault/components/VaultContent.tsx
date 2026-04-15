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
import { VaultQueueSection } from './VaultQueueSection';
import { DepositModal } from './DepositModal';
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
              usdValue={ops.usdValue}
              guardianCount={ops.guardianCount}
            />

            <VaultQuickActions
              cardBoundMode={ops.cardBoundMode}
              onDeposit={() => ops.setShowDepositModal(true)}
              onWithdraw={() => ops.setShowWithdrawModal(true)}
              onTransfer={() => { ops.setWithdrawRecipient(''); ops.setShowWithdrawModal(true); }}
            />

            <MerchantApprovalPanel
              cardBoundMode={ops.cardBoundMode}
              vaultAddress={ops.vaultAddress}
            />

            <VaultSecuritySection vaultAddress={ops.vaultAddress} />

            <VaultQueueSection
              cardBoundMode={ops.cardBoundMode}
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
              cardBoundMode={ops.cardBoundMode}
              address={ops.address}
              vaultOwner={ops.vaultOwner}
              hasNextOfKin={ops.hasNextOfKin}
              nextOfKin={ops.nextOfKin}
              inheritanceStatus={ops.inheritanceStatus}
              guardianCount={ops.guardianCount}
              isUserGuardian={ops.isUserGuardian}
              isWritePending={ops.isWritePending}
              newNextOfKinAddress={ops.newNextOfKinAddress}
              setNewNextOfKinAddress={ops.setNewNextOfKinAddress}
              handleSetNextOfKin={ops.handleSetNextOfKin}
              newGuardianAddress={ops.newGuardianAddress}
              setNewGuardianAddress={ops.setNewGuardianAddress}
              handleAddGuardian={ops.handleAddGuardian}
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

        <DepositModal
          show={ops.showDepositModal}
          onClose={() => ops.setShowDepositModal(false)}
          walletBalanceFormatted={ops.walletBalanceFormatted}
          depositAmount={ops.depositAmount}
          setDepositAmount={ops.setDepositAmount}
          isDepositing={ops.isDepositing}
          depositStep={ops.depositStep}
          onDeposit={ops.handleDeposit}
        />

        <WithdrawModal
          show={ops.showWithdrawModal}
          onClose={() => ops.setShowWithdrawModal(false)}
          cardBoundMode={ops.cardBoundMode}
          vaultBalance={ops.vaultBalance}
          address={ops.address}
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
