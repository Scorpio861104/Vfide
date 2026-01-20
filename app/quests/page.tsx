'use client';

import { useState } from 'react';
import DailyQuestsPanel from '@/components/gamification/DailyQuestsPanel';
import DailyRewardsWidget from '@/components/gamification/DailyRewardsWidget';
import OnboardingChecklist from '@/components/gamification/OnboardingChecklist';
import { Trophy, Target, Gift } from 'lucide-react';

export default function QuestsPage() {
  const [activeSection, setActiveSection] = useState<'quests' | 'rewards'>('quests');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-600/10 to-blue-500/10 border-b border-purple-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-linear-to-br from-purple-600 to-blue-500 rounded-lg p-3">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Daily Quests & Rewards
              </h1>
              <p className="text-zinc-400 text-lg">
                Complete challenges and earn rewards every day
              </p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSection('quests')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                activeSection === 'quests'
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <Trophy className="w-5 h-5" />
              Quests
            </button>
            <button
              onClick={() => setActiveSection('rewards')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                activeSection === 'rewards'
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <Gift className="w-5 h-5" />
              Daily Rewards
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === 'quests' ? (
          <DailyQuestsPanel />
        ) : (
          <DailyRewardsWidget />
        )}
      </div>

      {/* Onboarding Checklist (floating) */}
      <OnboardingChecklist />
    </div>
  );
}
