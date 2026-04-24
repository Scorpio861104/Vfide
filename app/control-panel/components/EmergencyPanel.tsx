'use client';

import { useState } from 'react';
import { useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ZERO_ADDRESS } from '@/lib/contracts';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';
import {
  ConfirmationModal,
  TransactionStatus,
  DangerWarning,
  NumberInput,
} from './SecurityComponents';

export function EmergencyPanel() {
  const chainId = useChainId();
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [showCircuitBreakerConfirm, setShowCircuitBreakerConfirm] = useState(false);
  const [circuitBreakerActive, setCircuitBreakerActive] = useState(false);
  const [circuitBreakerDuration, setCircuitBreakerDuration] = useState(86400); // 24 hours in seconds
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { writeContractAsync, data: hash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handlePauseAll = async () => {
    setLocalError(null);
    if (chainId !== CURRENT_CHAIN_ID) {
      setLocalError('Switch to the configured network before using emergency controls.');
      return;
    }
    if (OWNER_CONTROL_PANEL_ADDRESS === ZERO_ADDRESS) {
      setLocalError('Owner control panel is not configured in this environment.');
      return;
    }
    setShowPauseConfirm(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'emergency_pauseAll',
        chainId: CURRENT_CHAIN_ID,
      });
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const handleResumeAll = async () => {
    setLocalError(null);
    if (chainId !== CURRENT_CHAIN_ID) {
      setLocalError('Switch to the configured network before using emergency controls.');
      return;
    }
    if (OWNER_CONTROL_PANEL_ADDRESS === ZERO_ADDRESS) {
      setLocalError('Owner control panel is not configured in this environment.');
      return;
    }
    setShowResumeConfirm(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'emergency_resumeAll',
        chainId: CURRENT_CHAIN_ID,
      });
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const handleCircuitBreaker = async () => {
    setLocalError(null);
    if (chainId !== CURRENT_CHAIN_ID) {
      setLocalError('Switch to the configured network before toggling the circuit breaker.');
      return;
    }
    if (OWNER_CONTROL_PANEL_ADDRESS === ZERO_ADDRESS) {
      setLocalError('Owner control panel is not configured in this environment.');
      return;
    }
    setShowCircuitBreakerConfirm(false);
    setLoading(true);
    
    try {
      await writeContractAsync({
        address: OWNER_CONTROL_PANEL_ADDRESS,
        abi: OWNER_CONTROL_PANEL_ABI,
        functionName: 'token_setCircuitBreaker',
        args: [circuitBreakerActive, BigInt(circuitBreakerDuration)],
        chainId: CURRENT_CHAIN_ID,
      });
    } catch {
      // Error is surfaced via wagmi error state in TransactionStatus
    } finally {
      setLoading(false);
    }
  };

  const txStatus = localError ? 'error' : isConfirming ? 'pending' : isSuccess ? 'success' : error ? 'error' : 'idle';

  return (
    <div className="space-y-6">
      {/* Main Warning */}
      <DangerWarning message="Emergency controls can stop the entire protocol. Use only in critical situations after careful consideration." />

      {/* Emergency Pause/Resume */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">🚨 System-Wide Emergency Controls</h2>
        <p className="text-slate-400 mb-6">
          Execute previously queued emergency actions. These controls do not bypass the OwnerControlPanel governance delay.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setShowPauseConfirm(true)}
            disabled={loading || isConfirming}
            className="p-6 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 rounded-xl transition-colors text-left disabled:opacity-50"
          >
            <div className="text-4xl mb-3">⏸️</div>
            <h3 className="text-xl font-bold text-white mb-2">Execute Queued Pause</h3>
            <p className="text-slate-300 text-sm">
              Runs a previously queued emergency pause action.
              <br />
              <strong className="text-red-400">Queue the action first in governance controls, then execute it here.</strong>
            </p>
          </button>

          <button
            onClick={() => setShowResumeConfirm(true)}
            disabled={loading || isConfirming}
            className="p-6 bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500/50 rounded-xl transition-colors text-left disabled:opacity-50"
          >
            <div className="text-4xl mb-3">▶️</div>
            <h3 className="text-xl font-bold text-white mb-2">Execute Queued Resume</h3>
            <p className="text-slate-300 text-sm">
              Runs a previously queued resume action.
              <br />
              Use after the queued pause state has been reviewed and cleared.
            </p>
          </button>
        </div>
      </div>

      {/* Circuit Breaker */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4">⚡ Token Circuit Breaker</h2>
        <p className="text-slate-400 mb-6">
          Queue or disable the token circuit breaker. Activation is delayed on-chain; deactivation remains immediate for liveness.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
            <input
              type="checkbox"
              id="circuitBreakerActive"
              checked={circuitBreakerActive}
              onChange={(e) => setCircuitBreakerActive(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="circuitBreakerActive" className="text-white">
              {circuitBreakerActive ? 'Activate circuit breaker' : 'Deactivate circuit breaker'}
            </label>
          </div>

          {circuitBreakerActive && (
            <NumberInput
              label="Duration (seconds)"
              value={circuitBreakerDuration}
              onChange={setCircuitBreakerDuration}
              min={0}
              max={604800} // 7 days max
              step={3600} // 1 hour steps
              suffix="sec"
            />
          )}

          <div className="flex gap-2 text-sm text-slate-400">
            <button onClick={() => setCircuitBreakerDuration(3600)} className="px-3 py-1 bg-white/5 rounded">
              1 hour
            </button>
            <button onClick={() => setCircuitBreakerDuration(86400)} className="px-3 py-1 bg-white/5 rounded">
              24 hours
            </button>
            <button onClick={() => setCircuitBreakerDuration(604800)} className="px-3 py-1 bg-white/5 rounded">
              7 days (max)
            </button>
          </div>

          <button
            onClick={() => setShowCircuitBreakerConfirm(true)}
            disabled={loading || isConfirming}
            className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {circuitBreakerActive ? 'Enable Circuit Breaker' : 'Disable Circuit Breaker'}
          </button>
        </div>
      </div>

      {/* Transaction Status */}
      {(hash || error) && (
        <TransactionStatus
          status={txStatus}
          hash={hash}
          error={error?.message}
        />
      )}

      {/* Information */}
      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-6">
        <h3 className="text-white font-bold mb-2">⚠️ Important Information</h3>
        <ul className="text-slate-300 text-sm space-y-2">
          <li><strong>Pause All:</strong> Executes only after a matching governance queue entry already exists</li>
          <li><strong>Resume All:</strong> Executes only after a matching governance queue entry already exists</li>
          <li><strong>Circuit Breaker:</strong> Activation is timelocked on-chain and must be confirmed after the delay</li>
          <li><strong>Max Duration:</strong> Circuit breaker automatically expires after 7 days</li>
          <li><strong>Use Case:</strong> Critical bug fixes, security incidents, or emergency migrations after governance review</li>
        </ul>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showPauseConfirm}
        onClose={() => setShowPauseConfirm(false)}
        onConfirm={handlePauseAll}
        title="⚠️ Execute Queued Pause"
        message="This executes a previously queued emergency pause action. If the action has not been queued yet, this transaction will revert."
        confirmText="Execute Queued Pause"
        isDangerous={true}
      />

      <ConfirmationModal
        isOpen={showResumeConfirm}
        onClose={() => setShowResumeConfirm(false)}
        onConfirm={handleResumeAll}
        title="Execute Queued Resume"
        message="This executes a previously queued resume action. Ensure the emergency situation has been fully resolved and the matching queue entry exists before proceeding."
        confirmText="Execute Queued Resume"
      />

      <ConfirmationModal
        isOpen={showCircuitBreakerConfirm}
        onClose={() => setShowCircuitBreakerConfirm(false)}
        onConfirm={handleCircuitBreaker}
        title={circuitBreakerActive ? "⚡ Enable Circuit Breaker" : "Disable Circuit Breaker"}
        message={
          circuitBreakerActive
            ? "This queues a circuit-breaker activation on the token contract. The activation must still be confirmed after the on-chain delay."
            : "This disables the circuit breaker immediately and restores normal token checks."
        }
        confirmText={circuitBreakerActive ? "Enable" : "Disable"}
        isDangerous={circuitBreakerActive}
        details={circuitBreakerActive ? [
          { label: 'Duration', value: `${circuitBreakerDuration / 3600} hours` },
          { label: 'Expires', value: new Date(Date.now() + circuitBreakerDuration * 1000).toLocaleString() },
        ] : undefined}
      />
    </div>
  );
}
