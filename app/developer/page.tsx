'use client';
import dynamic from 'next/dynamic';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { ArrowRight, Clock, Code2, Rocket, Wallet, Users } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { STUB_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';
const SplitterTab = dynamic(() => import('./components/SplitterTab').then(m => ({ default: m.SplitterTab })), { ssr: false });
import { useT } from '@/lib/i18n';

type TabId = 'portal' | 'token-launch' | 'splitter';
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'portal',       label: 'Developer Portal', icon: Code2 },
  { id: 'token-launch', label: 'Token Launch',      icon: Rocket },
  { id: 'splitter',     label: 'Rev. Splitter',   icon: Users },
];

function DeveloperPortalTab() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(STUB_TRANSLATIONS, locale);
  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card-premium p-10 max-w-2xl text-center mx-auto"
    >
      <div className="text-6xl mb-6" aria-hidden="true">🛠️</div>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-5">
        <Clock size={10} /> In development · Post-testnet
      </div>
      <h2 className="text-3xl font-black text-white mb-3">Developer Portal</h2>
      <p className="text-zinc-400 mb-2 text-sm font-medium">APIs, SDKs, and tools for building on VFIDE.</p>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        The developer portal goes live with testnet docs, contract ABIs, and an API playground.
        Smart contract addresses and event schemas are published in the repo now.
      </p>
      <div className="text-left bg-zinc-900/50 rounded-xl p-5 mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">What to expect</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>REST API and webhook integrations for merchant flows</li>
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>JavaScript/TypeScript SDK with typed contract ABIs</li>
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>Embed checkout widgets for any storefront</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/docs"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-zinc-900 font-bold rounded-xl transition-colors text-sm">
          Read the docs <ArrowRight size={14} />
        </Link>
        <Link href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl transition-colors text-sm">
          Go back
        </Link>
      </div>
    </m.div>
  );
}

function TokenLaunchTab() {
  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card-premium p-10 max-w-2xl text-center mx-auto"
    >
      <div className="text-6xl mb-6" aria-hidden="true">🚀</div>
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 mb-5">
        <Clock size={10} /> In development · Post-testnet
      </div>
      <h2 className="text-3xl font-black text-white mb-3">Token Launch</h2>
      <p className="text-zinc-400 mb-2 text-sm font-medium">Fair-launch tooling built on VFIDE infrastructure.</p>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        Token launch tooling will enable projects to deploy fair-launch contracts with
        automatic ProofScore gating and treasury routing built in. Available post-testnet.
      </p>
      <div className="text-left bg-zinc-900/50 rounded-xl p-5 mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Planned features</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>One-click fair-launch contract deployment</li>
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>ProofScore-gated participation tiers</li>
          <li className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-accent mt-0.5">→</span>Automatic sanctum and treasury routing</li>
        </ul>
      </div>
      <Link href="/roadmap"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-zinc-900 font-bold rounded-xl transition-colors text-sm">
        <Wallet size={14} /> View full roadmap <ArrowRight size={14} />
      </Link>
    </m.div>
  );
}

function DeveloperHubInner() {
  const t = useT();
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'portal';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initial) ? initial : 'portal'
  );

  return (
    <LazyMotion features={domAnimation}>
      <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="container mx-auto max-w-3xl px-4 py-12 relative z-10">
          <div className="mb-8 text-center">
            <div className="badge-live mb-4 justify-center"><Code2 size={12} /> Build on VFIDE</div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{t.developer_heading}</h1>
            <p className="text-zinc-400 text-sm">APIs, SDKs, and launch tools for builders.</p>
          </div>

          {/* Tab bar */}
          <div className="flex justify-center gap-2 mb-10"
            role="tablist" aria-label="Developer sections">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeTab === id ? 'bg-accent text-zinc-900' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <m.div key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}>
              {activeTab === 'portal'       && <DeveloperPortalTab />}
              {activeTab === 'token-launch' && <TokenLaunchTab />}
              {activeTab === 'splitter'     && <SplitterTab />}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function DeveloperHubPage() {
  const t = useT();
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <DeveloperHubInner />
    </Suspense>
    </LazyMotion>
  );
}
