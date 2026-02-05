/**
 * ACHIEVEMENT TOAST SYSTEM - Enhanced
 * 
 * Real-time popup notifications for achievements, badges, level ups
 * Features: Confetti, sounds, share buttons, animated counters, combo multipliers
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Trophy, Star, Award, Flame, Gift, Zap, Share2, Twitter, Copy, Check, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// ==================== TYPES ====================

export interface AchievementNotification {
  id: string;
  type: 'badge' | 'level_up' | 'achievement' | 'quest' | 'streak' | 'reward' | 'combo';
  title: string;
  description: string;
  icon?: string;
  reward?: {
    xp?: number;
    vfide?: number;
    badge?: string;
  };
  timestamp: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  comboMultiplier?: number;
  shareText?: string;
}

interface ToastProps {
  notification: AchievementNotification;
  onDismiss: (id: string) => void;
  position: number;
}

// ==================== CONSTANTS ====================

const iconMap = {
  badge: <Award className="w-7 h-7" />,
  level_up: <Star className="w-7 h-7" />,
  achievement: <Trophy className="w-7 h-7" />,
  quest: <Zap className="w-7 h-7" />,
  streak: <Flame className="w-7 h-7" />,
  reward: <Gift className="w-7 h-7" />,
  combo: <Sparkles className="w-7 h-7" />
};

const colorMap = {
  badge: 'from-blue-500 to-purple-500',
  level_up: 'from-yellow-500 to-orange-500',
  achievement: 'from-purple-500 to-pink-500',
  quest: 'from-cyan-500 to-blue-500',
  streak: 'from-orange-500 to-red-500',
  reward: 'from-green-500 to-teal-500',
  combo: 'from-pink-500 to-yellow-500'
};

const rarityColors = {
  common: 'border-gray-400',
  rare: 'border-blue-400',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400'
};

const rarityGlow = {
  common: '',
  rare: 'shadow-blue-500/20',
  epic: 'shadow-purple-500/30',
  legendary: 'shadow-yellow-500/40 animate-pulse'
};

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#9B59B6', '#E91E63'];

// ==================== ANIMATED COUNTER ====================

function AnimatedCounter({ value, prefix = '+', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animation = animate(count, value, { duration: 1, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', v => setDisplayValue(v));
    return () => {
      animation.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
}

// ==================== SHARE MENU ====================

function ShareMenu({ notification, onClose: _onClose }: { notification: AchievementNotification; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  
  const shareText = notification.shareText || 
    `🏆 I just earned "${notification.title}" on VFIDE! ${notification.reward?.xp ? `+${notification.reward.xp} XP` : ''} #VFIDE #Web3`;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: notification.title, text: shareText, url: shareUrl });
      } catch { /* ignore */ }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-full right-0 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl z-10"
    >
      <div className="flex items-center gap-1">
        <button
          onClick={shareToTwitter}
          className="p-2 hover:bg-zinc-800 rounded-lg text-sky-500 transition-colors"
          title="Share on Twitter"
        >
          <Twitter className="w-4 h-4" />
        </button>
        <button
          onClick={copyToClipboard}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        {'share' in navigator && (
          <button
            onClick={nativeShare}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ==================== MAIN TOAST ====================

function AchievementToast({ notification, onDismiss, position }: ToastProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { play: playSound } = useTransactionSounds();
  const hasPlayedSound = useRef(false);

  const rarity = notification.rarity || 'common';
  const isLegendary = rarity === 'legendary';

  useEffect(() => {
    // Play sound on mount
    if (!hasPlayedSound.current) {
      hasPlayedSound.current = true;
      playAchievementSound(notification.type, rarity);
      playSound('notification');
    }

    // Auto-dismiss (longer for legendary)
    const dismissTime = isLegendary ? 8000 : 5000;
    const timer = setTimeout(() => {
      if (!isHovered) onDismiss(notification.id);
    }, dismissTime);

    // Hide confetti
    const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, [notification.id, notification.type, rarity, isLegendary, onDismiss, isHovered, playSound]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8, rotateX: -15 }}
      animate={{ opacity: 1, y: position * 10, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, x: 300, scale: 0.8, rotateX: 15 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowShare(false); }}
    >
      {/* Legendary Glow Effect */}
      {isLegendary && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-yellow-500/30 rounded-2xl blur-xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-visible rounded-2xl z-10">
            {[...Array(isLegendary ? 40 : 25)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: 0, 
                  x: Math.random() * 350 - 25, 
                  opacity: 1, 
                  rotate: 0,
                  scale: 1
                }}
                animate={{ 
                  y: 300 + Math.random() * 100, 
                  x: Math.random() * 350 - 25, 
                  opacity: 0, 
                  rotate: Math.random() * 720 - 360,
                  scale: 0.5
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.3, ease: 'easeOut' }}
                className={`absolute ${i % 2 === 0 ? 'w-2 h-2 rounded-full' : 'w-3 h-1 rounded-sm'}`}
                style={{
                  backgroundColor: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                  top: -10,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Toast Content */}
      <div className={`relative bg-gradient-to-r ${colorMap[notification.type]} p-0.5 rounded-2xl shadow-2xl ${rarityGlow[rarity]}`}>
        <div className={`bg-zinc-900 rounded-2xl p-4 min-w-95 border-2 ${rarityColors[rarity]} border-opacity-50`}>
          {/* Combo Multiplier Badge */}
          {notification.comboMultiplier && notification.comboMultiplier > 1 && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute -top-3 -right-3 bg-gradient-to-r from-pink-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
            >
              <ChevronUp className="w-3 h-3" />
              {notification.comboMultiplier}x COMBO
            </motion.div>
          )}

          {/* Rarity Banner */}
          {rarity !== 'common' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                rarity === 'legendary' ? 'text-yellow-400' :
                rarity === 'epic' ? 'text-purple-400' :
                'text-blue-400'
              }`}
            >
              ✨ {rarity} Achievement
            </motion.div>
          )}

          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div 
              className={`bg-gradient-to-br ${colorMap[notification.type]} rounded-xl p-3 text-white shrink-0 shadow-lg`}
              animate={isLegendary ? { 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              } : {}}
              transition={{ duration: 2, repeat: isLegendary ? Infinity : 0 }}
            >
              {notification.icon ? (
                <span className="text-3xl">{notification.icon}</span>
              ) : (
                iconMap[notification.type]
              )}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-lg leading-tight">
                {notification.title}
              </h4>
              <p className="text-sm text-zinc-400 mt-1">
                {notification.description}
              </p>

              {/* Rewards with Animated Counters */}
              {notification.reward && (
                <motion.div 
                  className="flex items-center gap-2 flex-wrap mt-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {notification.reward.xp && (
                    <motion.span 
                      className="text-sm bg-purple-500/20 text-purple-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Star className="w-4 h-4" />
                      <AnimatedCounter value={notification.reward.xp} suffix=" XP" />
                    </motion.span>
                  )}
                  {notification.reward.vfide && (
                    <motion.span 
                      className="text-sm bg-yellow-500/20 text-yellow-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Gift className="w-4 h-4" />
                      <AnimatedCounter value={notification.reward.vfide} suffix=" VFIDE" />
                    </motion.span>
                  )}
                  {notification.reward.badge && (
                    <motion.span 
                      className="text-sm bg-blue-500/20 text-blue-400 font-bold px-3 py-1.5 rounded-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      🏆 {notification.reward.badge}
                    </motion.span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => onDismiss(notification.id)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShare(!showShare)}
                  className="p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showShare && (
                    <ShareMenu notification={notification} onClose={() => setShowShare(false)} />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Progress Bar (for streaks/quests) */}
          {(notification.type === 'streak' || notification.type === 'quest') && (
            <motion.div 
              className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className={`h-full bg-gradient-to-r ${colorMap[notification.type]}`}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ==================== CONTAINER ====================

export function AchievementToastContainer() {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addNotification = useCallback((notification: Omit<AchievementNotification, 'id' | 'timestamp'>) => {
    // Track combos
    setComboCount(prev => prev + 1);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setComboCount(0), 10000);

    const multiplier = comboCount >= 3 ? Math.min(comboCount, 5) : undefined;

    const newNotification: AchievementNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      comboMultiplier: multiplier,
    };
    
    setNotifications(prev => [...prev.slice(-4), newNotification]); // Max 5 visible
  }, [comboCount]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Expose globally
  useEffect(() => {
    window.showAchievement = addNotification;
    return () => { delete window.showAchievement; };
  }, [addNotification]);

  return (
    <div className="fixed top-4 right-4 z-100 flex flex-col gap-3 pointer-events-none max-w-md">
      {/* Combo Counter */}
      <AnimatePresence>
        {comboCount >= 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            className="self-end px-4 py-2 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full shadow-lg pointer-events-auto"
          >
            <span className="text-white font-bold text-sm">
              🔥 {comboCount}x Streak!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <div key={notification.id} className="pointer-events-auto">
            <AchievementToast 
              notification={notification} 
              onDismiss={dismissNotification}
              position={index}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ==================== SOUND EFFECTS ====================

function playAchievementSound(type: AchievementNotification['type'], rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common') {
  if (typeof window === 'undefined') return;
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const frequencies: Record<string, number[]> = {
      badge: [523.25, 659.25, 783.99],
      level_up: [261.63, 329.63, 392.00, 523.25],
      achievement: [440, 554.37, 659.25, 880],
      quest: [392, 493.88],
      streak: [659.25, 523.25, 659.25],
      reward: [523.25, 587.33, 659.25],
      combo: [523.25, 659.25, 783.99, 1046.50]
    };

    // Legendary gets extra notes
    const baseNotes = frequencies[type] ?? frequencies.achievement ?? [];
    const notes = rarity === 'legendary' 
      ? [...baseNotes, 1046.50, 1318.51]
      : baseNotes;
    
    if (notes.length === 0) return;
    
    const noteDuration = rarity === 'legendary' ? 0.2 : 0.15;
    const volume = rarity === 'legendary' ? 0.15 : 0.1;

    notes.forEach((freq, index) => {
      const noteOscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      noteOscillator.connect(noteGain);
      noteGain.connect(audioContext.destination);
      
      noteOscillator.frequency.value = freq;
      noteOscillator.type = rarity === 'legendary' ? 'triangle' : 'sine';
      
      const startTime = audioContext.currentTime + (index * noteDuration);
      noteGain.gain.setValueAtTime(volume, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration + 0.1);
      
      noteOscillator.start(startTime);
      noteOscillator.stop(startTime + noteDuration + 0.1);
    });
  } catch { /* Silent fail */ }
}

// ==================== EXPORTS ====================

export function triggerAchievement(
  type: AchievementNotification['type'],
  title: string,
  description: string,
  reward?: AchievementNotification['reward'],
  icon?: string,
  rarity?: AchievementNotification['rarity']
) {
  if (typeof window !== 'undefined' && window.showAchievement) {
    window.showAchievement({ type, title, description, reward, icon, rarity });
  }
}

declare global {
  interface Window {
    showAchievement?: (notification: Omit<AchievementNotification, 'id' | 'timestamp'>) => void;
  }
}
