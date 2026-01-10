/**
 * ONBOARDING CHECKLIST
 * 
 * Guided progression for new users
 * Duolingo-style checklist with rewards
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  CheckCircle2, Circle, Gift, ArrowRight, 
  Wallet, Shield, Users, MessageSquare, 
  Vote, Trophy, Zap, Star, X
} from 'lucide-react';

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
  const { address, isConnected } = useAccount();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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

  if (isDismissed || !isConnected) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
      >
        <Trophy className="w-5 h-5" />
        Getting Started ({completedCount}/{totalCount})
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 w-96 bg-[#1A1A1F] border-2 border-[#FFD700] rounded-xl shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 p-4 border-b border-[#FFD700]/30">
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
            <span className="text-white font-semibold">{completedCount} of {totalCount} completed</span>
            <span className="text-[#FFD700] font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[#2A2A2F] rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
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
        {items.map((item) => (
          <ChecklistItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Footer */}
      {completedCount === totalCount && (
        <div className="bg-[#50C878]/10 border-t border-[#50C878]/30 p-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-lg font-bold text-white mb-1">All Done!</div>
          <div className="text-sm text-[#A0A0A5] mb-3">You've completed the onboarding checklist</div>
          <button className="w-full px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-bold hover:opacity-90 transition-opacity">
            Claim Bonus Reward
          </button>
        </div>
      )}
    </div>
  );
}

function ChecklistItemCard({ item }: { item: ChecklistItem }) {
  return (
    <div className={`rounded-lg p-3 transition-all ${
      item.completed 
        ? 'bg-[#50C878]/10 border border-[#50C878]/30' 
        : 'bg-[#0A0A0B] border border-[#2A2A2F] hover:border-[#FFD700]/50'
    }`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`mt-0.5 ${item.completed ? 'text-[#50C878]' : 'text-[#A0A0A5]'}`}>
          {item.completed ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <h4 className={`font-bold mb-1 ${item.completed ? 'text-white' : 'text-white'}`}>
            {item.title}
          </h4>
          <p className="text-sm text-[#A0A0A5] mb-2">{item.description}</p>
          
          {/* Rewards */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.reward.xp && (
              <span className="text-xs bg-[#9333EA]/20 text-[#9333EA] px-2 py-1 rounded">
                +{item.reward.xp} XP
              </span>
            )}
            {item.reward.vfide && (
              <span className="text-xs bg-[#FFD700]/20 text-[#FFD700] px-2 py-1 rounded">
                +{item.reward.vfide} VFIDE
              </span>
            )}
            {item.reward.badge && (
              <span className="text-xs bg-[#3B82F6]/20 text-[#3B82F6] px-2 py-1 rounded">
                🏆 {item.reward.badge}
              </span>
            )}
          </div>

          {/* Action Button */}
          {!item.completed && (
            <a
              href={item.action.link}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#FFD700] hover:text-[#FFA500] transition-colors"
            >
              {item.action.label}
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
