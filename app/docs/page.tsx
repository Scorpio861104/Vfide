'use client';

import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { FaqTab } from './components/FaqTab';
import { LearnTab } from './components/LearnTab';
import { OverviewTab } from './components/OverviewTab';
import { SecurityTab } from './components/SecurityTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

type TabId = 'overview' | 'learn' | 'faq' | 'security';

const DOCS_COPY = {
  'en-US': {
    badge: 'Documentation & Guides',
    title: 'Documentation & Help',
    subtitle: 'Learn how trust scoring, wallets, payments, and recovery all work together in VFIDE.',
    tabs: { overview: 'Overview', learn: 'Learn', faq: 'FAQ', security: 'Security' },
  },
  'es-ES': {
    badge: 'Documentación y guías',
    title: 'Documentación y ayuda',
    subtitle: 'Aprende cómo trust score, billeteras, pagos y recuperación funcionan juntos en VFIDE.',
    tabs: { overview: 'Resumen', learn: 'Aprender', faq: 'FAQ', security: 'Seguridad' },
  },
  'fr-FR': {
    badge: 'Documentation et guides',
    title: 'Documentation et aide',
    subtitle: 'Découvrez comment trust score, wallets, paiements et récupération fonctionnent ensemble dans VFIDE.',
    tabs: { overview: 'Vue d’ensemble', learn: 'Apprendre', faq: 'FAQ', security: 'Sécurité' },
  },
  'de-DE': {
    badge: 'Dokumentation & Leitfäden',
    title: 'Dokumentation & Hilfe',
    subtitle: 'Erfahre, wie Trust Score, Wallets, Zahlungen und Recovery in VFIDE zusammenarbeiten.',
    tabs: { overview: 'Überblick', learn: 'Lernen', faq: 'FAQ', security: 'Sicherheit' },
  },
};

const TAB_IDS: TabId[] = ['overview', 'learn', 'faq', 'security'];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { locale } = useLocale();
  const copy = (DOCS_COPY as Record<string, typeof DOCS_COPY['en-US']>)[locale] ?? DOCS_COPY['en-US'];

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          <div className="badge-live mb-3">
            {copy.badge}
          </div>
          <h1 className="mb-2 text-4xl font-black text-white tracking-tight">
            <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              {copy.title}
            </span>
          </h1>
          <p className="mb-8 text-white/60">{copy.subtitle}</p>

          <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 mb-8 flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}
              >
                {copy.tabs[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'learn' && <LearnTab />}
          {activeTab === 'faq' && <FaqTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
