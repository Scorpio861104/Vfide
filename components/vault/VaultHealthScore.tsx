'use client';

import { useAccount, useReadContract } from 'wagmi';
import { Shield, Info } from 'lucide-react';
import { CardBoundVaultABI as CARD_BOUND_VAULT_ABI } from '@/lib/abis';
import { computeVaultHealth, type VaultHealthDimension as Dimension } from '@/lib/vault/vaultHealth';

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

  const { data: maxPerTransfer } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'maxPerTransfer',
    query: { enabled: !!vaultAddress },
  });

  const { data: dailyTransferLimit } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'dailyTransferLimit',
    query: { enabled: !!vaultAddress },
  });

  const { data: paused } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'paused',
    query: { enabled: !!vaultAddress },
  });

  // Wave 85: scoring moved to the tested lib/vault/vaultHealth engine (parity with commerce institutions).
  const { total, grade, dimensions } = computeVaultHealth({
    guardianCount: Number(guardianCount ?? 0n),
    transferLimit: Number(maxPerTransfer ?? dailyTransferLimit ?? 0n),
    isOperational: !Boolean(paused),
    hasVault: !!vaultAddress,
    proofScore,
  });
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
