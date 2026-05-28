'use client';

import { AnimatePresence, m } from 'framer-motion';
import { Eye, Palette, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

import { Footer } from '@/components/layout/Footer';

import { AdvancedTab } from './components/AdvancedTab';
import { PreviewTab }  from './components/PreviewTab';
import { PresetsTab }  from './components/PresetsTab';

type TabId = 'presets' | 'preview' | 'advanced';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'presets',  label: 'Presets',  icon: Palette  },
  { id: 'preview',  label: 'Preview',  icon: Eye      },
  { id: 'advanced', label: 'Advanced', icon: Sliders  },
];

const VALID_TABS: TabId[] = ['presets', 'preview', 'advanced'];

export default function ThemeManagementPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'presets'
  );

  // Keep URL param in sync when it changes (e.g. /theme?tab=preview redirect)
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Visual Customization</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">Theme</span>
          </h1>
          <p className="text-white/50 text-lg">Customize your VFIDE experience — colors, accents, and visual style.</p>
        </m.div>

        <div
          className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-pressed={activeTab === id}
                aria-label={`Switch to ${label} tab`}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'presets'  && <PresetsTab />}
            {activeTab === 'preview'  && <PreviewTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
          </m.div>
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
