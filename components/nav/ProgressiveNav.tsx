/**
 * Progressive Navigation — Journey-based feature disclosure
 * 
 * First visit: Buy / Sell only.
 * After first tx: Dashboard unlocks.
 * After vault creation: Vault, Guardians unlock.
 * After 10 transactions: Analytics unlocks.
 * After ProofScore 1000: Governance unlocks.
 * 
 * The nav doesn't hide features — it introduces them at the right time.
 * Advanced users can access everything via a "Show all" toggle.
 * 
 * Usage:
 *   const { visibleNavItems, journeyStage, showAll, toggleShowAll } = useProgressiveNav();
 */
'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  Home, Store, Wallet, Shield, TrendingUp, Users, Award,
  BarChart3, Settings, Vote, Compass, type LucideIcon,
} from 'lucide-react';
import { features } from '@/lib/features';

// ── Types ───────────────────────────────────────────────────────────────────

export type JourneyStage =
  | 'visitor'      // Not connected
  | 'connected'    // Wallet connected, no transactions
  | 'transacting'  // Has made 1+ transactions
  | 'established'  // Has vault + guardians
  | 'merchant'     // Registered merchant
  | 'trusted'      // ProofScore 1000+
  | 'governor';    // ProofScore 3000+ or council member

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  unlocksAt: JourneyStage;
  badge?: string;
  featureFlag?: keyof typeof features;
  group: 'core' | 'finance' | 'commerce' | 'social' | 'governance' | 'system';
}

// ── Nav Definition ──────────────────────────────────────────────────────────

const STAGE_ORDER: JourneyStage[] = [
  'visitor', 'connected', 'transacting', 'established', 'merchant', 'trusted', 'governor',
];

const NAV_ITEMS: NavItem[] = [
  // Core — always visible
  { id: 'home', label: 'Home', href: '/', icon: Home, unlocksAt: 'visitor', group: 'core' },
  { id: 'marketplace', label: 'Marketplace', href: '/marketplace', icon: Compass, unlocksAt: 'visitor', group: 'core', featureFlag: 'marketplace' },

  // Unlocks on connect
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Home, unlocksAt: 'connected', group: 'core' },

  // Unlocks on first transaction
  { id: 'vault', label: 'Vault', href: '/vault', icon: Wallet, unlocksAt: 'transacting', group: 'finance' },
  { id: 'history', label: 'Transactions', href: '/dashboard?tab=history', icon: TrendingUp, unlocksAt: 'transacting', group: 'finance' },

  // Unlocks with vault
  { id: 'guardians', label: 'Guardians', href: '/guardians', icon: Shield, unlocksAt: 'established', group: 'finance' },

  // Unlocks for merchants
  { id: 'store', label: 'My Store', href: '/merchant', icon: Store, unlocksAt: 'merchant', group: 'commerce' },
  { id: 'pos', label: 'POS', href: '/pos', icon: Store, unlocksAt: 'merchant', group: 'commerce' },
  { id: 'analytics', label: 'Analytics', href: '/merchant/analytics', icon: BarChart3, unlocksAt: 'merchant', group: 'commerce' },

  // Unlocks at ProofScore 1000
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Award, unlocksAt: 'trusted', group: 'social' },
  { id: 'social', label: 'Social', href: '/social', icon: Users, unlocksAt: 'trusted', group: 'social', featureFlag: 'socialFeed' },

  // Unlocks at ProofScore 3000 / council
  { id: 'governance', label: 'Governance', href: '/governance', icon: Vote, unlocksAt: 'governor', group: 'governance' },
  { id: 'council', label: 'Council', href: '/council', icon: Vote, unlocksAt: 'governor', group: 'governance' },

  // System — always visible when connected
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, unlocksAt: 'connected', group: 'system' },
];

// ── Stage Detection ─────────────────────────────────────────────────────────

interface UserState {
  isConnected: boolean;
  hasTransactions: boolean;
  hasVault: boolean;
  hasGuardians: boolean;
  isMerchant: boolean;
  proofScore: number;
  isCouncilMember: boolean;
}

function detectStage(state: UserState): JourneyStage {
  if (!state.isConnected) return 'visitor';
  if (state.isCouncilMember || state.proofScore >= 3000) return 'governor';
  if (state.proofScore >= 1000) return 'trusted';
  if (state.isMerchant) return 'merchant';
  if (state.hasVault && state.hasGuardians) return 'established';
  if (state.hasTransactions) return 'transacting';
  return 'connected';
}

function isStageUnlocked(currentStage: JourneyStage, requiredStage: JourneyStage): boolean {
  return STAGE_ORDER.indexOf(currentStage) >= STAGE_ORDER.indexOf(requiredStage);
}

// ── Context ─────────────────────────────────────────────────────────────────

interface ProgressiveNavContextValue {
  journeyStage: JourneyStage;
  visibleNavItems: NavItem[];
  lockedNavItems: NavItem[];
  allNavItems: NavItem[];
  showAll: boolean;
  toggleShowAll: () => void;
  isItemUnlocked: (item: NavItem) => boolean;
  nextMilestone: { stage: JourneyStage; label: string; itemsToUnlock: NavItem[] } | null;
}

const ProgressiveNavContext = createContext<ProgressiveNavContextValue | null>(null);

const SHOW_ALL_KEY = 'vfide.nav-show-all';

interface ProgressiveNavProviderProps {
  children: ReactNode;
  userState: UserState;
}

export function ProgressiveNavProvider({ children, userState }: ProgressiveNavProviderProps) {
  const [showAll, setShowAll] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SHOW_ALL_KEY) === 'true';
    }
    return false;
  });

  const toggleShowAll = useCallback(() => {
    setShowAll(prev => {
      const next = !prev;
      localStorage.setItem(SHOW_ALL_KEY, String(next));
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const stage = detectStage(userState);

    const isItemUnlocked = (item: NavItem): boolean => {
      if (item.featureFlag && !features[item.featureFlag]) return false;
      return isStageUnlocked(stage, item.unlocksAt);
    };

    const allItems = NAV_ITEMS.filter(item =>
      !item.featureFlag || features[item.featureFlag]
    );

    const visible = showAll
      ? allItems
      : allItems.filter(isItemUnlocked);

    const locked = allItems.filter(item => !isItemUnlocked(item));

    // Find next milestone
    const currentIdx = STAGE_ORDER.indexOf(stage);
    let nextMilestone: ProgressiveNavContextValue['nextMilestone'] = null;

    if (currentIdx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[currentIdx + 1];
      if (nextStage) {
        const nextItems = allItems.filter(item => item.unlocksAt === nextStage);
        if (nextItems.length > 0) {
          const labels: Record<JourneyStage, string> = {
          visitor: 'Connect your wallet',
          connected: 'Connect your wallet',
          transacting: 'Make your first transaction',
          established: 'Create a vault and add guardians',
          merchant: 'Register as a merchant',
          trusted: 'Reach ProofScore 1,000',
          governor: 'Reach ProofScore 3,000',
        };
          nextMilestone = {
            stage: nextStage,
            label: labels[nextStage],
            itemsToUnlock: nextItems,
          };
        }
      }
    }

    return { journeyStage: stage, visibleNavItems: visible, lockedNavItems: locked, allNavItems: allItems, showAll, toggleShowAll, isItemUnlocked, nextMilestone };
  }, [userState, showAll, toggleShowAll]);

  return (
    <ProgressiveNavContext.Provider value={value}>
      {children}
    </ProgressiveNavContext.Provider>
  );
}

export function useProgressiveNav(): ProgressiveNavContextValue {
  const ctx = useContext(ProgressiveNavContext);
  if (!ctx) throw new Error('useProgressiveNav must be used within ProgressiveNavProvider');
  return ctx;
}

// ── Milestone Banner ────────────────────────────────────────────────────────

/**
 * Drop this into the dashboard to show what unlocks next.
 * 
 * "Make your first transaction to unlock: Vault, Transaction History"
 */
export function NextMilestoneBanner() {
  const { nextMilestone, showAll } = useProgressiveNav();

  if (!nextMilestone || showAll) return null;

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-4">
      <div className="p-2 rounded-xl bg-cyan-500/20">
        <Award size={20} className="text-cyan-400" />
      </div>
      <div className="flex-1">
        <div className="text-white text-sm font-bold">{nextMilestone.label}</div>
        <div className="text-gray-400 text-xs mt-0.5">
          Unlocks: {nextMilestone.itemsToUnlock.map(i => i.label).join(', ')}
        </div>
      </div>
    </div>
  );
}
