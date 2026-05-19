'use client';

export const dynamic = 'force-dynamic';

/**
 * Settings — unified account configuration hub (R90 T1-3).
 *
 * Previously split confusingly between:
 *   /settings  → 3-card hub linking to vault/settings, security-center, notifications
 *   /setup     → tabbed page: Account | Vault | Security
 *
 * Now one page, one route. Four tabs:
 *   Account      — display name, avatar, bio (was /setup > Account)
 *   Vault        — vault state and protocol stats (was /setup > Vault)
 *   Security     — session logs, auth events (was /setup > Security)
 *   Notifications — notification inbox + preferences (was /notifications)
 *
 * /setup redirects here. /notifications redirects here.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Lock, Settings, Shield, User } from 'lucide-react';
import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';

import { AccountTab }  from '@/app/setup/components/AccountTab';
import { VaultTab }    from '@/app/setup/components/VaultTab';
import { SecurityTab } from '@/app/setup/components/SecurityTab';

// Notifications tab — inline from /notifications page content
import { NotificationsTabInline } from './components/NotificationsTabInline';

type TabId = 'account' | 'vault' | 'security' | 'notifications';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'account',       label: 'Account',       icon: User     },
  { id: 'vault',         label: 'Vault',          icon: Lock     },
  { id: 'security',      label: 'Security',       icon: Shield   },
  { id: 'notifications', label: 'Notifications',  icon: Bell     },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="badge-live mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Account Controls
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight flex items-center gap-3">
            <Settings className="text-violet-400" size={36} />
            <span className="bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
              Settings
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Manage your account, vault, security, and notification preferences.
          </p>
        </motion.div>

        {/* Sticky tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'account'       && <AccountTab />}
            {activeTab === 'vault'         && <VaultTab />}
            {activeTab === 'security'      && <SecurityTab />}
            {activeTab === 'notifications' && <NotificationsTabInline />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
