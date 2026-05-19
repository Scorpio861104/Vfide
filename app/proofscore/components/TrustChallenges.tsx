'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Shield, Zap, Users, CheckCircle, Lock } from 'lucide-react';
import { CARD_BOUND_VAULT_ABI } from '@/lib/abis';
import { getFutureContractAddress } from '@/lib/contracts/future-contracts';

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  href: string;
  minScore?: number;
  checkCompleted: (data: { guardianCount?: number; hasVault?: boolean }) => boolean;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'create_vault',
    title: 'Create Your Vault',
    description: 'Deploy your first CardBound Vault',
    reward: 500,
    difficulty: 'Easy',
    href: '/vault/create',
    checkCompleted: ({ hasVault }) => !!hasVault,
  },
  {
    id: 'first_payment',
    title: 'Make First Payment',
    description: 'Complete your first on-chain payment',
    reward: 100,
    difficulty: 'Easy',
    href: '/pay',
    checkCompleted: () => false,
  },
  {
    id: 'add_guardians',
    title: 'Add Guardians',
    description: 'Add 2+ guardians to your vault',
    reward: 300,
    difficulty: 'Medium',
    href: '/vault/guardians',
    checkCompleted: ({ guardianCount }) => (guardianCount ?? 0) >= 2,
  },
  {
    id: 'identity_verify',
    title: 'Verify Identity',
    description: 'Complete identity verification',
    reward: 500,
    difficulty: 'Medium',
    href: '/profile',
    checkCompleted: () => false,
  },
  {
    id: 'five_payments',
    title: 'Power User',
    description: 'Complete 5 payments',
    reward: 250,
    difficulty: 'Medium',
    href: '/pay',
    checkCompleted: () => false,
  },
  {
    id: 'get_endorsed',
    title: 'Get Endorsed',
    description: 'Receive an endorsement from a Trusted+ user',
    reward: 200,
    difficulty: 'Hard',
    href: '/social-hub',
    minScore: 3000,
    checkCompleted: () => false,
  },
  {
    id: 'repay_loan',
    title: 'Repay a Loan',
    description: 'Repay a loan on time',
    reward: 150,
    difficulty: 'Hard',
    href: '/vault',
    minScore: 3000,
    checkCompleted: () => false,
  },
  {
    id: 'endorse_others',
    title: 'Pay It Forward',
    description: 'Endorse another user',
    reward: 100,
    difficulty: 'Easy',
    href: '/social-hub',
    minScore: 5000,
    checkCompleted: () => false,
  },
];

const DIFFICULTY_COLORS = {
  Easy: 'bg-emerald-500/20 text-emerald-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  Hard: 'bg-red-500/20 text-red-400',
};

export function TrustChallenges({ userScore = 0 }: { userScore?: number }) {
  const { address } = useAccount();
  const router = useRouter();
  const vaultAddress = getFutureContractAddress('TrustScorePassport') as `0x${string}` | undefined;

  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultAddress },
  });

  const context = { guardianCount: Number(guardianCount ?? 0n), hasVault: !!vaultAddress };

  const sorted = [...CHALLENGES].sort((a, b) => {
    const aLocked = (a.minScore ?? 0) > userScore;
    const bLocked = (b.minScore ?? 0) > userScore;
    const aDone = a.checkCompleted(context);
    const bDone = b.checkCompleted(context);
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    if (aLocked && !bLocked) return 1;
    if (!aLocked && bLocked) return -1;
    return 0;
  });

  const completed = sorted.filter(c => c.checkCompleted(context)).length;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          <h3 className="font-semibold text-slate-200">Trust Challenges</h3>
        </div>
        <span className="text-xs text-slate-400">{completed}/{sorted.length} done</span>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${(completed / sorted.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {sorted.map((c) => {
          const isLocked = (c.minScore ?? 0) > userScore;
          const isDone = c.checkCompleted(context);

          return (
            <button
              key={c.id}
              onClick={() => !isLocked && router.push(c.href)}
              disabled={isLocked}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                ${isDone ? 'border-emerald-700/50 bg-emerald-900/20 opacity-70' : ''}
                ${isLocked ? 'border-slate-700/50 bg-slate-800/30 opacity-50 cursor-not-allowed' : ''}
                ${!isDone && !isLocked ? 'border-slate-700 bg-slate-700/30 hover:bg-slate-700/60 cursor-pointer' : ''}
              `}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle size={18} className="text-emerald-400" />
                ) : isLocked ? (
                  <Lock size={18} className="text-slate-500" />
                ) : (
                  <Shield size={18} className="text-blue-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{c.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                {isLocked && c.minScore && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requires score ≥ {c.minScore.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-bold text-yellow-400">+{c.reward}</span>
                <div className="text-xs text-slate-500">pts</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
