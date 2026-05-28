'use client';

/**
 * /wallet — Wallet Hub.
 *
 * This route is the destination of `/paper-wallet` redirects (via
 * NEXT_PUBLIC_ENABLE_PAPER_WALLET gate in next.config.ts) and the
 * canonical entry point for users picking how to manage their VFIDE
 * wallet. It is intentionally lightweight: each option deep-links into
 * an existing concrete flow.
 *
 * Options surfaced:
 *   - Connect existing wallet  → /me (user hub: vault, transfers, score)
 *   - Hardware wallet setup    → /hardware-wallet (Ledger / Trezor)
 *   - Paper wallet (gated)     → /paper-wallet (only if env opt-in is on)
 *   - Vault recovery           → /vault/recover (lost-key path)
 *   - Guardian setup           → /guardians (social recovery)
 *
 * No private-key generation happens on this page — that lives behind
 * the explicit /paper-wallet opt-in flow only.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Wallet,
  HardDrive,
  FileText,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface WalletOption {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Wallet;
  color: string;
  badge?: string;
  recommended?: boolean;
  enabled: boolean;
}

export default function WalletHubPage() {
  const { isConnected, address } = useAccount();
  const paperWalletEnabled = process.env.NEXT_PUBLIC_ENABLE_PAPER_WALLET === 'true';

  const options: WalletOption[] = [
    {
      id: 'connect',
      title: isConnected ? 'Open Your Wallet' : 'Connect Existing Wallet',
      description: isConnected
        ? `Connected as ${address?.slice(0, 6)}…${address?.slice(-4)}. View your vault, ProofScore, and activity.`
        : 'Connect MetaMask, WalletConnect, Coinbase Wallet, or Rainbow.',
      href: '/me',
      icon: Wallet,
      color: '#22d3ee',
      badge: isConnected ? 'Connected' : 'Most Common',
      recommended: true,
      enabled: true,
    },
    {
      id: 'hardware',
      title: 'Hardware Wallet',
      description: 'Maximum security with Ledger or Trezor. Cold-wallet signing for your VFIDE vault.',
      href: '/hardware-wallet',
      icon: HardDrive,
      color: '#10b981',
      badge: 'Most Secure',
      enabled: true,
    },
    {
      id: 'guardians',
      title: 'Set Up Guardians',
      description: 'Add 2–20 guardians for social recovery. Required for vault setup completion.',
      href: '/guardians',
      icon: Users,
      color: '#a78bfa',
      enabled: true,
    },
    {
      id: 'recover',
      title: 'Recover a Vault',
      description: 'Lost your wallet? Start a 14-day guardian-voted recovery claim with 7-day challenge window.',
      href: '/vault/recover',
      icon: Shield,
      color: '#f59e0b',
      enabled: true,
    },
    {
      id: 'paper',
      title: 'Paper Wallet',
      description: paperWalletEnabled
        ? 'Generate an offline wallet with a printable QR code for cold storage.'
        : 'Disabled in this build. Enable with NEXT_PUBLIC_ENABLE_PAPER_WALLET=true (admin only).',
      href: paperWalletEnabled ? '/paper-wallet' : '/docs',
      icon: FileText,
      color: '#64748b',
      badge: paperWalletEnabled ? undefined : 'Disabled',
      enabled: paperWalletEnabled,
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
          />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="container mx-auto max-w-5xl px-4 py-8 relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-accent">
            <Lock className="w-3 h-3" /> Self-custodial · Non-custodial · Howey-compliant
          </div>
          <h1 className="mb-2 text-4xl font-black text-white tracking-tight">Wallet Hub</h1>
          <p className="mb-8 max-w-2xl text-white/60">
            Pick how you want to interact with your VFIDE vault. Every option below is fully self-custodial — VFIDE
            never holds your keys, and no admin function exists to freeze, blacklist, or seize your funds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {options.map((opt, idx) => {
              const Icon = opt.icon;
              const isDisabled = !opt.enabled;
              const Card = (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className={`group relative h-full overflow-hidden rounded-2xl border p-6 transition-all ${
                    isDisabled
                      ? 'border-white/5 bg-white/[0.02] opacity-60'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Color accent bar */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px] opacity-50"
                    style={{ background: opt.color }}
                  />

                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: `${opt.color}33`,
                        background: `${opt.color}15`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: opt.color }} />
                    </div>
                    {opt.badge && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          opt.recommended
                            ? 'border-accent/30 bg-accent/15 text-accent'
                            : isDisabled
                              ? 'border-white/10 bg-white/5 text-white/50'
                              : 'border-white/10 bg-white/5 text-white/70'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-1.5 text-lg font-bold text-white">{opt.title}</h2>
                  <p className="mb-4 text-sm text-white/60">{opt.description}</p>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-white/80 group-hover:text-white">
                    {isDisabled ? 'Learn more' : opt.recommended && isConnected ? 'Continue' : 'Open'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.div>
              );

              return (
                <Link key={opt.id} href={opt.href} className="block focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-2xl">
                  {Card}
                </Link>
              );
            })}
          </div>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span className="text-white/70">No freeze. No blacklist.</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span className="text-white/70">Recovery via guardians only.</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span className="text-white/70">Keys never leave your device.</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
