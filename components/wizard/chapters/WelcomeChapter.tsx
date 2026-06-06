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
      description="Most crypto leaves users on their own. VFIDE combines protected vaults, recovery systems, trust tooling, and payment rails so you can stay in control with better safety defaults."
      onPrimary={isConnected ? onContinue : () => {/* no-op until connected */}}
      primaryLabel={isConnected ? 'Begin Setup' : 'Connect wallet to begin'}
      primaryDisabled={!isConnected}
      onSkip={onSkipAll}
    >
      {/* Wallet connect prompt — shown only when not connected */}
      {!isConnected && (
        <div className="mb-4 flex flex-col items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/8 p-4 text-center">
          <Wallet className="text-cyan-300" size={28} aria-hidden />
          <p className="text-sm text-white/80 font-medium">
            Connect your wallet to begin setup
          </p>
          <p className="text-xs text-white/50">
            Your wallet belongs to you. VFIDE never controls your wallet or assets.
          </p>
          <VfideConnectButton size="md" />
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          {
            icon: Shield,
            color: 'text-cyan-300',
            title: 'Secure vault protection',
            sub: 'Create a protected vault foundation for safer asset storage.',
          },
          {
            icon: Wallet,
            color: 'text-emerald-300',
            title: 'Trusted recovery options',
            sub: 'Enable recovery workflows so loss does not mean permanent loss.',
          },
          {
            icon: KeyRound,
            color: 'text-purple-300',
            title: 'Guardian protection',
            sub: 'Choose trusted people who can support emergency recovery.',
          },
          {
            icon: CreditCard,
            color: 'text-amber-300',
            title: 'Merchant-friendly payments',
            sub: 'Prepare your vault for real-world payment and commerce use.',
          },
          {
            icon: BarChart3,
            color: 'text-pink-300',
            title: 'Trust and ProofScore',
            sub: 'Build reputation through responsible participation.',
          },
          {
            icon: Sparkles,
            color: 'text-cyan-300',
            title: 'Community governance',
            sub: 'Participate in shaping VFIDE as the ecosystem evolves.',
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
