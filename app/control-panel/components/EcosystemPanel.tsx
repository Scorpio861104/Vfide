'use client';

import { useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ABI, OWNER_CONTROL_PANEL_ADDRESS } from '../config/contracts';
import {
  ConfirmationModal,
  NumberInput,
  TransactionStatus,
} from './SecurityComponents';

export function EcosystemPanel() {
  const [enabled, setEnabled] = useState(false);
  const [merchantTxReward, setMerchantTxReward] = useState(0);
  const [merchantReferralReward, setMerchantReferralReward] = useState(0);
  const [userReferralReward, setUserReferralReward] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { writeContractAsync, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: currentConfig, refetch } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'ecosystem_getAutoWorkPayoutConfig',
  });

  const currentEnabled = currentConfig?.[0] as boolean | undefined;
  const currentMerchantTxReward = currentConfig?.[1] as bigint | undefined;
  const currentMerchantReferralReward = currentConfig?.[2] as bigint | undefined;
  const currentUserReferralReward = currentConfig?.[3] as bigint | undefined;

  const handleConfigure = async () => {
    setShowConfirmation(false);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'ecosystem_configureAutoWorkPayout',
        args: [
          enabled,
          BigInt(merchantTxReward),
          BigInt(merchantReferralReward),
          BigInt(userReferralReward),
        ],
      });

      setTimeout(() => refetch(), 2000);
    } catch (transactionError) {
      console.error('Transaction failed:', transactionError);
    }
  };

  const txStatus = isConfirming ? 'pending' : isSuccess ? 'success' : error ? 'error' : 'idle';

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">🌿 Ecosystem Management</h2>
        <p className="text-slate-400 mb-6">Configure automatic fixed work payouts funded by ecosystem pools.</p>

        {currentConfig && (
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <h3 className="text-white font-bold mb-3">Current Auto Work Payout Configuration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${currentEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {currentEnabled ? 'ENABLED ✓' : 'DISABLED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Tx Reward:</span>
                <span className="text-white font-mono">{currentMerchantTxReward?.toString() ?? '0'} wei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Referral Reward:</span>
                <span className="text-white font-mono">{currentMerchantReferralReward?.toString() ?? '0'} wei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User Referral Reward:</span>
                <span className="text-white font-mono">{currentUserReferralReward?.toString() ?? '0'} wei</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
            <input
              type="checkbox"
              id="autoWorkPayoutEnabled"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="autoWorkPayoutEnabled" className="text-white">
              Enable automatic fixed payouts for verified work events
            </label>
          </div>

          <NumberInput
            label="Merchant Transaction Reward"
            value={merchantTxReward}
            onChange={setMerchantTxReward}
            min={0}
            step={1}
            suffix="wei"
          />

          <NumberInput
            label="Merchant Referral Reward"
            value={merchantReferralReward}
            onChange={setMerchantReferralReward}
            min={0}
            step={1}
            suffix="wei"
          />

          <NumberInput
            label="User Referral Reward"
            value={userReferralReward}
            onChange={setUserReferralReward}
            min={0}
            step={1}
            suffix="wei"
          />

          <button
            onClick={() => setShowConfirmation(true)}
            disabled={isConfirming}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Configure Auto Work Payouts
          </button>
        </div>

        {(hash || error) && (
          <div className="mt-6">
            <TransactionStatus status={txStatus} hash={hash} error={error?.message} />
          </div>
        )}
      </div>

      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">ℹ️ Auto Work Payout Notes</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ Pays fixed amounts only for verified work events.</li>
          <li>✓ Uses merchant and headhunter ecosystem pools as configured in the vault.</li>
          <li>✓ Best-effort behavior: if pool balance is insufficient, event processing continues.</li>
          <li>✓ Set reward values to 0 to skip that event category.</li>
        </ul>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfigure}
        title="Configure Auto Work Payouts"
        message="Are you sure you want to update automatic fixed work payout settings?"
        confirmText="Configure"
        details={[
          { label: 'Enabled', value: enabled ? 'Yes' : 'No' },
          { label: 'Merchant Tx', value: `${merchantTxReward} wei` },
          { label: 'Merchant Referral', value: `${merchantReferralReward} wei` },
          { label: 'User Referral', value: `${userReferralReward} wei` },
        ]}
      />
    </div>
  );
}
