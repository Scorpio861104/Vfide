'use client';
/**
 * StakingTab — LP pool coordination inside the /wallet hub.
 * Uses the exact same hook calls and logic as app/staking/page.tsx,
 * minus the page-level chrome (min-h-screen bg, Footer).
 */
import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { type Address, parseUnits, formatUnits, erc20Abi } from 'viem';
import { Loader2, AlertCircle, Coins, Lock, ChevronDown, Wallet, RefreshCw } from 'lucide-react';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import {
  useAllPoolInfo, useUserStake, useUnstakeCooldown,
  useLpAllowance, useApproveLpToken, useStake, useUnstake,
} from '@/hooks/useStaking';
import { toast } from '@/lib/toast';

function shortAddress(addr: Address): string { return `${addr.slice(0,6)}…${addr.slice(-4)}`; }
function formatDuration(s: bigint): string {
  const n = Number(s);
  if (n <= 0) return '0s';
  if (n < 60) return `${n}s`;
  if (n < 3600) return `${Math.floor(n/60)}m`;
  if (n < 86400) return `${Math.floor(n/3600)}h`;
  return `${Math.floor(n/86400)}d`;
}
function translateRevert(err: unknown, mode: 'stake'|'unstake'|'approve'): string {
  const msg = err instanceof Error ? err.message : 'Transaction failed';
  if (msg.includes('LP_NotActive')) return 'This pool is currently disabled by governance.';
  if (msg.includes('LP_Zero')) return 'Amount must be greater than zero.';
  if (msg.includes('LP_InsufficientBalance')) return "You don't have that much staked.";
  if (msg.includes('LP_Cooldown')) return 'Unstake cooldown still in effect.';
  if (msg.includes('rejected') || msg.includes('denied')) return 'Transaction cancelled.';
  return `${mode} failed: ${msg.slice(0,80)}`;
}

export function StakingTab() {
  const { address: account, isConnected } = useAccount();
  const { LiquidityIncentives } = useContractAddresses();
  const { pools, isLoading: poolsLoading } = useAllPoolInfo();
  const cooldown = useUnstakeCooldown();

  const [selectedLp, setSelectedLp] = useState<Address | null>(null);
  const activePools = useMemo(() => pools.filter(p => p.active), [pools]);
  const firstActiveLp: Address | null = activePools[0]?.lpToken ?? null;
  const effectiveLp: Address | null = selectedLp ?? firstActiveLp;
  const selectedPool = useMemo(() => pools.find(p => p.lpToken === effectiveLp), [pools, effectiveLp]);

  const { data: userStake, refetch: refetchStake } = useUserStake(effectiveLp ?? undefined);
  const { allowance, refetch: refetchAllowance } = useLpAllowance(effectiveLp ?? undefined);

  const { data: lpBalanceRaw, refetch: refetchLpBalance } = useReadContract({
    address: effectiveLp ?? undefined, abi: erc20Abi, functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: { enabled: !!account && !!effectiveLp },
  });
  const lpBalance = (lpBalanceRaw as bigint | undefined) ?? 0n;

  const { approve, isPending: approving, isConfirmed: approveConfirmed } = useApproveLpToken();
  const { stake, isPending: staking, isConfirmed: stakeConfirmed } = useStake();
  const { unstake, isPending: unstaking, isConfirmed: unstakeConfirmed } = useUnstake();

  useEffect(() => {
    if (approveConfirmed) { void refetchAllowance(); void refetchLpBalance(); }
  }, [approveConfirmed, refetchAllowance, refetchLpBalance]);
  useEffect(() => {
    if (stakeConfirmed) { void refetchStake(); void refetchAllowance(); void refetchLpBalance(); }
  }, [stakeConfirmed, refetchStake, refetchAllowance, refetchLpBalance]);
  useEffect(() => {
    if (unstakeConfirmed) { void refetchStake(); void refetchLpBalance(); }
  }, [unstakeConfirmed, refetchStake, refetchLpBalance]);

  const [amount, setAmount] = useState('');
  let amountBn: bigint = 0n;
  let amountError: string | null = null;
  try { amountBn = amount ? parseUnits(amount, 18) : 0n; } catch { amountError = 'Enter a valid amount.'; }

  const needsApproval = amountBn > 0n && allowance < amountBn;
  const stakedAt = userStake?.stakedAt ?? 0n;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const cooldownEndsAt = stakedAt > 0n ? stakedAt + cooldown : 0n;
  const cooldownActive = stakedAt > 0n && cooldownEndsAt > now;
  const cooldownRemaining = cooldownActive ? cooldownEndsAt - now : 0n;

  if (!isConfiguredContractAddress(LiquidityIncentives)) return (
    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm gap-2">
      <AlertCircle size={32} className="text-zinc-600" />
      <p>LiquidityIncentives contract not deployed on this network.</p>
    </div>
  );

  if (!isConnected) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Wallet size={32} className="text-zinc-500" />
      <p className="text-zinc-400 text-sm">Connect your wallet to stake LP tokens.</p>
      <VfideConnectButton size="md" />
    </div>
  );

  async function handleApprove() {
    if (!effectiveLp || amountBn <= 0n) return;
    try { await approve(effectiveLp, amountBn); toast.success('Approval submitted.'); }
    catch (err) { toast.error(translateRevert(err, 'approve')); }
  }
  async function handleStake() {
    if (!effectiveLp || amountBn <= 0n) return;
    try { await stake(effectiveLp, amountBn); toast.success('Stake submitted.'); setAmount(''); }
    catch (err) { toast.error(translateRevert(err, 'stake')); }
  }
  async function handleUnstake() {
    if (!effectiveLp || amountBn <= 0n) return;
    try { await unstake(effectiveLp, amountBn); toast.success('Unstake submitted.'); setAmount(''); }
    catch (err) { toast.error(translateRevert(err, 'unstake')); }
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Coins size={24} className="text-accent" /> LP Staking
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Liquidity coordination — no yield or token rewards distributed (Howey-compliant).
        </p>
      </div>

      {poolsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      )}

      {!poolsLoading && activePools.length === 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
          <Coins className="mx-auto text-zinc-600 mb-3" size={40} />
          <p className="text-zinc-400">No active staking pools yet. New pools appear when governance enables them.</p>
        </div>
      )}

      {!poolsLoading && activePools.length > 0 && (
        <>
          {/* Pool selector */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <label htmlFor="staking-pool-select" className="text-sm font-bold text-zinc-300">Pool</label>
            <div className="relative">
              <select id="staking-pool-select" aria-label="Select staking pool"
                value={effectiveLp ?? ''}
                onChange={e => setSelectedLp(e.target.value as Address)}
                className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 pr-9 text-white text-sm focus:outline-none focus:border-accent/50">
                {activePools.map(p => (
                  <option key={p.lpToken} value={p.lpToken}>
                    {p.name || shortAddress(p.lpToken)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
            </div>
            {selectedPool && (
              <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                <span>Total staked: <span className="font-mono text-zinc-300">{formatUnits(selectedPool.totalStaked, 18)}</span></span>
                <span>LP: <span className="font-mono text-zinc-300">{shortAddress(selectedPool.lpToken)}</span></span>
              </div>
            )}
          </div>

          {/* Position */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-300">Your Position</h3>
              <button type="button" aria-label="Refresh stake info"
                onClick={() => { void refetchStake(); void refetchAllowance(); }}
                className="text-zinc-400 hover:text-accent transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-400">Staked</div>
                <div className="text-2xl font-bold text-white font-mono">{userStake ? formatUnits(userStake.amount, 18) : '0'}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Duration</div>
                <div className="text-2xl font-bold text-accent font-mono">{userStake ? formatDuration(userStake.stakeDuration) : '—'}</div>
              </div>
            </div>
            {cooldownActive && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2 text-xs">
                <Lock className="text-amber-400 shrink-0" size={14} />
                <span className="text-amber-300">Unstake cooldown: {formatDuration(cooldownRemaining)} remaining</span>
              </div>
            )}
          </div>

          {/* Amount input */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="staking-amount" className="text-sm font-bold text-zinc-300">Amount (LP tokens)</label>
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500">Wallet: <span className="font-mono text-zinc-300">{formatUnits(lpBalance, 18)}</span></span>
                <button type="button" onClick={() => setAmount(formatUnits(lpBalance, 18))}
                  className="text-accent hover:underline">Max</button>
              </div>
            </div>
            <input id="staking-amount" type="number" min="0" step="any" inputMode="decimal"
              placeholder="0.000000000000000000"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
            {amountError && <p className="text-red-400 text-xs">{amountError}</p>}
            <div className="flex gap-3">
              {needsApproval ? (
                <button type="button" disabled={!amountBn || approving} onClick={handleApprove}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {approving ? <><Loader2 size={14} className="animate-spin" /> Approving…</> : 'Approve LP Token'}
                </button>
              ) : (
                <>
                  <button type="button" disabled={!amountBn || staking || !!amountError} onClick={handleStake}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-accent text-zinc-900 hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {staking ? <><Loader2 size={14} className="animate-spin" /> Staking…</> : 'Stake'}
                  </button>
                  <button type="button" disabled={!amountBn || unstaking || cooldownActive || !!amountError || !userStake?.amount} onClick={handleUnstake}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {unstaking ? <><Loader2 size={14} className="animate-spin" /> Unstaking…</> : 'Unstake'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
