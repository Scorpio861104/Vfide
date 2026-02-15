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
import { getAuthHeaders, getAuthToken } from '@/lib/auth/client';

// Confetti particle component
function Confetti({ count = 50 }: { count?: number }) {
  const confettiColors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#9333EA'];
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i * 37 + 13) % 100,
    delay: (i % 10) * 0.05,
    color: confettiColors[i % 5]
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
      void loadProgress();
    }
  }, [isConnected]);

  const loadProgress = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch('/api/gamification/onboarding', {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const iconMap: Record<string, React.ReactNode> = {
        'connect-wallet': <Wallet className="w-5 h-5" />,
        'setup-guardians': <Shield className="w-5 h-5" />,
        'first-transaction': <Zap className="w-5 h-5" />,
        'add-friends': <Users className="w-5 h-5" />,
        'send-message': <MessageSquare className="w-5 h-5" />,
        'cast-vote': <Vote className="w-5 h-5" />,
        'proofscore-600': <Star className="w-5 h-5" />,
        'first-badge': <Trophy className="w-5 h-5" />,
      };

      if (Array.isArray(data?.items)) {
        setItems(
          data.items.map((item: ChecklistItem) => ({
            ...item,
            icon: iconMap[item.id] ?? <Sparkles className="w-5 h-5" />,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load onboarding checklist:', error);
    }
  };

  const handleCompleteItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/gamification/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ itemId, completed: true }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update checklist');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, completed: true } : item
        )
      );
      playSuccess();
    } catch (error) {
      console.error('Failed to update onboarding checklist:', error);
    }
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
        className="fixed bottom-24 right-6 z-40 bg-linear-to-r from-amber-400 to-orange-500 text-zinc-950 px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2"
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
      className="fixed bottom-24 right-6 z-40 w-96 bg-zinc-900 border-2 border-amber-400 rounded-xl shadow-2xl overflow-hidden"
      initial={{ y: 100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {showConfetti && <Confetti />}
      {/* Header */}
      <div className="bg-linear-to-r from-amber-400/20 to-orange-500/20 p-4 border-b border-amber-400/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Getting Started
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-zinc-400 hover:text-white transition-colors"
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
              className="text-amber-400 font-bold"
              key={progress}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
            >
              {Math.round(progress)}%
            </motion.span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <motion.div 
              className="bg-linear-to-r from-amber-400 to-orange-500 h-3 rounded-full relative"
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
              <span className="text-zinc-400">Earned: </span>
              <span className="text-amber-400 font-bold">{totalRewards} VFIDE</span>
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
              <ChecklistItemCard item={item} onComplete={handleCompleteItem} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <AnimatePresence>
        {completedCount === totalCount && totalCount > 0 && (
          <motion.div 
            className="bg-emerald-500/10 border-t border-emerald-500/30 p-4 text-center"
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
            <div className="text-sm text-zinc-400 mb-3">You&apos;ve completed the onboarding checklist</div>
            <motion.button 
              className="w-full px-4 py-2 bg-linear-to-r from-amber-400 to-orange-500 text-zinc-950 rounded-lg font-bold"
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

function ChecklistItemCard({ item, onComplete }: { item: ChecklistItem; onComplete?: (itemId: string) => void }) {
  return (
    <motion.div 
      className={`rounded-lg p-3 ${
        item.completed 
          ? 'bg-emerald-500/10 border border-emerald-500/30' 
          : 'bg-zinc-950 border border-zinc-800'
      }`}
      whileHover={{ scale: 1.01, borderColor: item.completed ? undefined : 'rgba(255, 215, 0, 0.5)' }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start gap-3 mb-2">
        <motion.div 
          className={`mt-0.5 ${item.completed ? 'text-emerald-500' : 'text-zinc-400'}`}
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
          <p className="text-sm text-zinc-400 mb-2">{item.description}</p>
          
          {/* Rewards */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.reward.xp && (
              <motion.span 
                className="text-xs bg-purple-600/20 text-purple-600 px-2 py-1 rounded"
                whileHover={{ scale: 1.1, y: -2 }}
              >
                +{item.reward.xp} XP
              </motion.span>
            )}
            {item.reward.vfide && (
              <motion.span 
                className="text-xs bg-amber-400/20 text-amber-400 px-2 py-1 rounded"
                whileHover={{ scale: 1.1, y: -2 }}
              >
                +{item.reward.vfide} VFIDE
              </motion.span>
            )}
            {item.reward.badge && (
              <motion.span 
                className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded"
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
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400"
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

          {!item.completed && onComplete && (
            <motion.button
              type="button"
              onClick={() => onComplete(item.id)}
              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400"
              whileHover={{ scale: 1.03 }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark complete
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
