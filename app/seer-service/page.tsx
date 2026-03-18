'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  Scale,
  Shield,
  Sparkles,
  Timer,
  Wrench,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useAppealStatus, useProofScore } from '@/lib/vfide-hooks';
import { getSeerReasonCodeInfo } from '@/lib/seer/reasonCodes';
import {
  useSeerAggregatedAnalytics,
  useSeerReasonCodeTimeline,
  useSeerSystemStats,
  useSeerTimeline,
} from '@/hooks/useSeerInsights';

const SAFE_MODE_KEY = 'seer_safe_mode_enabled';

type ActionType = 'trade' | 'payment' | 'governance';

type ChangelogItem = {
  date: string;
  title: string;
  impact: string;
  rollback: string;
};

const changelog: ChangelogItem[] = [
  {
    date: '2026-03-13',
    title: 'Reason code support expanded in user flows',
    impact: 'Users can now map machine codes to clear guidance in appeals.',
    rollback: 'Disable code lookup UI; retain legacy reason text fallback.',
  },
  {
    date: '2026-03-12',
    title: 'Pre-action Seer automation across governance and escrow',
    impact: 'Risky actions can be delayed or blocked before execution.',
    rollback: 'Set module seerAutonomous to zero through governance path.',
  },
  {
    date: '2026-03-11',
    title: 'Class-based policy delay verification added',
    impact: 'Critical policy updates require enforced waiting windows.',
    rollback: 'Reschedule and execute policy rollback through guard.',
  },
];

export default function SeerServicePage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { score } = useProofScore(address);
  const { hasAppeal, resolved, timestamp } = useAppealStatus(address);
  const { events: timelineEvents, isLoading: timelineLoading } = useSeerTimeline(address);
  const { events: reasonCodeEvents, isLoading: reasonCodeLoading } = useSeerReasonCodeTimeline(address);
  const { stats: liveStats, isLoading: statsLoading } = useSeerSystemStats(address);
  const { analytics: aggregateAnalytics, isLoading: aggregateLoading } = useSeerAggregatedAnalytics(24 * 7);

  const [actionType, setActionType] = useState<ActionType>('trade');
  const [amount, setAmount] = useState('100');
  const [dailyCount, setDailyCount] = useState('1');
  const [counterparty, setCounterparty] = useState('');
  const [reasonCodeInput, setReasonCodeInput] = useState('121');
  const [safeMode, setSafeMode] = useState(true);

  const [shadowAutoRestrict, setShadowAutoRestrict] = useState(4200);
  const [shadowRateLimit, setShadowRateLimit] = useState(5100);
  const sentTelemetryKeys = useRef<Set<string>>(new Set());

  const postSeerMetrics = async (
    metrics: Array<{
      event: string;
      properties?: Record<string, unknown>;
      value?: number;
      timestamp?: number;
    }>
  ) => {
    if (metrics.length === 0) return;

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
    } catch {
      // Non-blocking telemetry path.
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SAFE_MODE_KEY);
    if (stored === 'true' || stored === 'false') {
      setSafeMode(stored === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SAFE_MODE_KEY, String(safeMode));
  }, [safeMode]);

  useEffect(() => {
    const viewKey = `seer_service_view:${address ?? 'anon'}:${chainId}`;
    if (sentTelemetryKeys.current.has(viewKey)) return;
    sentTelemetryKeys.current.add(viewKey);

    void postSeerMetrics([
      {
        event: 'seer_service_view',
        properties: {
          address: address ?? null,
          chainId,
        },
      },
    ]);
  }, [address, chainId]);

  const scoreValue = Number(score || 5000);
  const parsedAmount = Number.parseFloat(amount || '0');
  const parsedDailyCount = Number.parseInt(dailyCount || '0', 10);

  const coachMessage = useMemo(() => {
    if (scoreValue < 2000) {
      return 'High risk state. Use small actions only, collect evidence, and submit appeal if enforcement is inaccurate.';
    }
    if (scoreValue < 4000) {
      return 'Caution state. Reduce action frequency and avoid large amounts until trust recovers.';
    }
    if (scoreValue < 6000) {
      return 'Balanced state. Keep activity consistent and avoid bursts that can trigger pattern checks.';
    }
    return 'Healthy trust state. Continue normal activity and keep safe operational habits.';
  }, [scoreValue]);

  const preflight = useMemo(() => {
    let riskPoints = 0;
    if (scoreValue < 4000) riskPoints += 3;
    if (parsedAmount >= 1000) riskPoints += 2;
    if (parsedDailyCount >= 10) riskPoints += 2;
    if (counterparty.startsWith('0x0000')) riskPoints += 2;
    if (actionType === 'governance' && scoreValue < 5400) riskPoints += 3;
    if (safeMode) riskPoints = Math.max(0, riskPoints - 1);

    const tier = riskPoints >= 7 ? 'Blocked likely' : riskPoints >= 4 ? 'Delayed likely' : riskPoints >= 2 ? 'Warned likely' : 'Allowed likely';
    const recommendation =
      tier === 'Blocked likely'
        ? 'Do not submit this action yet. Use Seer appeal and reduce risk factors first.'
        : tier === 'Delayed likely'
          ? 'Lower size/frequency and retry. Keep evidence ready.'
          : tier === 'Warned likely'
            ? 'Action may proceed with warning. Keep tx metadata in case review is needed.'
            : 'Proceed with normal caution.';

    return { tier, recommendation };
  }, [scoreValue, parsedAmount, parsedDailyCount, counterparty, actionType, safeMode]);

  const reasonCode = Number.parseInt(reasonCodeInput, 10);
  const reasonInfo = Number.isNaN(reasonCode) ? null : getSeerReasonCodeInfo(reasonCode);

  const sla = useMemo(() => {
    if (!hasAppeal || !timestamp) {
      return {
        initialReviewHoursLeft: null,
        finalResolutionDaysLeft: null,
      };
    }

    const filedAt = new Date(timestamp).getTime();
    const now = Date.now();
    const initialMs = 72 * 60 * 60 * 1000;
    const finalMs = 14 * 24 * 60 * 60 * 1000;

    return {
      initialReviewHoursLeft: Math.max(0, Math.ceil((filedAt + initialMs - now) / (60 * 60 * 1000))),
      finalResolutionDaysLeft: Math.max(0, Math.ceil((filedAt + finalMs - now) / (24 * 60 * 60 * 1000))),
    };
  }, [hasAppeal, timestamp]);

  const recoveryStage = useMemo(() => {
    if (scoreValue < 2500) return { stage: 1, label: 'Restricted', guidance: 'Only low-risk operations recommended.' };
    if (scoreValue < 4500) return { stage: 2, label: 'Limited', guidance: 'Moderate actions allowed with tighter monitoring.' };
    if (scoreValue < 6500) return { stage: 3, label: 'Monitored', guidance: 'Most actions available with active watch.' };
    return { stage: 4, label: 'Normal', guidance: 'Normal access with baseline protections.' };
  }, [scoreValue]);

  const fairnessStats = {
    recentScoreUpdates: aggregateAnalytics?.summary.scoreSetEvents ?? liveStats.recentScoreUpdates,
    uniqueSubjects: aggregateAnalytics?.summary.uniqueSubjects ?? liveStats.uniqueSubjects,
    avgDeltaAbs: aggregateAnalytics?.summary.avgScoreDeltaAbs ?? liveStats.avgDeltaAbs,
    pendingAppeals: liveStats.pendingAppeals,
    userAdjustments: liveStats.userAdjustments,
    blockedRate: aggregateAnalytics?.summary.blockedRate ?? 0,
    delayedRate: aggregateAnalytics?.summary.delayedRate ?? 0,
    appealResolutionRate: aggregateAnalytics?.summary.appealResolutionRate ?? 0,
    topReasonCodes: aggregateAnalytics?.topReasonCodes ?? [],
  };

  useEffect(() => {
    if (timelineEvents.length === 0) return;

    const metrics: Array<{
      event: string;
      properties?: Record<string, unknown>;
      value?: number;
      timestamp?: number;
    }> = [];

    for (const evt of timelineEvents) {
      const key = `seer_score_set:${evt.txHash}:${evt.blockNumber.toString()}`;
      if (sentTelemetryKeys.current.has(key)) continue;
      sentTelemetryKeys.current.add(key);

      metrics.push({
        event: 'seer_score_set',
        value: evt.delta,
        properties: {
          txHash: evt.txHash,
          blockNumber: evt.blockNumber.toString(),
          oldScore: evt.oldScore,
          newScore: evt.newScore,
          score_delta: evt.delta,
          reason: evt.reason || null,
          address: address ?? null,
        },
      });
    }

    if (metrics.length > 0) {
      void postSeerMetrics(metrics);
    }
  }, [timelineEvents, address]);

  useEffect(() => {
    if (reasonCodeEvents.length === 0) return;

    const metrics: Array<{
      event: string;
      properties?: Record<string, unknown>;
      value?: number;
      timestamp?: number;
    }> = [];

    for (const evt of reasonCodeEvents) {
      const key = `seer_reason_code:${evt.source}:${evt.txHash}:${evt.blockNumber.toString()}:${evt.reasonCode}`;
      if (sentTelemetryKeys.current.has(key)) continue;
      sentTelemetryKeys.current.add(key);

      metrics.push({
        event: 'seer_reason_code',
        properties: {
          txHash: evt.txHash,
          blockNumber: evt.blockNumber.toString(),
          source: evt.source,
          reasonCode: evt.reasonCode,
          reason: evt.reason || null,
          address: address ?? null,
        },
      });
    }

    if (metrics.length > 0) {
      void postSeerMetrics(metrics);
    }
  }, [reasonCodeEvents, address]);

  useEffect(() => {
    if (!hasAppeal) return;

    const openedKey = `seer_appeal_opened:${address ?? 'anon'}:${timestamp ?? 'na'}`;
    if (!sentTelemetryKeys.current.has(openedKey)) {
      sentTelemetryKeys.current.add(openedKey);
      void postSeerMetrics([
        {
          event: 'seer_appeal_opened',
          properties: {
            address: address ?? null,
            resolved,
            timestamp: timestamp ?? null,
          },
        },
      ]);
    }

    if (resolved) {
      const resolvedKey = `seer_appeal_resolved:${address ?? 'anon'}:${timestamp ?? 'na'}`;
      if (sentTelemetryKeys.current.has(resolvedKey)) return;
      sentTelemetryKeys.current.add(resolvedKey);

      void postSeerMetrics([
        {
          event: 'seer_appeal_resolved',
          properties: {
            address: address ?? null,
            timestamp: timestamp ?? null,
          },
        },
      ]);
    }
  }, [address, hasAppeal, resolved, timestamp]);

  const shadowModeResult = useMemo(() => {
    const baselineRestrict = 4000;
    const baselineRateLimit = 5000;

    const restrictDelta = shadowAutoRestrict - baselineRestrict;
    const rateDelta = shadowRateLimit - baselineRateLimit;

    const estimatedStricterPct = Math.max(0, Math.round((restrictDelta + rateDelta) / 50));
    const estimatedUserFriction = Math.max(0, Math.round((restrictDelta + rateDelta) / 80));

    return { estimatedStricterPct, estimatedUserFriction };
  }, [shadowAutoRestrict, shadowRateLimit]);

  useEffect(() => {
    const eventType =
      preflight.tier === 'Blocked likely'
        ? 'seer_action_blocked'
        : preflight.tier === 'Delayed likely'
          ? 'seer_action_delayed'
          : preflight.tier === 'Warned likely'
            ? 'seer_action_warned'
            : 'seer_action_allowed';

    const key = `seer_preflight:${address ?? 'anon'}:${eventType}:${actionType}:${parsedAmount}:${parsedDailyCount}:${counterparty}:${safeMode}`;
    if (sentTelemetryKeys.current.has(key)) return;
    sentTelemetryKeys.current.add(key);

    void postSeerMetrics([
      {
        event: eventType,
        properties: {
          address: address ?? null,
          actionType,
          amount: parsedAmount,
          dailyCount: parsedDailyCount,
          counterparty: counterparty || null,
          safeMode,
          projectedTier: preflight.tier,
        },
      },
    ]);
  }, [
    address,
    actionType,
    parsedAmount,
    parsedDailyCount,
    counterparty,
    safeMode,
    preflight.tier,
  ]);

  return (
    <>
      <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
          <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-emerald-500/10 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-300/30 bg-cyan-500/10 text-cyan-200 text-xs mb-3">
              <Sparkles className="w-4 h-4" /> Seer Service Center
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Seer Utility Suite</h1>
            <p className="text-zinc-300 max-w-4xl">
              One place for user coaching, risk preflight, timeline insight, appeals SLA, recovery stage visibility, and governance transparency.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-white/10 border border-white/10">wallet: {address ?? 'not connected'}</span>
              <span className="px-2 py-1 rounded bg-white/10 border border-white/10">chainId: {chainId}</span>
              <span className="px-2 py-1 rounded bg-white/10 border border-white/10">proofScore: {scoreValue}</span>
            </div>
          </section>

          <section className="grid xl:grid-cols-2 gap-4">
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Compass className="w-5 h-5" /> Personal Seer Coach
              </div>
              <p className="text-sm text-zinc-300">{coachMessage}</p>
              <div className="text-xs text-zinc-400">Tip: keep tx hash + reason code for any denied action.</div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Wrench className="w-5 h-5" /> Action Preflight Checker
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <select value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)} className="bg-black/40 border border-zinc-700 rounded p-2">
                  <option value="trade">Trade</option>
                  <option value="payment">Payment</option>
                  <option value="governance">Governance</option>
                </select>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount" className="bg-black/40 border border-zinc-700 rounded p-2" />
                <input value={dailyCount} onChange={(e) => setDailyCount(e.target.value)} placeholder="actions today" className="bg-black/40 border border-zinc-700 rounded p-2" />
                <input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="counterparty (optional)" className="bg-black/40 border border-zinc-700 rounded p-2" />
              </div>
              <div className="text-sm">
                <span className="text-zinc-400">Projected outcome: </span>
                <span className="text-emerald-300 font-semibold">{preflight.tier}</span>
              </div>
              <div className="text-xs text-zinc-300">{preflight.recommendation}</div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Activity className="w-5 h-5" /> Seer Timeline
              </div>
              <div className="space-y-2 text-sm">
                <div className="p-2 rounded bg-black/30 border border-zinc-800">Now: trust level {recoveryStage.label} (score {scoreValue})</div>
                {timelineLoading && <div className="p-2 rounded bg-black/30 border border-zinc-800 text-zinc-400">Loading on-chain score events...</div>}
                {!timelineLoading && timelineEvents.length === 0 && (
                  <div className="p-2 rounded bg-black/30 border border-zinc-800 text-zinc-400">No recent ScoreSet events found for this wallet in the recent chain window.</div>
                )}
                {!timelineLoading && timelineEvents.slice(0, 3).map((evt) => (
                  <div key={`${evt.txHash}-${evt.blockNumber}`} className="p-2 rounded bg-black/30 border border-zinc-800">
                    <div className="text-zinc-200">{evt.delta >= 0 ? '+' : ''}{evt.delta} points ({evt.oldScore} to {evt.newScore})</div>
                    <div className="text-xs text-zinc-400">reason: {evt.reason || 'n/a'} | block: {evt.blockNumber.toString()}</div>
                  </div>
                ))}
                {reasonCodeLoading && <div className="p-2 rounded bg-black/30 border border-zinc-800 text-zinc-400">Loading reason-code enforcement events...</div>}
                {!reasonCodeLoading && reasonCodeEvents.slice(0, 3).map((evt) => {
                  const info = getSeerReasonCodeInfo(evt.reasonCode);
                  return (
                    <div key={`${evt.source}-${evt.txHash}-${evt.blockNumber}`} className="p-2 rounded bg-black/30 border border-zinc-800">
                      <div className="text-zinc-200">{evt.source} code {evt.reasonCode}{info ? ` (${info.key})` : ''}</div>
                      <div className="text-xs text-zinc-400">reason: {evt.reason || info?.userMeaning || 'n/a'} | block: {evt.blockNumber.toString()}</div>
                    </div>
                  );
                })}
                <div className="p-2 rounded bg-black/30 border border-zinc-800">Recovery guidance: {recoveryStage.guidance}</div>
              </div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Timer className="w-5 h-5" /> Appeal SLA Tracker
              </div>
              {!hasAppeal ? (
                <p className="text-sm text-zinc-400">No active appeal found. Open Appeals to submit one if needed.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">
                    Initial review ETA: {sla.initialReviewHoursLeft === null ? 'n/a' : `${sla.initialReviewHoursLeft}h`}
                  </div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">
                    Final resolution ETA: {sla.finalResolutionDaysLeft === null ? 'n/a' : `${sla.finalResolutionDaysLeft}d`}
                  </div>
                  <div className="text-xs text-zinc-400">Status: {resolved ? 'resolved' : 'pending review'}</div>
                </div>
              )}
              <Link href="/appeals" className="text-xs text-cyan-300 hover:text-cyan-200">Open Appeals Center</Link>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <AlertTriangle className="w-5 h-5" /> Counterparty Risk Hints
              </div>
              <p className="text-sm text-zinc-300">
                {counterparty.trim().length === 0
                  ? 'Enter counterparty in preflight to see hints.'
                  : counterparty.startsWith('0x0000')
                    ? 'High caution: unusual counterparty pattern detected.'
                    : parsedAmount > 5000
                      ? 'Medium caution: large notional amount for current trust state.'
                      : 'Low caution: no obvious risk flag from basic checks.'}
              </p>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Progressive Permission Recovery
              </div>
              <div className="text-sm text-zinc-300">Current stage {recoveryStage.stage}/4: {recoveryStage.label}</div>
              <div className="text-xs text-zinc-400">{recoveryStage.guidance}</div>
              <div className="w-full bg-zinc-800 rounded h-2 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${(recoveryStage.stage / 4) * 100}%` }} />
              </div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Shield className="w-5 h-5" /> New-User Safe Mode
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={safeMode} onChange={(e) => setSafeMode(e.target.checked)} />
                Enable safer defaults for trading and high-risk actions
              </label>
              <p className="text-xs text-zinc-400">Stored locally for this device.</p>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <BarChart3 className="w-5 h-5" /> Fairness and Drift Monitor
              </div>
              {statsLoading || aggregateLoading ? (
                <div className="text-sm text-zinc-400">Loading live Seer stats from chain logs...</div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Score updates (window): {fairnessStats.recentScoreUpdates}</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Unique impacted subjects: {fairnessStats.uniqueSubjects}</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Avg score delta magnitude: {fairnessStats.avgDeltaAbs}</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Pending appeals (global): {fairnessStats.pendingAppeals}</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800 sm:col-span-2">Your score adjustments (window): {fairnessStats.userAdjustments}</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Blocked rate (7d): {(fairnessStats.blockedRate * 100).toFixed(1)}%</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800">Delayed rate (7d): {(fairnessStats.delayedRate * 100).toFixed(1)}%</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800 sm:col-span-2">Appeal resolution ratio (7d): {(fairnessStats.appealResolutionRate * 100).toFixed(1)}%</div>
                  <div className="p-2 rounded bg-black/30 border border-zinc-800 sm:col-span-2">
                    Top reason codes (7d): {fairnessStats.topReasonCodes.length > 0 ? fairnessStats.topReasonCodes.map((item) => `${item.code} (${item.count})`).join(', ') : 'n/a'}
                  </div>
                </div>
              )}
              <div className="text-[11px] text-zinc-500">Data source: persisted analytics_events Seer aggregates + on-chain fallback (ScoreSet logs and SeerSocial.pendingAppealCount)</div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <Scale className="w-5 h-5" /> Shadow-Mode Policy Testing
              </div>
              <div className="space-y-2 text-sm">
                <label className="block">Auto-restrict threshold: {shadowAutoRestrict}
                  <input type="range" min={3000} max={6000} value={shadowAutoRestrict} onChange={(e) => setShadowAutoRestrict(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">Rate-limit threshold: {shadowRateLimit}
                  <input type="range" min={3500} max={7000} value={shadowRateLimit} onChange={(e) => setShadowRateLimit(Number(e.target.value))} className="w-full" />
                </label>
              </div>
              <div className="text-xs text-zinc-300">
                Estimated stricter enforcement: {shadowModeResult.estimatedStricterPct}% | Estimated user friction change: {shadowModeResult.estimatedUserFriction}%
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <BookOpen className="w-5 h-5" /> Governance-Visible Seer Changelog
            </div>
            <div className="space-y-2">
              {changelog.map((item) => (
                <div key={`${item.date}-${item.title}`} className="p-3 rounded border border-zinc-800 bg-black/20">
                  <div className="text-xs text-zinc-500">{item.date}</div>
                  <div className="text-sm text-zinc-100 font-medium">{item.title}</div>
                  <div className="text-xs text-zinc-300">Impact: {item.impact}</div>
                  <div className="text-xs text-zinc-400">Rollback: {item.rollback}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Link href="/seer-academy" className="px-2 py-1 rounded border border-cyan-400/30 text-cyan-300">Seer Academy</Link>
              <Link href="/appeals" className="px-2 py-1 rounded border border-cyan-400/30 text-cyan-300">Appeals Center</Link>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-2">
            <div className="text-cyan-300 font-semibold">Reason Code Quick Insight</div>
            <div className="flex flex-wrap gap-2">
              <input
                value={reasonCodeInput}
                onChange={(e) => setReasonCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="enter code"
                className="bg-black/40 border border-zinc-700 rounded p-2 text-sm"
              />
              <Clock3 className="w-5 h-5 text-zinc-500 mt-2" />
            </div>
            <div className="text-sm text-zinc-300">
              {reasonInfo
                ? `Code ${reasonInfo.code} (${reasonInfo.key}): ${reasonInfo.userMeaning}`
                : 'Enter a known reason code to get user-readable interpretation.'}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
