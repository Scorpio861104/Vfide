/**
 * ONBOARDING CHECKLIST
 * 
 * Guided progression for new users
 * Duolingo-style checklist with rewards
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  CheckCircle2, Circle, ArrowRight, 
  Wallet, Shield, Users, MessageSquare, 
  Vote, Trophy, Zap, Star, X, Sparkles
} from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// Confetti particle component
function Confetti({ count = 50 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#9333EA'][Math.floor(Math.random() * 5)]
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ left: `${p.x}%`, backgroundColor: p.color }}
          initial={{ y: -10, opacity: 1, scale: 1 }}
          animate={{ y: 300, opacity: 0, scale: 0, rotate: 360 }}
          transition={{ duration: 2, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// Animated number counter
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);
  
  return <motion.span className={className}>{rounded}</motion.span>;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  reward: {
    xp: number;
    vfide?: number;
    badge?: string;
  };
  action: {
    label: string;
    link: string;
  };
  order: number;
}

export default function OnboardingChecklist() {
  const { address: _address, isConnected } = useAccount();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { playSuccess, playNotification } = useTransactionSounds();

  useEffect(() => {
    if (isConnected) {
      loadProgress();
    }
  }, [isConnected]);

  const loadProgress = async () => {
    // In production: Fetch from API
    const mockItems: ChecklistItem[] = [
      {
        id: '1',
        title: 'Connect Your Wallet',
        description: 'Link your wallet to get started',
        icon: <Wallet className="w-5 h-5" />,
        completed: true,
        reward: { xp: 50, vfide: 10 },
        action: { label: 'Connected', link: '#' },
        order: 1
      },
      {
        id: '2',
        title: 'Set Up Guardians',
        description: 'Add 3 trusted guardians for account recovery',
        icon: <Shield className="w-5 h-5" />,
        completed: false,
        reward: { xp: 100, vfide: 25, badge: 'Guardian Angel' },
        action: { label: 'Add Guardians', link: '/vault' },
        order: 2
      },
      {
        id: '3',
        title: 'Make First Transaction',
        description: 'Send or receive your first payment',
        icon: <Zap className="w-5 h-5" />,
        completed: false,
        reward: { xp: 150, vfide: 50 },
        action: { label: 'Send Payment', link: '/crypto' },
        order: 3
      },
      {
        id: '4',
        title: 'Add 3 Friends',
        description: 'Build your network',
        icon: <Users className="w-5 h-5" />,
        completed: false,
        reward: { xp: 100, vfide: 30 },
        action: { label: 'Find Friends', link: '/social' },
        order: 4
      },
      {
        id: '5',
        title: 'Send First Message',
        description: 'Start a conversation',
        icon: <MessageSquare className="w-5 h-5" />,
        completed: false,
        reward: { xp: 75 },
        action: { label: 'Open Chat', link: '/social-messaging' },
        order: 5
      },
      {
        id: '6',
        title: 'Cast Your First Vote',
        description: 'Participate in governance',
        icon: <Vote className="w-5 h-5" />,
        completed: false,
        reward: { xp: 200, vfide: 75, badge: 'Active Voter' },
        action: { label: 'View Proposals', link: '/governance' },
        order: 6
      },
      {
        id: '7',
        title: 'Reach 600 ProofScore',
        description: 'Build your reputation',
        icon: <Star className="w-5 h-5" />,
        completed: false,
        reward: { xp: 300, vfide: 100, badge: 'Trusted Member' },
        action: { label: 'View Score', link: '/dashboard' },
        order: 7
      },
      {
        id: '8',
        title: 'Earn Your First Badge',
        description: 'Unlock an achievement',
        icon: <Trophy className="w-5 h-5" />,
        completed: false,
        reward: { xp: 250, vfide: 150 },
        action: { label: 'View Badges', link: '/achievements' },
        order: 8
      }
    ];

    setItems(mockItems);
  };

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;
  const totalRewards = items
    .filter(item => item.completed)
    .reduce((sum, item) => sum + (item.reward.vfide || 0), 0);

  // Play sound when all tasks complete
  const handleAllComplete = useCallback(() => {
    if (completedCount === totalCount && totalCount > 0) {
      setShowConfetti(true);
      playSuccess();
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [completedCount, totalCount, playSuccess]);

  useEffect(() => {
    handleAllComplete();
  }, [handleAllComplete]);

  if (isDismissed || !isConnected) return null;

  if (isMinimized) {
    return (
      <motion.button
        onClick={() => {
          setIsMinimized(false);
          playNotification();
        }}
        className="fixed bottom-24 right-6 z-40 bg-linear-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Trophy className="w-5 h-5" />
        </motion.div>
        Getting Started ({completedCount}/{totalCount})
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed bottom-24 right-6 z-40 w-96 bg-[#1A1A1F] border-2 border-[#FFD700] rounded-xl shadow-2xl overflow-hidden"
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {showConfetti && <Confetti />}
      {/* Header */}
      <div className="bg-linear-to-r from-[#FFD700]/20 to-[#FFA500]/20 p-4 border-b border-[#FFD700]/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FFD700]" />
            Getting Started
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-[#A0A0A5] hover:text-white transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-[#A0A0A5] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white font-semibold">
              <AnimatedCounter value={completedCount} /> of {totalCount} completed
            </span>
            <motion.span 
              className="text-[#FFD700] font-bold"
              key={progress}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="w-full bg-[#2A2A2F] rounded-full h-3 overflow-hidden">
            <motion.div 
              className="bg-linear-to-r from-[#FFD700] to-[#FFA500] h-3 rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
              <motion.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.div>
          </div>
          {totalRewards > 0 && (
            <div className="text-center text-sm">
              <span className="text-[#A0A0A5]">Earned: </span>
              <span className="text-[#FFD700] font-bold">{totalRewards} VFIDE</span>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
            >
              <ChecklistItemCard item={item} onComplete={() => playSuccess()} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <AnimatePresence>
        {completedCount === totalCount && totalCount > 0 && (
          <motion.div 
            className="bg-[#50C878]/10 border-t border-[#50C878]/30 p-4 text-center"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <motion.div 
              className="text-4xl mb-2"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              🎉
            </motion.div>
            <div className="text-lg font-bold text-white mb-1">All Done!</div>
            <div className="text-sm text-[#A0A0A5] mb-3">You&apos;ve completed the onboarding checklist</div>
            <motion.button 
              className="w-full px-4 py-2 bg-linear-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-bold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={{ boxShadow: ['0 0 0px #FFD700', '0 0 20px #FFD700', '0 0 0px #FFD700'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Claim Bonus Reward
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ChecklistItemCard({ item, onComplete: _onComplete }: { item: ChecklistItem; onComplete?: () => void }) {
  return (
    <motion.div 
      className={`rounded-lg p-3 ${
        item.completed 
          ? 'bg-[#50C878]/10 border border-[#50C878]/30' 
          : 'bg-[#0A0A0B] border border-[#2A2A2F]'
      }`}
      whileHover={{ scale: 1.01, borderColor: item.completed ? undefined : 'rgba(255, 215, 0, 0.5)' }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start gap-3 mb-2">
        <motion.div 
          className={`mt-0.5 ${item.completed ? 'text-[#50C878]' : 'text-[#A0A0A5]'}`}
          initial={false}
          animate={item.completed ? { scale: [1, 1.3, 1], rotate: [0, 360] } : {}}
          transition={{ duration: 0.4 }}
        >
          {item.completed ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </motion.div>
        <div className="flex-1">
          <h4 className={`font-bold mb-1 ${item.completed ? 'text-white' : 'text-white'}`}>
            {item.title}
          </h4>
          <p className="text-sm text-[#A0A0A5] mb-2">{item.description}</p>
          
          {/* Rewards */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.reward.xp && (
              <motion.span 
                className="text-xs bg-[#9333EA]/20 text-[#9333EA] px-2 py-1 rounded"
                whileHover={{ scale: 1.1, y: -2 }}
              >
                +{item.reward.xp} XP
              </motion.span>
            )}
            {item.reward.vfide && (
              <motion.span 
                className="text-xs bg-[#FFD700]/20 text-[#FFD700] px-2 py-1 rounded"
                whileHover={{ scale: 1.1, y: -2 }}
              >
                +{item.reward.vfide} VFIDE
              </motion.span>
            )}
            {item.reward.badge && (
              <motion.span 
                className="text-xs bg-[#3B82F6]/20 text-[#3B82F6] px-2 py-1 rounded"
                whileHover={{ scale: 1.1, y: -2 }}
                animate={{ boxShadow: ['0 0 0px #3B82F6', '0 0 8px #3B82F6', '0 0 0px #3B82F6'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🏆 {item.reward.badge}
              </motion.span>
            )}
          </div>

          {/* Action Button */}
          {!item.completed && (
            <motion.a
              href={item.action.link}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFD700]"
              whileHover={{ x: 5 }}
            >
              {item.action.label}
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
