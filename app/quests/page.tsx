'use client';

export const dynamic = 'force-dynamic';

import DailyQuestsPanel from '@/components/gamification/DailyQuestsPanel';
import OnboardingChecklist from '@/components/gamification/OnboardingChecklist';
import { Target } from 'lucide-react';

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/10 to-blue-500/10 border-b border-purple-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg p-3">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Daily Quests
              </h1>
              <p className="text-zinc-400 text-lg">
                Complete governance challenges and earn participation XP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DailyQuestsPanel />
      </div>

      {/* Onboarding Checklist (floating) */}
      <OnboardingChecklist />
    </div>
  );
}
