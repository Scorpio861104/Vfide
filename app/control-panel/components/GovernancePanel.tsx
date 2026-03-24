'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ABI, OWNER_CONTROL_PANEL_ADDRESS } from '../config/contracts';
import { AddressInput, NumberInput, TransactionStatus } from './SecurityComponents';

type GuardedAction = 'tokenLockPolicy' | 'autoSwapConfigure' | 'autoWorkPayoutConfigure';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function GovernancePanel() {
  const [selectedAction, setSelectedAction] = useState<GuardedAction>('tokenLockPolicy');

  const [router, setRouter] = useState('');
  const [stablecoin, setStablecoin] = useState('');
  const [autoSwapEnabled, setAutoSwapEnabled] = useState(false);
  const [slippageBps, setSlippageBps] = useState(100);

  const [workEnabled, setWorkEnabled] = useState(false);
  const [merchantTxReward, setMerchantTxReward] = useState(0);
  const [merchantReferralReward, setMerchantReferralReward] = useState(0);
  const [userReferralReward, setUserReferralReward] = useState(0);

  const [currentActionId, setCurrentActionId] = useState<`0x${string}` | null>(null);
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));

  const { writeContractAsync, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: governanceDelay } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'governanceDelay',
  });

  const { data: maxAutoSwapSlippageBps } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'maxAutoSwapSlippageBps',
  });

  const { data: minAutoWorkPayoutWei } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'minAutoWorkPayoutWei',
  });

  const { data: maxAutoWorkPayoutWei } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'maxAutoWorkPayoutWei',
  });

  const txStatus = isConfirming ? 'pending' : isSuccess ? 'success' : error ? 'error' : 'idle';

  const delaySeconds = governanceDelay ? Number(governanceDelay) : 0;
  const actionIdArgs = useMemo(() => {
    if (selectedAction === 'tokenLockPolicy') return [] as const;

    if (selectedAction === 'autoSwapConfigure') {
      return [
        (router || ZERO_ADDRESS) as `0x${string}`,
        (stablecoin || ZERO_ADDRESS) as `0x${string}`,
        autoSwapEnabled,
        slippageBps,
      ] as const;
    }

    return [workEnabled, BigInt(merchantTxReward), BigInt(merchantReferralReward), BigInt(userReferralReward)] as const;
  }, [
    selectedAction,
    router,
    stablecoin,
    autoSwapEnabled,
    slippageBps,
    workEnabled,
    merchantTxReward,
    merchantReferralReward,
    userReferralReward,
  ]);

  const actionFunctionName =
    selectedAction === 'tokenLockPolicy'
      ? 'actionId_token_lockPolicy'
      : selectedAction === 'autoSwapConfigure'
        ? 'actionId_autoSwap_configure'
        : 'actionId_ecosystem_configureAutoWorkPayout';

  const { data: computedActionId } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: actionFunctionName,
    args: actionIdArgs,
  });

  const actionId = (computedActionId as `0x${string}` | undefined) ?? undefined;

  const { data: queuedEta, refetch: refetchEta } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'queuedActionEta',
    args: [actionId || '0x0000000000000000000000000000000000000000000000000000000000000000'],
    query: {
      enabled: !!actionId,
    },
  });

  const queuedEtaNumber = queuedEta ? Number(queuedEta) : 0;
  const isQueued = queuedEtaNumber > 0;
  const waitRemaining = Math.max(0, queuedEtaNumber - nowTs);
  const queueStatusLabel = !isQueued ? 'Not Queued' : waitRemaining > 0 ? 'Waiting' : 'Ready';
  const queueStatusClass =
    !isQueued
      ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
      : waitRemaining > 0
        ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40'
        : 'bg-green-500/20 text-green-200 border-green-500/40';

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleQueue = async () => {
    if (!actionId) return;
    setCurrentActionId(actionId);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'governance_queueAction',
        args: [actionId],
      });
      setTimeout(() => refetchEta(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    }
  };

  const handleCancel = async () => {
    if (!actionId) return;
    setCurrentActionId(actionId);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'governance_cancelAction',
        args: [actionId],
      });
      setTimeout(() => refetchEta(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    }
  };

  const handleExecute = async () => {
    if (!isQueued || waitRemaining > 0) return;

    try {
      if (selectedAction === 'tokenLockPolicy') {
        await writeContractAsync({
          address: OWNER_CONTROL_PANEL_ADDRESS,
          abi: OWNER_CONTROL_PANEL_ABI,
          functionName: 'token_lockPolicy',
          args: [],
        });
      } else if (selectedAction === 'autoSwapConfigure') {
        await writeContractAsync({
          address: OWNER_CONTROL_PANEL_ADDRESS,
          abi: OWNER_CONTROL_PANEL_ABI,
          functionName: 'autoSwap_configure',
          args: [
            (router || ZERO_ADDRESS) as `0x${string}`,
            (stablecoin || ZERO_ADDRESS) as `0x${string}`,
            autoSwapEnabled,
            slippageBps,
          ],
        });
      } else {
        await writeContractAsync({
          address: OWNER_CONTROL_PANEL_ADDRESS,
          abi: OWNER_CONTROL_PANEL_ABI,
          functionName: 'ecosystem_configureAutoWorkPayout',
          args: [
            workEnabled,
            BigInt(merchantTxReward),
            BigInt(merchantReferralReward),
            BigInt(userReferralReward),
          ],
        });
      }

      setTimeout(() => refetchEta(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">⏱️ Governance Queue</h2>
        <p className="text-slate-400 mb-6">
          Queue high-risk actions first, wait for the delay, then execute them from their original panel.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-slate-400 text-sm">Current Governance Delay</div>
            <div className="text-white font-bold text-lg">{delaySeconds} seconds</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-slate-400 text-sm">Max Auto-Swap Slippage</div>
            <div className="text-white font-bold text-lg">{Number(maxAutoSwapSlippageBps || 0)} bps</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-white font-medium">Guarded Action</label>
            <select
              value={selectedAction}
              onChange={(event) => setSelectedAction(event.target.value as GuardedAction)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="tokenLockPolicy">Token: Lock Policy</option>
              <option value="autoSwapConfigure">Auto-Swap: Configure</option>
              <option value="autoWorkPayoutConfigure">Ecosystem: Configure Auto Work Payout</option>
            </select>
          </div>

          {selectedAction === 'autoSwapConfigure' && (
            <>
              <AddressInput label="Router" value={router} onChange={setRouter} required />
              <AddressInput label="Stablecoin" value={stablecoin} onChange={setStablecoin} required />
              <NumberInput
                label="Max Slippage (bps)"
                value={slippageBps}
                onChange={setSlippageBps}
                min={0}
                max={Number(maxAutoSwapSlippageBps || 0)}
                suffix="bps"
              />
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                <input
                  type="checkbox"
                  id="govAutoswapEnabled"
                  checked={autoSwapEnabled}
                  onChange={(event) => setAutoSwapEnabled(event.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="govAutoswapEnabled" className="text-white">Enable auto-swap</label>
              </div>
            </>
          )}

          {selectedAction === 'autoWorkPayoutConfigure' && (
            <>
              <div className="text-slate-300 text-sm bg-black/30 rounded-lg p-3">
                Allowed values: 0 (disable category) or {String(minAutoWorkPayoutWei || 0)} to {String(maxAutoWorkPayoutWei || 0)} wei
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                <input
                  type="checkbox"
                  id="govWorkEnabled"
                  checked={workEnabled}
                  onChange={(event) => setWorkEnabled(event.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="govWorkEnabled" className="text-white">Enable auto work payouts</label>
              </div>
              <NumberInput
                label="Merchant Tx Reward"
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
            </>
          )}

          <div className="bg-black/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-slate-400 text-sm">Computed Action ID</div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${queueStatusClass}`}>
                {queueStatusLabel}
              </span>
            </div>
            <div className="text-white font-mono text-xs break-all">{actionId || 'N/A'}</div>
            {isQueued && (
              <div className="text-sm text-yellow-300">
                Queued for {new Date(queuedEtaNumber * 1000).toLocaleString()} ({waitRemaining}s remaining)
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleQueue}
              disabled={!actionId || isConfirming}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Queue Action
            </button>
            <button
              onClick={handleCancel}
              disabled={!actionId || !isQueued || isConfirming}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel Queue
            </button>
            <button
              onClick={handleExecute}
              disabled={!actionId || !isQueued || waitRemaining > 0 || isConfirming}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {waitRemaining > 0 ? `Execute in ${waitRemaining}s` : 'Execute Now'}
            </button>
          </div>
        </div>

        {(hash || error) && (
          <div className="mt-6">
            <TransactionStatus status={txStatus} hash={hash} error={error?.message} />
          </div>
        )}
      </div>

      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">How to Execute</h3>
        <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
          <li>Select the target action and enter exact parameters.</li>
          <li>Click Queue Action and wait for the full delay.</li>
          <li>Click Execute Now in this tab (or execute from the matching action panel).</li>
          <li>If needed, cancel the queue before execution.</li>
        </ol>
        {currentActionId && (
          <p className="text-slate-400 text-xs mt-4 break-all">Last queued/cancelled actionId: {currentActionId}</p>
        )}
      </div>
    </div>
  );
}
