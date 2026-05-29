'use client';

import { m, LazyMotion, domAnimation } from 'framer-motion';
import { useAccount } from 'wagmi';
import { AchievementsList } from '@/components/gamification/GamificationWidgets';

export function AchievementsTab() {
  const { address } = useAccount();

  return (
    <div className="space-y-6">
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <AchievementsList userAddress={address ?? ''} />
      </m.div>
    </div>
  );
}
