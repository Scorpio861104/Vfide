'use client';

export const dynamic = 'force-dynamic';

import { m , LazyMotion, domAnimation } from 'framer-motion';
import { Target } from 'lucide-react';
import DailyQuestsPanel from '@/components/gamification/DailyQuestsPanel';
import OnboardingChecklist from '@/components/gamification/OnboardingChecklist';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function QuestsPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Daily Challenges</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
              <Target size={36} className="text-purple-400" />Daily Quests
            </span>
          </h1>
          <p className="text-white/50 text-lg">Complete governance challenges and earn participation XP</p>
        </m.div>

        <DailyQuestsPanel />
      </div>

      <OnboardingChecklist />
      <Footer />
    </div>
    </LazyMotion>
  );
}
