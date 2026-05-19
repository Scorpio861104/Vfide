'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { type Address, parseUnits, formatUnits, erc20Abi } from 'viem';
import { Loader2, AlertCircle, Coins, Lock, ChevronDown, Wallet, RefreshCw } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import {
  useAllPoolInfo,
  useUserStake,
  useUnstakeCooldown,
  useLpAllowance,
  useApproveLpToken,
  useStake,
  useUnstake,
} from '@/hooks/useStaking';
import { toast } from '@/lib/toast';

function shortAddress(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDuration(seconds: bigint): string {
  if (seconds <= 0n) return '0s';
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/**
 * Map a contract revert message to a user-friendly note.
 * The custom-error names come from LiquidityIncentives.sol.
 */
function translateRevert(err: unknown, mode: 'stake' | 'unstake' | 'approve'): string {
  const msg = err instanceof Error ? err.message : 'Transaction failed';
  if (msg.includes('LP_NotActive')) return 'This pool is currently disabled by governance.';
  if (msg.includes('LP_Zero')) return 'Amount must be greater than zero.';
  if (msg.includes('LP_InsufficientBalance')) return "You don't have that much staked.";
  if (msg.includes('LP_Cooldown')) return 'Unstake cooldown still in effect.';
  if (msg.includes('rejected') || msg.includes('denied')) return 'Transaction cancelled.';
  return `${mode} failed: ${msg.slice(0, 80)}`;
}

export default function StakingPage() {
  const { address: account, isConnected } = useAccount();
  const { LiquidityIncentives } = useContractAddresses();
  const { pools, isLoading: poolsLoading } = useAllPoolInfo();
  const cooldown = useUnstakeCooldown();

  // Auto-select first active pool, but allow user override.
  const [selectedLp, setSelectedLp] = useState<Address | null>(null);
  const activePools = useMemo(() => pools.filter((p) => p.active), [pools]);
  const firstActiveLp: Address | null = activePools[0]?.lpToken ?? null;
  const effectiveLp: Address | null = selectedLp ?? firstActiveLp;

  const selectedPool = useMemo(
    () => pools.find((p) => p.lpToken === effectiveLp),
    [pools, effectiveLp],
  );

  const { data: userStake, refetch: refetchStake } = useUserStake(
    effectiveLp ?? undefined,
  );
  const { allowance, refetch: refetchAllowance } = useLpAllowance(
    effectiveLp ?? undefined,
  );
  // Read user's LP token balance so the stake button can be gated by
  // available funds. Without this, users with insufficient LP would only
  // discover the problem after paying gas for an approve they didn't need.
  const { data: lpBalanceRaw, refetch: refetchLpBalance } = useReadContract({
    address: effectiveLp ?? undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account && !!effectiveLp },
  });
  const lpBalance = (lpBalanceRaw as bigint | undefined) ?? 0n;

  const { approve, isPending: approving, isConfirmed: approveConfirmed } = useApproveLpToken();
  const { stake, isPending: staking, isConfirmed: stakeConfirmed } = useStake();
  const { unstake, isPending: unstaking, isConfirmed: unstakeConfirmed } = useUnstake();

  // Confirmation-aware refetch: trigger when a write confirms on-chain.
  // Replaces the previous `setTimeout(..., 2000)` workaround that was
  // hardcoded to "wait a beat" \u2014 unreliable on slow blocks, premature on fast ones.
  useEffect(() => {
    if (approveConfirmed) {
      void refetchAllowance();
      void refetchLpBalance();
    }
  }, [approveConfirmed, refetchAllowance, refetchLpBalance]);
  useEffect(() => {
    if (stakeConfirmed) {
      void refetchStake();
      void refetchAllowance();
      void refetchLpBalance();
    }
  }, [stakeConfirmed, refetchStake, refetchAllowance, refetchLpBalance]);
  useEffect(() => {
    if (unstakeConfirmed) {
      void refetchStake();
      void refetchLpBalance();
    }
  }, [unstakeConfirmed, refetchStake, refetchLpBalance]);

  const [amount, setAmount] = useState('');

  // Parse amount as 18-decimals (standard ERC20-LP). Some real-world LP
  // tokens have other decimals (USDC LP can be 6) — for now we follow the
  // convention used elsewhere in the codebase. A more rigorous build would
  // read `decimals()` from the LP token; called out so the developer
  // knows where to harden if a 6-decimal LP gets listed.
  let amountBn: bigint = 0n;
  let amountError: string | null = null;
  try {
    amountBn = amount ? parseUnits(amount, 18) : 0n;
  } catch {
    amountError = 'Enter a valid amount.';
  }

  const needsApproval = amountBn > 0n && allowance < amountBn;

  // Time-since-stake vs cooldown — used to disable Unstake when locked.
  const stakedAt = userStake?.stakedAt ?? 0n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const cooldownEndsAt = stakedAt > 0n ? stakedAt + cooldown : 0n;
  const cooldownActive = stakedAt > 0n && cooldownEndsAt > now;
  const cooldownRemaining = cooldownActive ? cooldownEndsAt - now : 0n;

  if (!isConfiguredContractAddress(LiquidityIncentives)) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          </div>
          <div className="relative container mx-auto px-4 max-w-3xl py-8">
            <div className="mb-6">
              <span className="badge-live mb-3 inline-flex"><span className="badge-live-dot" />Liquidity Pools</span>
              <h1 className="text-4xl font-bold"><span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Staking</span></h1>
            </div>
            <div className="glass-card-premium p-8 text-center">
              <Coins className="mx-auto text-zinc-600 mb-3" size={40} aria-hidden="true" />
              <p className="text-white/40">The staking contract is not deployed on this network yet.</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!isConnected) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          </div>
          <div className="relative container mx-auto px-4 max-w-3xl py-8">
            <div className="mb-6">
              <span className="badge-live mb-3 inline-flex"><span className="badge-live-dot" />Liquidity Pools</span>
              <h1 className="text-4xl font-bold"><span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Staking</span></h1>
            </div>
            <div className="glass-card-premium p-8 text-center">
              <Wallet className="mx-auto text-zinc-600 mb-3" size={40} aria-hidden="true" />
              <p className="text-white/40">Connect your wallet to stake LP tokens.</p>
              <div className="mt-6 flex justify-center">
                <VfideConnectButton size="md" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  async function handleApprove() {
    if (!effectiveLp || amountBn <= 0n) return;
    try {
      // Approve exact amount needed. Users who want infinite-approve can
      // call approve directly from their wallet UI.
      await approve(effectiveLp, amountBn);
      toast.success('Approval submitted.');
      // Refetch is gated on approveConfirmed via the useEffect above.
    } catch (err) {
      toast.error(translateRevert(err, 'approve'));
    }
  }

  async function handleStake() {
    if (!effectiveLp || amountBn <= 0n) return;
    try {
      await stake(effectiveLp, amountBn);
      toast.success('Stake submitted.');
      setAmount('');
      // Refetch is gated on stakeConfirmed via the useEffect above.
    } catch (err) {
      toast.error(translateRevert(err, 'stake'));
    }
  }

  async function handleUnstake() {
    if (!effectiveLp || amountBn <= 0n) return;
    try {
      await unstake(effectiveLp, amountBn);
      toast.success('Unstake submitted.');
      setAmount('');
      // Refetch is gated on unstakeConfirmed via the useEffect above.
    } catch (err) {
      toast.error(translateRevert(err, 'unstake'));
    }
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
          <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>
        <div className="relative container mx-auto px-4 max-w-3xl py-8 space-y-6">
          <div className="mb-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live"><span className="badge-live-dot" />Liquidity Pools</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <Coins size={32} className="text-cyan-400" />Staking
              </span>
            </h1>
            <p className="text-white/50">Earn liquidity incentives by participating in protocol pools.</p>
          </div>

          {poolsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-cyan-400" size={32} aria-hidden="true" />
            </div>
          )}

          {!poolsLoading && activePools.length === 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
              <Coins className="mx-auto text-zinc-600 mb-3" size={40} aria-hidden="true" />
              <p className="text-zinc-400">
                No active staking pools yet. New pools appear here when governance enables them.
              </p>
            </div>
          )}

          {!poolsLoading && activePools.length > 0 && (
            <>
              {/* Pool selector — single-select dropdown of active pools. */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
                <label htmlFor="pool-select" className="text-sm font-bold text-zinc-300">
                  Pool
                </label>
                <div className="relative">
                  <select
                    id="pool-select"
                    aria-label="Select staking pool"
                    value={effectiveLp ?? ''}
                    onChange={(e) => setSelectedLp(e.target.value as Address)}
                    className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 pr-9 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    {activePools.map((p) => (
                      <option key={p.lpToken} value={p.lpToken}>
                        {p.name || shortAddress(p.lpToken)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                {selectedPool && (
                  <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Total staked:{' '}
                      <span className="font-mono text-zinc-300">
                        {formatUnits(selectedPool.totalStaked, 18)}
                      </span>
                    </span>
                    <span>
                      LP:{' '}
                      <span className="font-mono text-zinc-300">
                        {shortAddress(selectedPool.lpToken)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* User position */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-300">Your Position</h3>
                  <button
                    type="button"
                    aria-label="Refresh stake info"
                    onClick={() => {
                      void refetchStake();
                      void refetchAllowance();
                    }}
                    className="text-zinc-400 hover:text-cyan-400 transition-colors"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-400">Staked</div>
                    <div className="text-2xl font-bold text-white font-mono">
                      {userStake ? formatUnits(userStake.amount, 18) : '0'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Duration</div>
                    <div className="text-2xl font-bold text-cyan-300 font-mono">
                      {userStake ? formatDuration(userStake.stakeDuration) : '—'}
                    </div>
                  </div>
                </div>
                {cooldownActive && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2 text-xs">
                    <Lock className="text-amber-400 shrink-0" size={14} aria-hidden="true" />
                    <span className="text-amber-200">
                      Unstake locked for {formatDuration(cooldownRemaining)} more.
                    </span>
                  </div>
                )}
              </div>

              {/* Action panel */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                <div>
                  <label htmlFor="staking-amount" className="text-sm font-bold text-zinc-300 mb-1.5 block">
                    Amount
                  </label>
                  <input
                    id="staking-amount"
                    aria-label="Amount to stake or unstake"
                    type="number"
                    inputMode="decimal"
                    step="0.000001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-3 text-xl text-white font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                  {amountError && (
                    <div className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle size={12} aria-hidden="true" /> {amountError}
                    </div>
                  )}
                  {!amountError && effectiveLp && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-400">
                      <span>Balance: <span className="font-mono text-zinc-300">{formatUnits(lpBalance, 18)}</span></span>
                      <button
                        type="button"
                        onClick={() => setAmount(formatUnits(lpBalance, 18))}
                        disabled={lpBalance === 0n}
                        className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 rounded"
                      >
                        Max
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {needsApproval ? (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approving || amountBn === 0n || !!amountError || amountBn > lpBalance}
                      className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold transition-colors"
                    >
                      {approving ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                      {amountBn > lpBalance ? 'Insufficient LP balance' : 'Approve LP token'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleStake}
                        disabled={
                          staking ||
                          amountBn === 0n ||
                          !!amountError ||
                          !selectedPool?.active ||
                          amountBn > lpBalance
                        }
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold transition-colors"
                      >
                        {staking ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                        {amountBn > lpBalance ? 'Insufficient' : 'Stake'}
                      </button>
                      <button
                        type="button"
                        onClick={handleUnstake}
                        disabled={
                          unstaking ||
                          amountBn === 0n ||
                          !!amountError ||
                          cooldownActive ||
                          (userStake?.amount ?? 0n) === 0n
                        }
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors"
                      >
                        {unstaking ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                        Unstake
                      </button>
                    </>
                  )}
                </div>

                <p className="text-xs text-zinc-500">
                  Unstake cooldown:{' '}
                  <span className="font-mono text-zinc-400">{formatDuration(cooldown)}</span> from
                  each stake action. Staking again resets the cooldown clock to now.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
