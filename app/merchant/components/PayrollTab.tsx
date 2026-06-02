'use client';
/**
 * PayrollTab — inline tab shell for /merchant?tab=payroll.
 * Re-uses the existing /payroll component tree via dynamic imports.
 */
import { useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { History, LayoutDashboard, PlusCircle, Waves } from 'lucide-react';
import nextDynamic from 'next/dynamic';

const DashboardTab = nextDynamic(() => import('@/app/payroll/components/DashboardTab').then(m => ({ default: m.DashboardTab })), { ssr: false });
const StreamsTab   = nextDynamic(() => import('@/app/payroll/components/StreamsTab').then(m => ({ default: m.StreamsTab })),     { ssr: false });
const CreateTab    = nextDynamic(() => import('@/app/payroll/components/CreateTab').then(m => ({ default: m.CreateTab })),       { ssr: false });
const HistoryTab   = nextDynamic(() => import('@/app/payroll/components/HistoryTab').then(m => ({ default: m.HistoryTab })),     { ssr: false });

type TabId = 'dashboard' | 'streams' | 'create' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'streams',   label: 'Streams',   icon: Waves           },
  { id: 'create',    label: 'Create',    icon: PlusCircle      },
  { id: 'history',   label: 'History',   icon: History         },
];

export function PayrollTab() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Payroll</h2>
        <p className="text-zinc-400 text-sm">Manage team payments, streaming salaries</p>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/8 pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap -mb-px
              ${activeTab === id
                ? 'text-accent border-b-2 border-accent bg-accent/8'
                : 'text-zinc-400 hover:text-white border-b-2 border-transparent'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'streams'   && <StreamsTab />}
          {activeTab === 'create'    && <CreateTab />}
          {activeTab === 'history'   && <HistoryTab />}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
