'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';

export function HoweySafeModePanel() {
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const { data: howeyStatus } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'howey_getStatus',
  });

  const contracts = [
    { name: 'DutyDistributor', key: 0, icon: '⚖️', description: 'Governance rewards' },
    { name: 'CouncilSalary', key: 1, icon: '👥', description: 'Council payments' },
    { name: 'CouncilManager', key: 2, icon: '🏛️', description: 'Council management' },
    { name: 'PromotionalTreasury', key: 3, icon: '🎁', description: 'Promotional rewards' },
    { name: 'LiquidityIncentives', key: 4, icon: '💧', description: 'LP staking rewards' },
  ];

  const handleBatchToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'howey_setAllSafeMode',
        args: [enabled],
      });
      alert(`Successfully ${enabled ? 'enabled' : 'disabled'} Howey-safe mode for all contracts!`);
    } catch (error) {
      console.error(error);
      alert('Transaction failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualEnable = async (contractName: string) => {
    setLoading(true);
    try {
      const functionName = `howey_set${contractName}`;
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: functionName as any,
        args: [true],
      });
      alert(`Successfully enabled Howey-safe mode for ${contractName}!`);
    } catch (error) {
      console.error(error);
      alert('Transaction failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const allSafe = howeyStatus && howeyStatus.every((status: boolean) => status);

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">Howey-Safe Mode Enforcement</h2>
        <p className="text-slate-400 mb-6">
          Howey-safe mode is permanently enforced across all ecosystem contracts.
          Once enabled, it cannot be disabled — this ensures VFIDE tokens are not
          classified as securities under the Howey Test.
        </p>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => handleBatchToggle(true)}
            disabled={loading || allSafe}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            🛡️ Enable All (Recommended)
          </button>
        </div>

        {allSafe !== undefined && (
          <div className={`p-4 rounded-lg mb-6 ${allSafe ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{allSafe ? '✅' : '⚠️'}</span>
              <div>
                <div className="text-white font-bold">
                  {allSafe ? 'All Systems Safe' : 'Warning: Not All Safe'}
                </div>
                <div className="text-sm text-slate-300">
                  {allSafe
                    ? 'All contracts have Howey-safe mode enabled. System is compliant.'
                    : 'One or more contracts do not have safe mode enabled. Enable immediately for compliance.'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {contracts.map((contract) => {
            const isEnabled = howeyStatus?.[contract.key];
            return (
              <div
                key={contract.name}
                className={`p-4 rounded-lg border transition-colors ${
                  isEnabled
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{contract.icon}</span>
                    <div>
                      <div className="text-white font-medium">{contract.name}</div>
                      <div className="text-slate-400 text-sm">{contract.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${isEnabled ? 'text-green-400' : 'text-red-400'}`}>
                      {isEnabled ? 'SAFE ✓' : 'UNSAFE ✗'}
                    </span>
                    {!isEnabled && (
                      <button
                        onClick={() => handleIndividualEnable(contract.name)}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">ℹ️ What is Howey-Safe Mode?</h3>
        <p className="text-slate-300 text-sm mb-4">
          Howey-safe mode permanently disables all automatic profit-distribution
          mechanisms in the protocol. Once enabled on a contract, it cannot be
          reversed — this is enforced at the contract level via an immutable
          one-way guard. This ensures VFIDE tokens are not classified as
          securities under the Howey Test.
        </p>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ Governance participation points: Non-transferable badges (no profit from voting)</li>
          <li>✓ Council payments: Employment compensation in stablecoins (not investment returns)</li>
          <li>✓ LP tracking: Participation metrics only (no yield or profit from providing liquidity)</li>
          <li>✓ Promotional allocations: One-time milestone completions, capped and non-recurring</li>
        </ul>
      </div>
    </div>
  );
}
