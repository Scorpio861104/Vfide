'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Trophy } from 'lucide-react';

import { BadgeGallery } from '@/components/badge/BadgeGallery';
import { BadgeProgress } from '@/components/badge/BadgeProgress';
import { useUserBadges } from '@/lib/vfide-hooks';

import { GlassCard, containerVariants, itemVariants } from './shared';

export function BadgesTab({ address }: { address: `0x${string}` | undefined }) {
  const { badgeIds: _badgeIds, isLoading } = useUserBadges(address);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Trophy className="text-amber-400" size={24} />
              Your Badges
            </h2>
            <Link href="/badges" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-400 hover:text-cyan-300">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
              />
            </div>
          ) : (
            <>
              <BadgeGallery address={address} />
              <div className="mt-6">
                <BadgeProgress address={address} />
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
