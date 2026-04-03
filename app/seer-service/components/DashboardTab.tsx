'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useProofScore } from '@/lib/vfide-hooks';

const SAFE_MODE_KEY = 'seer_safe_mode_enabled';
const REASON_CODE_HELP: Record<string, string> = {
  '100': 'Code 100 — normal allow path with low intervention risk.',
  '300': 'Code 300 — action may be delayed for additional monitoring.',
  '500': 'Code 500 — manual review or governance escalation is recommended before retrying.',
};

export function DashboardTab() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { score = 0 } = useProofScore(address);

  const [intent, setIntent] = useState('Trade');
  const [amount, setAmount] = useState('250');
  const [actionsToday, setActionsToday] = useState('1');
  const [counterparty, setCounterparty] = useState('');
  const [safeMode, setSafeMode] = useState(true);
  const [reasonCode, setReasonCode] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = window.localStorage.getItem(SAFE_MODE_KEY);
    if (saved !== null) {
      setSafeMode(saved === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SAFE_MODE_KEY, String(safeMode));
  }, [safeMode]);

  const projectedOutcome = useMemo(() => {
    const parsedAmount = Number(amount) || 0;
    const parsedActions = Number(actionsToday) || 0;
    const normalizedIntent = intent.toLowerCase();
    const normalizedCounterparty = counterparty.trim().toLowerCase();
    const unusualCounterparty = normalizedCounterparty.startsWith('0x0000') || normalizedCounterparty.endsWith('1234');

    const risks: string[] = [];
    if (normalizedIntent === 'governance') {
      risks.push('Governance actions are reviewed more closely below premium trust thresholds.');
    }
    if (parsedAmount >= 1500) {
      risks.push('Large transfer amount increases scrutiny.');
    }
    if (parsedActions >= 10) {
      risks.push('Rapid activity velocity suggests elevated review risk.');
    }
    if (unusualCounterparty) {
      risks.push('High caution: unusual counterparty pattern detected.');
    }

    const blocked = score <= 3500 || (normalizedIntent === 'governance' && (parsedAmount >= 1500 || parsedActions >= 10 || unusualCounterparty));
    const review = !blocked && (score < 6000 || parsedAmount >= 750 || parsedActions >= 6);

    return {
      label: blocked ? 'Blocked likely' : review ? 'Review likely' : 'Allowed likely',
      guidance: blocked
        ? 'Do not submit this action yet.'
        : review
          ? 'Expect extra checks before settlement completes.'
          : 'Current inputs are within the normal operating range.',
      risks,
    };
  }, [actionsToday, amount, counterparty, intent, score]);

  const reasonSummary = reasonCode.trim() ? REASON_CODE_HELP[reasonCode.trim()] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Preflight Console</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500 uppercase tracking-wide">Wallet</div>
            <div className="text-white break-all">{address ? `Wallet: ${address}` : 'Wallet: Not connected'}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase tracking-wide">Chain</div>
            <div className="text-white">{chainId}</div>
          </div>
          <div>
            <div className="text-gray-500 uppercase tracking-wide">ProofScore</div>
            <div className="text-white">{score.toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <div className="text-sm text-gray-300">Projected outcome:</div>
          <div className="text-xl font-bold text-white mt-1">{projectedOutcome.label}</div>
          <p className="text-sm text-gray-300 mt-1">{projectedOutcome.guidance}</p>
          {projectedOutcome.risks.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-200 list-disc pl-5">
              {projectedOutcome.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-white">Preflight Inputs</h3>

          <label className="block text-sm text-gray-300">
            Action type
            <select
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="Trade">Trade</option>
              <option value="governance">Governance</option>
              <option value="payroll">Payroll</option>
            </select>
          </label>

          <label className="block text-sm text-gray-300">
            Amount
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="amount"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
            />
          </label>

          <label className="block text-sm text-gray-300">
            Actions today
            <input
              type="number"
              value={actionsToday}
              onChange={(event) => setActionsToday(event.target.value)}
              placeholder="actions today"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
            />
          </label>

          <label className="block text-sm text-gray-300">
            Counterparty
            <input
              type="text"
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
              placeholder="counterparty"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
            />
          </label>
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-white">Controls & Interpretation</h3>

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(event) => setSafeMode(event.target.checked)}
              className="h-4 w-4"
            />
            Safe mode enabled
          </label>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Reason code interpreter</label>
            <input
              type="text"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              placeholder="Enter code"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
            />
          </div>

          {reasonSummary ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-white font-semibold">Interpretation</div>
              <p className="text-sm text-gray-200 mt-1">{reasonSummary}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Enter a known review code to see a plain-language explanation.</p>
          )}
        </div>
      </div>
    </div>
  );
}
