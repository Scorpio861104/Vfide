'use client';
import { motion } from 'framer-motion';
import { Award, Star, Lock, Shield } from 'lucide-react';
import { useReadContract } from 'wagmi';
import { VFIDEBadgeNFTABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

export function BadgesTab({ address }: { address: `0x${string}` | undefined }) {
  const { badgeIds: _badgeIds, isLoading } = useUserBadges(address);
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              Your Badges
            </h2>
            <Link href="/badges" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full" />
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
