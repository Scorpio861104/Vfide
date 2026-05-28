'use client';
// Hardware wallet UI is accessible from the Wallet Hub (/wallet → Hardware Wallet card).
// This direct route is preserved for bookmarks and nav links.
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { ConnectTab }  from './components/ConnectTab';
import { GuideTab }    from './components/GuideTab';
import { ManageTab }   from './components/ManageTab';

type TabId = 'connect' | 'manage' | 'guide';
const TAB_LABELS: Record<TabId, string> = { connect: 'Connect', manage: 'Manage', guide: 'Setup Guide' };
const TAB_IDS: TabId[] = ['connect', 'manage', 'guide'];

function HardwareWalletInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'connect';
  const [activeTab, setActiveTab] = useState<TabId>(
    TAB_IDS.includes(initial) ? initial : 'connect'
  );
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="container mx-auto max-w-5xl px-4 py-8 relative">
          <h1 className="text-3xl font-black text-white mb-2">Hardware Wallet Setup</h1>
          <p className="text-zinc-400 text-sm mb-6">Maximum Security Setup — connect a Ledger or Trezor device.</p>
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-px">
            {TAB_IDS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-t transition-colors ${
                  activeTab === t ? 'text-white border-b-2 border-accent -mb-px' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >{TAB_LABELS[t]}</button>
            ))}
          </div>
          {activeTab === 'connect' && <ConnectTab />}
          {activeTab === 'manage'  && <ManageTab />}
          {activeTab === 'guide'   && <GuideTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function HardwareWalletPage() {
  return (
    <Suspense fallback={null}>
      <HardwareWalletInner />
    </Suspense>
  );
}
