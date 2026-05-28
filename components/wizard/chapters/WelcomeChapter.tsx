'use client';

import { Sparkles, Shield, KeyRound, Wallet, CreditCard, BarChart3 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

import { ChapterShell } from '../ChapterShell';

interface WelcomeChapterProps {
  onContinue: () => void;
  onSkipAll: () => void;
}

export function WelcomeChapter({ onContinue, onSkipAll }: WelcomeChapterProps) {
  const { isConnected } = useAccount();

  return (
    <ChapterShell
      chapter="welcome"
      description="Five quick chapters to get your vault, guardians, and first payment ready. You can stop after any step and come back later — the only required one is creating your vault."
      onPrimary={isConnected ? onContinue : () => {/* no-op until connected */}}
      primaryLabel={isConnected ? 'Start setup' : 'Connect wallet to start'}
      primaryDisabled={!isConnected}
      onSkip={onSkipAll}
    >
      {/* Wallet connect prompt — shown only when not connected */}
      {!isConnected && (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-accent/30 bg-cyan-500/8 p-4 text-center">
          <Wallet className="text-accent" size={28} aria-hidden />
          <p className="text-sm text-white/80 font-medium">
            Connect your wallet to begin setup
          </p>
          <p className="text-xs text-white/50">
            Your vault is owned by your wallet — VFIDE never holds your funds.
          </p>
          <VfideConnectButton size="md" />
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {
            icon: Shield,
            color: 'text-accent',
            title: 'Create your vault',
            sub: 'Required — everything else depends on it.',
          },
          {
            icon: Wallet,
            color: 'text-emerald-300',
            title: 'Set spend limits',
            sub: 'Per-transfer and per-day caps protect against drain.',
          },
          {
            icon: KeyRound,
            color: 'text-purple-300',
            title: 'Add guardians',
            sub: 'Trusted contacts who can help rotate your wallet.',
          },
          {
            icon: CreditCard,
            color: 'text-amber-300',
            title: 'Approve merchant payments',
            sub: 'Optional — only if you plan to pay merchants directly.',
          },
          {
            icon: BarChart3,
            color: 'text-pink-300',
            title: 'ProofScore & first payment',
            sub: 'How trust translates to lower fees.',
          },
          {
            icon: Sparkles,
            color: 'text-accent',
            title: 'You can turn the wizard off',
            sub: 'Toggle it back on later from settings if you change your mind.',
          },
        ].map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
          >
            <item.icon className={`${item.color} flex-shrink-0`} size={20} aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="text-xs text-white/60">{item.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </ChapterShell>
  );
}
