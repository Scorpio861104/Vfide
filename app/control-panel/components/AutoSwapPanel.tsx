'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';
import {
  AddressInput,
  ConfirmationModal,
  TransactionStatus,
} from './SecurityComponents';

export function AutoSwapPanel() {
  const [router, setRouter] = useState('');
  const [stablecoin, setStablecoin] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [slippageBps, setSlippageBps] = useState(100); // 1%
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const { writeContractAsync, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read current configuration
  const { data: currentConfig, refetch } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'autoSwap_getConfig',
  });

  const currentRouter = currentConfig?.[0] as string | undefined;
  const currentStablecoin = currentConfig?.[1] as string | undefined;
  const currentEnabled = currentConfig?.[2] as boolean | undefined;
  const currentSlippage = currentConfig?.[3] as number | undefined;

  const handleConfigure = async () => {
    setShowConfirmation(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'autoSwap_configure',
        args: [router as `0x${string}`, stablecoin as `0x${string}`, enabled, slippageBps],
      });
      
      // Refetch configuration after transaction
      setTimeout(() => refetch(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSetupUSDC = async () => {
    if (!router || !stablecoin) {
      setFormError('Please enter both router and USDC addresses.');
      return;
    }

    setFormError(null);

    setLoading(true);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'autoSwap_quickSetupUSDC',
        args: [router as `0x${string}`, stablecoin as `0x${string}`],
      });
      
      setTimeout(() => refetch(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'autoSwap_setEnabled',
        args: [!currentEnabled],
      });
      
      setTimeout(() => refetch(), 2000);
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const txStatus = isConfirming ? 'pending' : isSuccess ? 'success' : error ? 'error' : 'idle';

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">🔄 Auto-Swap Configuration</h2>
        <p className="text-slate-400 mb-6">
          Configure automatic VFIDE to stablecoin conversion for protocol fee distributions.
          When enabled, fee receipts are automatically converted to your preferred stablecoin.
        </p>

        {/* Current Configuration Display */}
        {currentConfig && (
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <h3 className="text-white font-bold mb-3">Current Configuration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${currentEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {currentEnabled ? 'ENABLED ✓' : 'DISABLED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Router:</span>
                <span className="text-white font-mono text-xs">
                  {currentRouter ? `${currentRouter.slice(0, 6)}...${currentRouter.slice(-4)}` : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stablecoin:</span>
                <span className="text-white font-mono text-xs">
                  {currentStablecoin ? `${currentStablecoin.slice(0, 6)}...${currentStablecoin.slice(-4)}` : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Slippage:</span>
                <span className="text-white">{currentSlippage ? currentSlippage / 100 : 0}%</span>
              </div>
            </div>
            
            {currentRouter && currentStablecoin && (
              <button
                onClick={handleToggle}
                disabled={loading || isConfirming}
                className={`w-full mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentEnabled
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white disabled:bg-gray-600`}
              >
                {currentEnabled ? 'Disable Auto-Swap' : 'Enable Auto-Swap'}
              </button>
            )}
          </div>
        )}

        {/* Configuration Form */}
        <div className="space-y-4">
          <AddressInput
            label="DEX Router Address"
            value={router}
            onChange={(value) => {
              setRouter(value);
              if (formError) setFormError(null);
            }}
            placeholder="0x... (e.g., SyncSwap Router)"
            required
          />

          <AddressInput
            label="Stablecoin Address"
            value={stablecoin}
            onChange={(value) => {
              setStablecoin(value);
              if (formError) setFormError(null);
            }}
            placeholder="0x... (e.g., USDC)"
            required
          />

          {formError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-white font-medium">
              Maximum Slippage: {slippageBps / 100}%
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-slate-400">
              <span>0.5%</span>
              <span>5% (max)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="enabled" className="text-white">
              Enable auto-swap immediately after configuration
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={!router || !stablecoin || loading || isConfirming}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Configure Auto-Swap
            </button>

            <button
              onClick={handleQuickSetupUSDC}
              disabled={!router || !stablecoin || loading || isConfirming}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Quick USDC Setup (1%)
            </button>
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

      {/* Information Panel */}
      <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">ℹ️ How Auto-Swap Works</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li>✓ <strong>Automatic Conversion:</strong> Rewards paid in stablecoins instead of VFIDE</li>
          <li>✓ <strong>DEX Integration:</strong> Uses Uniswap V2 compatible routers</li>
          <li>✓ <strong>Slippage Protection:</strong> Prevents excessive price impact</li>
          <li>✓ <strong>Fallback Safety:</strong> Pays in VFIDE if swap fails</li>
          <li>✓ <strong>Gas Efficient:</strong> Swaps happen during reward distribution</li>
        </ul>
        
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-200 text-sm">
            <strong>Note:</strong> Make sure the DEX has sufficient VFIDE/Stablecoin liquidity before enabling.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfigure}
        title="Configure Auto-Swap"
        message="Are you sure you want to update the auto-swap configuration? This will affect all future reward payments."
        confirmText="Configure"
        details={[
          { label: 'DEX Router', value: router ? `${router.slice(0, 10)}...` : 'N/A' },
          { label: 'Stablecoin', value: stablecoin ? `${stablecoin.slice(0, 10)}...` : 'N/A' },
          { label: 'Max Slippage', value: `${slippageBps / 100}%` },
          { label: 'Enable', value: enabled ? 'Yes' : 'No' },
        ]}
      />
    </div>
  );
}
