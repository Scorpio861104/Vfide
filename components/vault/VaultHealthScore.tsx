'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Shield, Info } from 'lucide-react';
import { CardBoundVaultABI as CARD_BOUND_VAULT_ABI } from '@/lib/abis';

interface Dimension {
  label: string;
  score: number;
  maxScore: number;
  recommendations: string[];
}

function DimensionBar({ dim }: { dim: Dimension }) {
  const pct = (dim.score / dim.maxScore) * 100;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{dim.label}</span>
        <span className="text-slate-400">{dim.score}/{dim.maxScore}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {dim.recommendations.length > 0 && (
        <ul className="space-y-0.5 mt-1">
          {dim.recommendations.map((r, i) => (
            <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
              <Info size={10} className="shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VaultHealthScore({
  vaultAddress,
  proofScore = 0,
}: {
  vaultAddress?: `0x${string}`;
  proofScore?: number;
}) {
  useAccount();

  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });

  const { data: spendLimit } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'spendLimit',
    query: { enabled: !!vaultAddress },
  });

  const { data: isLocked } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isLocked',
    query: { enabled: !!vaultAddress },
  });

  const gc = Number(guardianCount ?? 0n);
  const sl = Number(spendLimit ?? 0n);
  const locked = Boolean(isLocked);
  const hasVault = !!vaultAddress;

  // Security dimension (0-25)
  const securityRecs: string[] = [];
  let securityScore = 0;
  if (gc >= 3) securityScore += 15;
  else if (gc >= 1) { securityScore += 8; securityRecs.push('Add more guardians (3+ recommended)'); }
  else securityRecs.push('Add guardians to protect your vault');
  if (sl > 0) securityScore += 10;
  else securityRecs.push('Set a spend limit to prevent large unauthorized transactions');

  // Recovery dimension (0-25)
  const recoveryRecs: string[] = [];
  let recoveryScore = 0;
  if (gc >= 2) recoveryScore += 20;
  else if (gc >= 1) { recoveryScore += 10; recoveryRecs.push('Add a second guardian for recovery redundancy'); }
  else recoveryRecs.push('Guardians are required for vault recovery');
  if (gc >= 3) recoveryScore += 5;

  // Trust dimension (0-25)
  const trustRecs: string[] = [];
  let trustScore = 0;
  if (proofScore >= 7000) trustScore = 25;
  else if (proofScore >= 5000) { trustScore = 18; trustRecs.push('Reach 7,000 for Elite trust benefits'); }
  else if (proofScore >= 3000) { trustScore = 12; trustRecs.push('Grow your ProofScore for better rates'); }
  else { trustScore = 5; trustRecs.push('Build your ProofScore to unlock benefits'); }

  // Setup dimension (0-25)
  const setupRecs: string[] = [];
  let setupScore = 0;
  if (hasVault) setupScore += 15;
  else setupRecs.push('Create a vault to get started');
  if (sl > 0) setupScore += 5;
  if (!locked) setupScore += 5;

  const dimensions: Dimension[] = [
    { label: 'Security', score: securityScore, maxScore: 25, recommendations: securityRecs },
    { label: 'Recovery', score: recoveryScore, maxScore: 25, recommendations: recoveryRecs },
    { label: 'Trust', score: trustScore, maxScore: 25, recommendations: trustRecs },
    { label: 'Setup', score: setupScore, maxScore: 25, recommendations: setupRecs },
  ];

  const total = securityScore + recoveryScore + trustScore + setupScore;
  const grade = total >= 85 ? 'Excellent' : total >= 70 ? 'Good' : total >= 50 ? 'Fair' : total >= 30 ? 'Needs Work' : 'At Risk';
  const gradeColor = total >= 85 ? 'text-emerald-400' : total >= 70 ? 'text-blue-400' : total >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-blue-400" />
          <h3 className="font-semibold text-slate-200">Vault Health</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-100">{total}<span className="text-sm text-slate-400">/100</span></div>
          <div className={`text-xs font-medium ${gradeColor}`}>{grade}</div>
        </div>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-2 mb-5">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${total >= 85 ? 'bg-emerald-500' : total >= 70 ? 'bg-blue-500' : total >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${total}%` }}
        />
      </div>

      <div className="space-y-4">
        {dimensions.map(d => <DimensionBar key={d.label} dim={d} />)}
      </div>
    </div>
  );
}
