'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { OverviewTab } from './components/OverviewTab';
import { EngagementTab } from './components/EngagementTab';
import { GrowthTab } from './components/GrowthTab';

type TabId = 'overview' | 'engagement' | 'growth';
type TimeRange = 'Week' | 'Month' | 'Year';

const TAB_LABELS: Record<TabId, string> = { overview: 'Overview', engagement: 'Engagement', growth: 'Growth' };
const TAB_IDS: TabId[] = ['overview', 'engagement', 'growth'];
const TIME_RANGES: TimeRange[] = ['Week', 'Month', 'Year'];

export default function SocialAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Social Analytics</h1>
          <p className="text-white/60 mb-6">Community engagement metrics</p>

          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  timeRange === range
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab timeRange={timeRange} />}
          {activeTab === 'engagement' && <EngagementTab timeRange={timeRange} />}
          {activeTab === 'growth' && <GrowthTab timeRange={timeRange} />}
        </div>
      </div>
      <Footer />
    </>
  );
}
