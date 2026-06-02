'use client';

/**
 * /wallet — Wallet Hub (tabbed)
 *
 * Tabs:
 *   overview    – Card links to all wallet flows
 *   activity    – Live balance + transaction history (absorbed from /crypto)
 *   private     – Stealth address readiness panel (absorbed from /stealth)
 *   cross-chain – Cross-chain bridge (absorbed from /cross-chain)
 *
 * Preserved standalone routes (own complex sub-tabs / camera access):
 *   /buy   – on-ramp + swap
 *   /pay   – quick pay with PayContent
 *   /scan  – QR scanner with camera
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m, AnimatePresence , LazyMotion, domAnimation } from 'framer-motion';
import {
  Wallet, HardDrive, FileText, Users, ArrowRight, CheckCircle2,
  Lock, Activity, EyeOff, ArrowLeftRight,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { TabTrigger } from '@/components/ui/TabTrigger';
import dynamic from 'next/dynamic';

const StakingTab = dynamic(
  () => import('./components/StakingTab').then(m => ({ default: m.StakingTab })),
  { ssr: false, loading: () => <div className="py-8 text-center text-zinc-500 text-sm">Loading…</div> }
);
const RemittanceTab = dynamic(
  () => import('./components/RemittanceTab').then(m => ({ default: m.RemittanceTab })),
  { ssr: false, loading: () => <div className="py-8 text-center text-zinc-500 text-sm">Loading…</div> }
);

const ActivityContent = dynamic(
  () => import('./components/ActivityContent').then(m => ({ default: m.ActivityContent })),
  { ssr: false }
);

// ── Stealth tab (inlined) ────────────────────────────────────────────────────
import { useMemo } from 'react';
import { Shield as ShieldIcon, Clock3, CheckCircle2 as CC2, Activity as Act, Copy } from 'lucide-react';

function StealthTab() {
  const [testAddress, setTestAddress] = useState('0x');

  const readiness = useMemo(() => ({
    rpcConfigured: Boolean(process.env.NEXT_PUBLIC_RPC_URL),
    chainConfigured: Boolean(process.env.NEXT_PUBLIC_CHAIN_ID),
    isAddressLike: /^0x[a-fA-F0-9]{40}$/.test(testAddress.trim()),
  }), [testAddress]);

  const checks = [
    { label: 'RPC configured', ok: readiness.rpcConfigured },
    { label: 'Chain ID configured', ok: readiness.chainConfigured },
    { label: 'Recipient address format', ok: readiness.isAddressLike },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <div className="badge-live mb-4"><EyeOff size={12} /> Privacy Engine</div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 mb-1">
          <EyeOff className="text-violet-400" size={28} />
          <span className="bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">Private Pay</span>
        </h2>
        <p className="text-gray-400 text-sm">EIP-5564 stealth address readiness panel.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="analytics-card p-4">
          <div className="flex items-center gap-2 mb-1"><ShieldIcon size={14} className="text-accent" /><p className="text-xs text-gray-400">Privacy Engine</p></div>
          <p className="text-white font-semibold text-sm">EIP-5564 Validation</p>
        </div>
        <div className="analytics-card p-4">
          <div className="flex items-center gap-2 mb-1"><Clock3 size={14} className="text-amber-400" /><p className="text-xs text-gray-400">Status</p></div>
          <p className="text-white font-semibold text-sm">Restricted Execution Mode</p>
        </div>
        <div className="analytics-card p-4">
          <div className="flex items-center gap-2 mb-1"><Act size={14} className="text-emerald-400" /><p className="text-xs text-gray-400">Readiness</p></div>
          <p className="text-white font-semibold text-sm">{checks.filter(c => c.ok).length}/{checks.length} Passing</p>
        </div>
      </div>

      <div className="glass-card-premium p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Environment Check</h3>
        <div className="space-y-2 mb-4">
          {checks.map(check => (
            <div key={check.label} className="flex items-center justify-between analytics-card px-3 py-2">
              <p className="text-sm text-gray-300">{check.label}</p>
              <div className="flex items-center gap-1 text-xs">
                <CC2 size={14} className={check.ok ? 'text-green-400' : 'text-gray-600'} />
                <span className={check.ok ? 'text-green-400' : 'text-gray-500'}>{check.ok ? 'OK' : 'Pending'}</span>
              </div>
            </div>
          ))}
        </div>
        <label className="block text-xs text-gray-400 mb-1">Recipient Address Validator</label>
        <input type="text" value={testAddress} onChange={e => setTestAddress(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50" />
      </div>

      <div className="glass-card-premium p-5">
        <h3 className="text-white font-semibold text-sm mb-2">Current Guardrails</h3>
        <ul className="space-y-1 text-xs text-gray-400 mb-3">
          <li>• Stealth broadcast gated until secp256k1 integration passes production verification.</li>
          <li>• Address validation, environment checks, and readiness telemetry are active.</li>
          <li>• Once cryptographic routing is enabled this panel switches to send/receive controls.</li>
        </ul>
        <button type="button"
          onClick={() => navigator.clipboard?.writeText('EIP-5564 readiness snapshot captured')}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/20 text-accent text-xs font-semibold hover:bg-accent/30">
          <Copy size={12} /> Copy Readiness Snapshot
        </button>
      </div>
    </div>
  );
}

// ── Cross-chain tab (inlined) ─────────────────────────────────────────────────
const CrossChainTransfer = dynamic(() => import('@/components/CrossChainTransfer'), { ssr: false });

function CrossChainTab() {
  return (
    <div>
      <div className="badge-live mb-4"><ArrowLeftRight size={12} /> Cross-Chain Bridge</div>
      <h2 className="sr-only">Cross-Chain Transfer</h2>
      <CrossChainTransfer />
    </div>
  );
}

// ── Overview cards ─────────────────────────────────────────────────────────────
interface WalletOption {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  recommended?: boolean;
  enabled: boolean;
}

const PAPER_WALLET_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PAPER_WALLET === 'true';

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'connect',
    title: 'Connect Wallet',
    description: 'Link MetaMask, WalletConnect, or Coinbase Wallet to access your full VFIDE profile.',
    href: '/me',
    icon: Wallet,
    color: '#06b6d4',
    recommended: true,
    enabled: true,
  },
  {
    id: 'hardware',
    title: 'Hardware Wallet',
    description: 'Maximum security. Set up Ledger or Trezor with VFIDE for cold storage.',
    href: '/hardware-wallet',
    icon: HardDrive,
    color: '#8b5cf6',
    badge: 'Ledger · Trezor',
    enabled: true,
  },
  {
    id: 'paper',
    title: 'Paper Wallet',
    description: 'Generate a key pair offline for long-term cold storage.',
    href: '/paper-wallet',
    icon: FileText,
    color: '#10b981',
    badge: 'Offline',
    enabled: PAPER_WALLET_ENABLED,
  },
  {
    id: 'recovery',
    title: 'Vault Recovery',
    description: 'Recover access using your guardian network or backup phrase.',
    href: '/vault/recover',
    icon: Lock,
    color: '#f59e0b',
    enabled: true,
  },
  {
    id: 'guardians',
    title: 'Guardian Setup',
    description: 'Add trusted contacts who can help you recover your vault.',
    href: '/guardians',
    icon: Users,
    color: '#ec4899',
    enabled: true,
  },
  {
    id: 'buy',
    title: 'Buy / Swap',
    description: 'On-ramp fiat or swap tokens via Uniswap on Base.',
    href: '/buy',
    icon: Activity,
    color: '#06b6d4',
    enabled: true,
  },
];

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight mb-1">Wallet Overview</h2>
        <p className="text-zinc-400 text-sm">Choose how you want to manage your VFIDE wallet.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WALLET_OPTIONS.filter(o => o.enabled).map((option, i) => {
          const Icon = option.icon;
          return (
            <m.a
              key={option.id}
              href={option.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group glass-card-premium p-5 hover:border-white/20 transition-all cursor-pointer block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${option.color}20`, border: `1px solid ${option.color}30` }}>
                  <Icon size={20} style={{ color: option.color }} />
                </div>
                <div className="flex gap-2">
                  {option.recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                      Recommended
                    </span>
                  )}
                  {option.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                      {option.badge}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-white font-bold mb-1">{option.title}</h3>
              <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{option.description}</p>
              <div className="flex items-center gap-1 text-accent text-sm font-semibold group-hover:gap-2 transition-all">
                Get started <ArrowRight size={14} />
              </div>
            </m.a>
          );
        })}
      </div>

      <div className="glass-card-premium p-4 flex items-start gap-3">
        <CheckCircle2 size={16} className="text-accent mt-0.5 flex-shrink-0" />
        <p className="text-zinc-400 text-sm">
          <span className="text-white font-semibold">Non-custodial by design.</span>{' '}
          VFIDE never holds your keys. Freeze, blacklist, and seizure functions are structurally absent from every contract.
        </p>
      </div>
    </div>
  );
}

// ── Hub shell ─────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'activity' | 'private' | 'cross-chain' | 'staking' | 'remittance';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',     icon: Wallet },
  { id: 'activity',   label: 'Activity',     icon: Activity },
  { id: 'private',    label: 'Private Pay',  icon: EyeOff },
  { id: 'cross-chain',label: 'Cross-Chain',  icon: ArrowLeftRight },
];

function WalletHubInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initial) ? initial : 'overview'
  );

  return (
    <LazyMotion features={domAnimation}>
      <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 text-white relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          {/* Page header */}
          <div className="mb-6">
            <div className="badge-live mb-3"><Wallet size={12} /> Wallet Hub</div>
            <h1 className="text-4xl font-black tracking-tight mb-1">
              <span className="bg-gradient-to-r from-white to-accent-light bg-clip-text text-transparent">Wallet</span>
            </h1>
            <p className="text-zinc-400 text-sm">Manage, transact, and protect your VFIDE balance.</p>
          </div>

          {/* Tab bar */}
          <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3"
            role="tablist" aria-label="Wallet sections">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <TabTrigger key={id}
                  active={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                    activeTab === id
                      ? 'bg-accent text-zinc-900'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} />{label}
                </TabTrigger>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <m.div key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}>
              {activeTab === 'overview'    && <OverviewTab />}
              {activeTab === 'activity'   && <ActivityContent />}
              {activeTab === 'private'    && <StealthTab />}
              {activeTab === 'cross-chain'&& <CrossChainTab />}
              {activeTab === 'staking'     && <StakingTab />}
              {activeTab === 'remittance'  && <RemittanceTab />}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
    </LazyMotion>
  );
}

export default function WalletHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <WalletHubInner />
    </Suspense>
  );
}
