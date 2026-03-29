'use client';

import { useState } from 'react';
import { isAddress } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';
import {
  AddressInput,
  ConfirmationModal,
  TransactionStatus,
} from './SecurityComponents';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function ProductionSetupPanel() {
  const [showSafeDefaultsConfirm, setShowSafeDefaultsConfirm] = useState(false);
  const [showAutoSwapConfirm, setShowAutoSwapConfirm] = useState(false);
  const [dexRouter, setDexRouter] = useState('');
  const [usdc, setUsdc] = useState('');
  const [loading, setLoading] = useState(false);

  const { writeContractAsync, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read current system status
  const { data: systemStatus } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'system_getStatus',
  });

  const handleSafeDefaults = async () => {
    if (OWNER_CONTROL_PANEL_ADDRESS === ZERO_ADDRESS) {
      setLoading(false);
      return;
    }
    setShowSafeDefaultsConfirm(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'production_setupSafeDefaults',
      });
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSwapSetup = async () => {
    if (OWNER_CONTROL_PANEL_ADDRESS === ZERO_ADDRESS) {
      setLoading(false);
      return;
    }
    if (!isAddress(dexRouter) || dexRouter.toLowerCase() === ZERO_ADDRESS) {
      return;
    }
    if (!isAddress(usdc) || usdc.toLowerCase() === ZERO_ADDRESS) {
      return;
    }
    setShowAutoSwapConfirm(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'production_setupWithAutoSwap',
        args: [dexRouter as `0x${string}`, usdc as `0x${string}`],
      });
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const txStatus = isConfirming ? 'pending' : isSuccess ? 'success' : error ? 'error' : 'idle';
  const _isConfigured = systemStatus && systemStatus[0]; // Check if Howey-safe mode is enabled

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">⚡ Quick Production Setup</h2>
        <p className="text-slate-400 mb-6">
          One-click production deployment with recommended configurations.
          Choose between safe defaults or full-featured setup with auto-swap.
        </p>

        {/* Current Status */}
        {systemStatus && (
          <div className={`p-4 rounded-lg mb-6 ${
            systemStatus[0] 
              ? 'bg-green-500/20 border border-green-500/50' 
              : 'bg-yellow-500/20 border border-yellow-500/50'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{systemStatus[0] ? '✅' : '⚠️'}</span>
              <div>
                <div className="text-white font-bold">
                  {systemStatus[0] ? 'Production Configuration Detected' : 'Not Yet Configured'}
                </div>
                <div className="text-sm text-slate-300">
                  {systemStatus[5] as string}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Safe Defaults */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-white mb-3">Safe Defaults</h3>
            <p className="text-slate-400 text-sm mb-4">
              Most secure configuration for production deployment.
            </p>
            
            <div className="space-y-2 text-sm mb-6">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>All compliance rules enforced on-chain</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Auto-swap disabled (conservative)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Maximum security posture</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Recommended for initial launch</span>
              </div>
            </div>

            <button
              onClick={() => setShowSafeDefaultsConfirm(true)}
              disabled={loading || isConfirming}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Deploy Safe Defaults
            </button>
          </div>

          {/* With Auto-Swap */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-white mb-3">With Auto-Swap</h3>
            <p className="text-slate-400 text-sm mb-4">
              Full-featured setup with auto-conversion to stablecoins for council payments.
            </p>
            
            <div className="space-y-2 text-sm mb-6">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>All compliance rules enforced on-chain</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Auto-swap enabled (1% slippage)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-green-400">✓</span>
                <span>Council salaries paid in stablecoins</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-blue-400">ℹ️</span>
                <span>Requires DEX liquidity</span>
              </div>
            </div>

            <div className="space-y-3">
              <AddressInput
                label="DEX Router"
                value={dexRouter}
                onChange={setDexRouter}
                placeholder="0x... (e.g., SyncSwap)"
                required
              />

              <AddressInput
                label="USDC Address"
                value={usdc}
                onChange={setUsdc}
                placeholder="0x..."
                required
              />

              <button
                onClick={() => setShowAutoSwapConfirm(true)}
                disabled={!dexRouter || !usdc || loading || isConfirming}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Deploy with Auto-Swap
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {(hash || error) && (
          <div className="mt-6">
            <TransactionStatus
              status={txStatus}
              hash={hash}
              error={error?.message}
            />
          </div>
        )}
      </div>

      {/* What Gets Configured */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">📋 Safe Defaults Includes:</h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li>• DutyDistributor: Compliance enforced on-chain</li>
            <li>• CouncilSalary: Compliance enforced on-chain</li>
            <li>• CouncilManager: Compliance enforced on-chain</li>
            <li>• LiquidityIncentives: Compliance enforced on-chain</li>
            <li>• Auto-swap: Disabled</li>
          </ul>
        </div>

        <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">🚀 Auto-Swap Setup Includes:</h3>
          <ul className="text-slate-300 text-sm space-y-2">
            <li>• All Safe Defaults (above)</li>
            <li>• Auto-swap: Enabled</li>
            <li>• DEX Router: Configured</li>
            <li>• Stablecoin: USDC</li>
            <li>• Max Slippage: 1%</li>
            <li>• Reward payments in stablecoin</li>
          </ul>
        </div>
      </div>

      {/* Important Note */}
      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">⚠️ Before Production Deployment</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ Ensure all contracts are deployed and verified</li>
          <li>✓ Test on testnet first</li>
          <li>✓ Verify DEX has sufficient VFIDE/USDC liquidity (for auto-swap)</li>
          <li>✓ Transfer ownership to multisig wallet</li>
          <li>✓ Document all configuration parameters</li>
          <li>✓ Set up monitoring and alerts</li>
        </ul>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showSafeDefaultsConfirm}
        onClose={() => setShowSafeDefaultsConfirm(false)}
        onConfirm={handleSafeDefaults}
        title="Deploy Safe Defaults"
        message="This will configure auto-swap (disabled) for a conservative production launch. Compliance is enforced on-chain."
        confirmText="Deploy Configuration"
        details={[
          { label: 'Howey-Safe Mode', value: 'All contracts ON' },
          { label: 'Auto-Swap', value: 'Disabled' },
          { label: 'Security Level', value: 'Maximum' },
        ]}
      />

      <ConfirmationModal
        isOpen={showAutoSwapConfirm}
        onClose={() => setShowAutoSwapConfirm(false)}
        onConfirm={handleAutoSwapSetup}
        title="Deploy with Auto-Swap"
        message="This will configure auto-swap for stablecoin council salary payments. Compliance is enforced on-chain. Ensure DEX has sufficient liquidity."
        confirmText="Deploy Configuration"
        details={[
          { label: 'Howey-Safe Mode', value: 'All contracts ON' },
          { label: 'Auto-Swap', value: 'Enabled (1%)' },
          { label: 'DEX Router', value: dexRouter ? `${dexRouter.slice(0, 10)}...` : 'N/A' },
          { label: 'Stablecoin', value: usdc ? `${usdc.slice(0, 10)}...` : 'N/A' },
        ]}
      />
    </div>
  );
}
