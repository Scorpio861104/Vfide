/**
 * ACHIEVEMENT TOAST SYSTEM
 * 
 * Real-time popup notifications for achievements, badges, level ups
 * With confetti animations and sound effects
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trophy, Star, Award, Flame, Gift, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AchievementNotification {
  id: string;
  type: 'badge' | 'level_up' | 'achievement' | 'quest' | 'streak' | 'reward';
  title: string;
  description: string;
  icon?: string;
  reward?: {
    xp?: number;
    vfide?: number;
    badge?: string;
  };
  timestamp: number;
}

interface ToastProps {
  notification: AchievementNotification;
  onDismiss: (id: string) => void;
}

const iconMap = {
  badge: <Award className="w-6 h-6" />,
  level_up: <Star className="w-6 h-6" />,
  achievement: <Trophy className="w-6 h-6" />,
  quest: <Zap className="w-6 h-6" />,
  streak: <Flame className="w-6 h-6" />,
  reward: <Gift className="w-6 h-6" />
};

const colorMap = {
  badge: 'from-blue-500 to-purple-500',
  level_up: 'from-yellow-500 to-orange-500',
  achievement: 'from-purple-500 to-pink-500',
  quest: 'from-cyan-500 to-blue-500',
  streak: 'from-orange-500 to-red-500',
  reward: 'from-green-500 to-teal-500'
};

function AchievementToast({ notification, onDismiss }: ToastProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    // Hide confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, [notification.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative"
    >
      {/* Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, x: Math.random() * 300, opacity: 1, rotate: 0 }}
              animate={{ 
                y: 400, 
                x: Math.random() * 300, 
                opacity: 0, 
                rotate: Math.random() * 720 
              }}
              transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.5 }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      {/* Toast Content */}
      <div className={`bg-linear-to-r ${colorMap[notification.type]} p-[2px] rounded-xl shadow-2xl`}>
        <div className="bg-[#1A1A1F] rounded-xl p-4 min-w-[350px]">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`bg-linear-to-br ${colorMap[notification.type]} rounded-lg p-3 text-white flex-shrink-0 animate-pulse`}>
              {notification.icon ? (
                <span className="text-2xl">{notification.icon}</span>
              ) : (
                iconMap[notification.type]
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white mb-1 text-lg">
                {notification.title}
              </h4>
              <p className="text-sm text-[#A0A0A5] mb-2">
                {notification.description}
              </p>

              {/* Rewards */}
              {notification.reward && (
                <div className="flex items-center gap-2 flex-wrap">
                  {notification.reward.xp && (
                    <span className="text-xs bg-[#9333EA]/20 text-[#9333EA] font-bold px-2 py-1 rounded">
                      +{notification.reward.xp} XP
                    </span>
                  )}
                  {notification.reward.vfide && (
                    <span className="text-xs bg-[#FFD700]/20 text-[#FFD700] font-bold px-2 py-1 rounded">
                      +{notification.reward.vfide} VFIDE
                    </span>
                  )}
                  {notification.reward.badge && (
                    <span className="text-xs bg-[#3B82F6]/20 text-[#3B82F6] font-bold px-2 py-1 rounded">
                      🏆 {notification.reward.badge}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => onDismiss(notification.id)}
              className="text-[#A0A0A5] hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AchievementToastContainer() {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);

  const addNotification = useCallback((notification: Omit<AchievementNotification, 'id' | 'timestamp'>) => {
    const newNotification: AchievementNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [...prev, newNotification]);

    // Play sound effect (optional)
    playAchievementSound(notification.type);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Expose to global window for easy access
  useEffect(() => {
    (window as any).showAchievement = addNotification;
    return () => {
      delete (window as any).showAchievement;
    };
  }, [addNotification]);

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <AchievementToast 
              notification={notification} 
              onDismiss={dismissNotification}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Sound effects (using Web Audio API)
function playAchievementSound(type: AchievementNotification['type']) {
  if (typeof window === 'undefined') return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different sounds for different types
    const frequencies = {
      badge: [523.25, 659.25, 783.99], // C-E-G (major chord)
      level_up: [261.63, 329.63, 392.00, 523.25], // C-E-G-C (octave)
      achievement: [440, 554.37, 659.25, 880], // A-C#-E-A (ascending)
      quest: [392, 493.88], // G-B (simple up)
      streak: [659.25, 523.25, 659.25], // E-C-E (bounce)
      reward: [523.25, 587.33, 659.25] // C-D-E (rising)
    };

    const notes = frequencies[type] || frequencies.achievement;
    const noteDuration = 0.15;

    notes.forEach((freq, index) => {
      const noteOscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      
      noteOscillator.connect(noteGain);
      noteGain.connect(audioContext.destination);
      
      noteOscillator.frequency.value = freq;
      noteOscillator.type = 'sine';
      
      const startTime = audioContext.currentTime + (index * noteDuration);
      noteGain.gain.setValueAtTime(0.1, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      noteOscillator.start(startTime);
      noteOscillator.stop(startTime + noteDuration);
    });
  } catch (error) {
    // Silent fail if audio not supported
    console.debug('Achievement sound failed:', error);
  }
}

// Helper function to trigger achievements from anywhere in the app
export function triggerAchievement(
  type: AchievementNotification['type'],
  title: string,
  description: string,
  reward?: AchievementNotification['reward'],
  icon?: string
) {
  if (typeof window !== 'undefined' && (window as any).showAchievement) {
    (window as any).showAchievement({ type, title, description, reward, icon });
  }
}

// TypeScript declaration
declare global {
  interface Window {
    showAchievement?: (notification: Omit<AchievementNotification, 'id' | 'timestamp'>) => void;
  }
}
