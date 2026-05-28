'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from 'wagmi';
import { motion } from 'framer-motion';
import { isAddress, formatUnits } from 'viem';
import {
  Lock,
  X,
  Loader2,
  RotateCw,
  MessageSquare,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import { useUserVault } from '@/hooks/useVaultHooks';
import { QueueHourglass } from '@/components/security/QueueHourglass';

/**
 * "Lock my vault" panic page.
 *
 * THREAT MODEL: user has reason to think their wallet may have been
 * compromised, OR they've physically lost the device. They still have
 * access to the active wallet on at least one device.
 *
 * What this page lets them do, in one place:
 *   1. Cancel everything queued — clears the attacker's already-queued
 *      drain attempts.
 *   2. Propose wallet rotation — moves the active signer to a new wallet
 *      under user-chosen delay (default 24h, configurable).
 *   3. Alert guardians — generates a shareable URL the user can send
 *      out-of-band (SMS, signal, email) so guardians know to watch.
 *
 * What this page CANNOT do (and shouldn't pretend to):
 *   - It cannot recover a wallet whose key is completely lost. That's
 *     the guardian-led recovery flow (Recovery tab).
 *   - It cannot prevent an attacker who imports your key into their own
 *     wallet from signing on their own. The 7-day queue is what bounds
 *     that.
 */

const ROTATION_DELAY_PRESETS: { label: string; seconds: number; hint: string }[] = [
  { label: '1 hour', seconds: 60 * 60, hint: 'Fastest. Use only if you\'re sure no attacker has a queued action.' },
  { label: '24 hours', seconds: 24 * 60 * 60, hint: 'Recommended default. Gives guardians a window to approve.' },
  { label: '3 days', seconds: 3 * 24 * 60 * 60, hint: 'Most cautious. Lets you change your mind.' },
];

export function LockVaultPanel() {
  const { address, isConnected } = useAccount();
  const { vaultAddress: userVault } = useUserVault();
  const vault = userVault as `0x${string}` | undefined;

  if (!isConnected || !address) {
    return (
      <PanelShell>
        <div className="text-center text-gray-400 py-8">
          Connect the wallet that owns the vault you need to lock.
        </div>
      </PanelShell>
    );
  }

  if (!vault) {
    return (
      <PanelShell>
        <div className="text-center text-gray-400 py-8">
          No vault detected for this wallet. If you guard someone else&apos;s vault,
          use the Guardian dashboard instead.
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <CancelQueueSection vault={vault} />
      <hr className="border-gray-800" />
      <WalletRotationSection vault={vault} />
      <hr className="border-gray-800" />
      <GuardianAlertSection vault={vault} />
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-red-500/40 bg-gradient-to-br from-red-950/30 to-gray-900/60 backdrop-blur-xl p-6 space-y-6"
    >
      <div className="flex items-start gap-3">
        <Lock className="w-7 h-7 text-red-400 mt-1 flex-shrink-0" />
        <div>
          <h2 className="text-2xl font-bold text-white">Lock my vault</h2>
          <p className="text-sm text-gray-300 mt-1">
            Use this page if you think your wallet may be compromised or your
            device was lost. Acting fast here matters: the 7-day queue is only
            protective if the queued items get cancelled before they execute.
          </p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Section 1: Cancel all queued ───────────────────────────────────────────

function CancelQueueSection({ vault }: { vault: `0x${string}` }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { data: withdrawalQueue, refetch: refetchWithdrawals } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'getPendingQueuedWithdrawals',
    query: { enabled: !!vault },
  });

  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'WithdrawalCancelled',
    onLogs: () => {
      void refetchWithdrawals();
    },
  });
  useWatchContractEvent({
    address: vault,
    abi: CardBoundVaultABI,
    eventName: 'PaymentQueueCancelled',
    onLogs: bump,
  });

  const withdrawalItems = useMemo(() => {
    if (!withdrawalQueue) return [];
    const [indices, amounts, executeAfters] = withdrawalQueue as readonly [
      readonly bigint[],
      readonly bigint[],
      readonly bigint[],
    ];
    return indices.map((idx, i) => ({ idx, amount: amounts[i]!, executeAfter: executeAfters[i]! }));
  }, [withdrawalQueue]);

  // Payment queue length (lightweight check; if >0 user can cancel via the
  // bulk button which iterates).
  const { data: paymentManagerAddr } = useReadContract({
    address: vault,
    abi: CardBoundVaultABI,
    functionName: 'paymentQueueManager',
    query: { enabled: !!vault },
  });

  const [paymentCount, setPaymentCount] = useState<number | null>(null);
  // Lazy-fetch payment queue length whenever the manager address resolves or refreshKey bumps.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!paymentManagerAddr || typeof window === 'undefined' || !(window as any).ethereum) {
        if (!cancelled) setPaymentCount(0);
        return;
      }
      try {
        const { createPublicClient, custom } = await import('viem');
        const client = createPublicClient({ transport: custom((window as any).ethereum) });
        // abi-parity-ok: inline ABI for CardBoundVaultPaymentQueueManager.queueLength(); 0-arg view
        const length = (await client.readContract({
          address: paymentManagerAddr as `0x${string}`,
          abi: [
            {
              name: 'queueLength',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ type: 'uint256' }],
            },
          ],
          functionName: 'queueLength',
        })) as bigint;
        if (!cancelled) setPaymentCount(Number(length));
      } catch {
        if (!cancelled) setPaymentCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentManagerAddr, refreshKey]);

  const { writeContractAsync } = useWriteContract();
  const [cancelling, setCancelling] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelAll = async () => {
    setCancelling(true);
    setError(null);
    let cancelled = 0;
    try {
      for (const item of withdrawalItems) {
        setProgress(`Cancelling withdrawal #${item.idx.toString()}…`);
        await writeContractAsync({
          address: vault,
          abi: CardBoundVaultABI,
          functionName: 'cancelQueuedWithdrawal',
          args: [item.idx],
        });
        cancelled++;
      }
      // Iterate payment queue if we know the length.
      if (paymentManagerAddr && paymentCount && paymentCount > 0) {
        const { createPublicClient, custom } = await import('viem');
        const client = createPublicClient({ transport: custom((window as any).ethereum) });
        for (let i = 0n; i < BigInt(paymentCount); i++) {
          // abi-parity-ok: inline ABI for paymentQueue(uint256); 1 arg, statically present
          const entry = (await client.readContract({
            address: paymentManagerAddr as `0x${string}`,
            abi: [
              {
                name: 'paymentQueue',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ type: 'uint256' }],
                outputs: [
                  { type: 'address' },
                  { type: 'address' },
                  { type: 'address' },
                  { type: 'uint256' },
                  { type: 'uint64' },
                  { type: 'bool' },
                  { type: 'bool' },
                ],
              },
            ],
            functionName: 'paymentQueue',
            args: [i],
          })) as readonly [
            `0x${string}`,
            `0x${string}`,
            `0x${string}`,
            bigint,
            bigint,
            boolean,
            boolean,
          ];
          const [, , , , , executed, cancelledFlag] = entry;
          if (executed || cancelledFlag) continue;
          setProgress(`Cancelling payment #${i.toString()}…`);
          await writeContractAsync({
            address: vault,
            abi: CardBoundVaultABI,
            functionName: 'cancelQueuedPayment',
            args: [i],
          });
          cancelled++;
        }
      }
      setProgress(`Done. ${cancelled} item${cancelled === 1 ? '' : 's'} cancelled.`);
      void refetchWithdrawals();
      bump();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed.');
    } finally {
      setCancelling(false);
    }
  };

  const total = withdrawalItems.length + (paymentCount ?? 0);
  const nothing = total === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <X className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-bold text-white">Step 1 — Cancel everything queued</h3>
      </div>
      <p className="text-sm text-gray-300">
        {nothing
          ? 'Nothing in your queue right now. If a queued item appears later, it shows up here.'
          : `${withdrawalItems.length} withdrawal${withdrawalItems.length === 1 ? '' : 's'} and ${paymentCount ?? 0} payment${paymentCount === 1 ? '' : 's'} pending. Cancel all to flush.`}
      </p>

      {!nothing && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          {withdrawalItems.map((item) => (
            <div key={item.idx.toString()} className="flex items-center gap-3 text-xs">
              <QueueHourglass executeAfterSec={item.executeAfter} size={28} />
              <span className="text-white flex-1">
                Withdrawal #{item.idx.toString()} —{' '}
                <span className="font-mono">{formatUnits(item.amount, 18)} VFIDE</span>
              </span>
              <span className="text-gray-500">
                {Math.max(0, Math.ceil((Number(item.executeAfter) * 1000 - Date.now()) / 3600000))}h
              </span>
            </div>
          ))}
          {paymentCount !== null && paymentCount > 0 && (
            <div className="text-xs text-gray-400 italic">
              +{paymentCount} payment queue entries — cancel-all will iterate through.
            </div>
          )}
        </div>
      )}

      {progress && <div className="text-sm text-accent">{progress}</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={cancelAll}
        disabled={cancelling || nothing}
        className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
      >
        {cancelling ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
        {nothing ? 'Nothing to cancel' : `Cancel all ${total} queued item${total === 1 ? '' : 's'}`}
      </button>
    </section>
  );
}

// ─── Section 2: Propose wallet rotation ─────────────────────────────────────

function WalletRotationSection({ vault }: { vault: `0x${string}` }) {
  const [newWallet, setNewWallet] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(ROTATION_DELAY_PRESETS[1]!.seconds);
  const [customDelayHours, setCustomDelayHours] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({ kind: 'idle' });

  const effectiveDelay = useCustom
    ? Math.max(0, Math.floor(Number(customDelayHours) * 3600))
    : delaySeconds;

  const { writeContractAsync } = useWriteContract();

  const propose = async () => {
    if (!isAddress(newWallet)) {
      setStatus({ kind: 'error', message: 'Enter a valid wallet address.' });
      return;
    }
    if (effectiveDelay <= 0) {
      setStatus({ kind: 'error', message: 'Delay must be greater than 0.' });
      return;
    }
    setBusy(true);
    setStatus({ kind: 'idle' });
    try {
      await writeContractAsync({
        address: vault,
        abi: CardBoundVaultABI,
        functionName: 'proposeWalletRotation',
        args: [newWallet as `0x${string}`, BigInt(effectiveDelay)],
      });
      setStatus({
        kind: 'success',
        message:
          'Rotation proposed. Guardians can call approveWalletRotation to speed it up; otherwise it finalizes after your chosen delay via finalizeWalletRotation.',
      });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to propose rotation.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <RotateCw className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-white">Step 2 — Rotate to a new wallet</h3>
      </div>
      <p className="text-sm text-gray-300">
        Move the active signer for this vault to a fresh wallet you control.
        Guardians can approve to skip the delay, or it finalizes automatically
        when the delay elapses.
      </p>

      <input
        type="text"
        value={newWallet}
        onChange={(e) => setNewWallet(e.target.value)}
        placeholder="New wallet address (0x...)"
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white font-mono text-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        {ROTATION_DELAY_PRESETS.map((preset) => (
          <button
            key={preset.seconds}
            onClick={() => {
              setDelaySeconds(preset.seconds);
              setUseCustom(false);
            }}
            className={`p-3 rounded-lg border text-left transition-colors ${
              !useCustom && delaySeconds === preset.seconds
                ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
            }`}
          >
            <div className="text-sm font-bold">{preset.label}</div>
            <div className="text-[10px] opacity-80">{preset.hint}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useCustomDelay"
          checked={useCustom}
          onChange={(e) => setUseCustom(e.target.checked)}
          className="cursor-pointer"
        />
        <label htmlFor="useCustomDelay" className="text-xs text-gray-400 cursor-pointer">
          Custom delay
        </label>
        {useCustom && (
          <>
            <input
              type="number"
              min={0}
              step={0.5}
              value={customDelayHours}
              onChange={(e) => setCustomDelayHours(e.target.value)}
              placeholder="hours"
              className="w-24 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-white text-sm"
            />
            <span className="text-xs text-gray-400">hours</span>
          </>
        )}
      </div>

      {status.kind === 'success' && <div className="text-sm text-green-400">{status.message}</div>}
      {status.kind === 'error' && <div className="text-sm text-red-400">{status.message}</div>}

      <button
        onClick={propose}
        disabled={busy || !newWallet}
        className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
        Propose rotation
      </button>
    </section>
  );
}

// ─── Section 3: Guardian alert ──────────────────────────────────────────────

function GuardianAlertSection({ vault }: { vault: `0x${string}` }) {
  const [copied, setCopied] = useState(false);
  const alertUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/guardians?watch=${vault}&alert=1`
    : `/guardians?watch=${vault}&alert=1`;

  const message = `URGENT: My VFIDE vault may be compromised. Please open ${alertUrl} and cancel any pending queued items you see. Vault: ${vault}`;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select-and-copy in a textarea, but most modern browsers
      // support clipboard.writeText. Silent fail is acceptable.
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-bold text-white">Step 3 — Alert your guardians</h3>
      </div>
      <p className="text-sm text-gray-300">
        Send this message to your guardians via Signal, SMS, email — any channel
        outside of VFIDE (an attacker may have access to your VFIDE-linked
        notifications). The link takes guardians directly to their dashboard
        with this vault pre-loaded.
      </p>

      <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
        <textarea
          readOnly
          value={message}
          className="w-full bg-transparent text-xs text-gray-300 font-mono resize-none"
          rows={4}
        />
      </div>

      <button
        onClick={copyMessage}
        className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-accent text-white font-medium transition-colors flex items-center justify-center gap-2"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copied' : 'Copy alert message'}
      </button>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-100 flex gap-2">
        <Shield size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          If you&apos;ve fully lost your wallet (no signer access), don&apos;t use this
          page — instead, contact your guardians and have them initiate
          recovery from the Recovery tab. They can rotate the wallet on your
          behalf with M-of-N approval.
        </span>
      </div>
    </section>
  );
}
