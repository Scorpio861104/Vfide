'use client';
/**
 * EscrowTab — inline tab shell for /merchant?tab=escrow.
 * Re-uses the existing /escrow component tree via dynamic imports.
 */
import { useState } from 'react';
import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion';
import { CheckCircle2, FileText, Lock, PlusCircle } from 'lucide-react';
import nextDynamic from 'next/dynamic';

const ActiveTab    = nextDynamic(() => import('@/app/escrow/components/ActiveTab').then(m => ({ default: m.ActiveTab })),    { ssr: false });
const CreateTab    = nextDynamic(() => import('@/app/escrow/components/CreateTab').then(m => ({ default: m.CreateTab })),    { ssr: false });
const CompletedTab = nextDynamic(() => import('@/app/escrow/components/CompletedTab').then(m => ({ default: m.CompletedTab })), { ssr: false });
const DisputesTab  = nextDynamic(() => import('@/app/escrow/components/DisputesTab').then(m => ({ default: m.DisputesTab })),  { ssr: false });

type TabId = 'active' | 'create' | 'completed' | 'disputes';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'active',    label: 'Active',    icon: Lock        },
  { id: 'create',    label: 'Create',    icon: PlusCircle  },
  { id: 'completed', label: 'Completed', icon: CheckCircle2},
  { id: 'disputes',  label: 'Disputes',  icon: FileText    },
];

export function EscrowTab() {
  const [activeTab, setActiveTab] = useState<TabId>('active');

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Escrow</h2>
        <p className="text-zinc-400 text-sm">Lock funds, define conditions, release on fulfillment</p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/8 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-selected={activeTab === id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? 'text-accent border-b-2 border-accent bg-accent/8'
                : 'text-zinc-400 hover:text-white border-b-2 border-transparent'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <m.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'active'    && <ActiveTab />}
          {activeTab === 'create'    && <CreateTab />}
          {activeTab === 'completed' && <CompletedTab />}
          {activeTab === 'disputes'  && <DisputesTab />}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
