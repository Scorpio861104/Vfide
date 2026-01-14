'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Shield,
  Wallet,
  MessageCircle,
  Store,
  Vote,
  Trophy,
  X,
  ChevronLeft,
  Lock,
  CreditCard,
  Landmark,
  Rss,
  Camera,
  Mail,
  Banknote,
  Scroll,
  Gavel,
  AlertTriangle,
  Target,
  Award,
  Medal,
  Crown,
  Search,
  ShieldCheck,
  KeyRound,
  Zap,
  ArrowLeftRight,
  Eye,
  Clock,
  Users,
  TrendingUp,
  PiggyBank,
  FileText,
  Code,
  Settings,
  User,
  Bell,
  HelpCircle,
  Gift,
  Repeat,
  Send,
  BarChart3,
  ClipboardList,
  TestTube,
  Compass,
  Scale,
  Rocket,
  Star,
  UserPlus,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  color: string;
  children?: NavItem[];
  badge?: string;
}

// ============================================================================
// NAVIGATION STRUCTURE
// ============================================================================

const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
    color: '#F8F8FC',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: '#00F0FF',
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: Shield,
    color: '#8B5CF6',
    children: [
      { id: 'vault-main', label: 'My Vault', href: '/vault', icon: Shield, color: '#8B5CF6' },
      { id: 'wallet', label: 'Wallet', href: '/crypto', icon: Wallet, color: '#8B5CF6' },
      { id: 'guardians', label: 'Guardians', href: '/guardians', icon: ShieldCheck, color: '#8B5CF6' },
      { id: 'vault-recover', label: 'Recovery', href: '/vault/recover', icon: KeyRound, color: '#8B5CF6' },
      { id: 'multisig', label: 'Multi-Sig', href: '/multisig', icon: Users, color: '#8B5CF6' },
      { id: 'time-locks', label: 'Time Locks', href: '/time-locks', icon: Clock, color: '#8B5CF6' },
      { id: 'vesting', label: 'Vesting', href: '/vesting', icon: Gift, color: '#8B5CF6' },
    ],
  },
  {
    id: 'merchant',
    label: 'Merchant',
    icon: Store,
    color: '#10B981',
    children: [
      { id: 'merchant-main', label: 'Merchant Hub', href: '/merchant', icon: Store, color: '#10B981' },
      { id: 'pos', label: 'POS Terminal', href: '/pos', icon: CreditCard, color: '#10B981' },
      { id: 'escrow', label: 'Escrow', href: '/escrow', icon: Lock, color: '#10B981' },
      { id: 'payroll', label: 'Payroll', href: '/payroll', icon: Banknote, color: '#10B981' },
      { id: 'streaming', label: 'Streaming', href: '/streaming', icon: Zap, color: '#10B981', badge: 'NEW' },
      { id: 'cross-chain', label: 'Cross-Chain', href: '/cross-chain', icon: ArrowLeftRight, color: '#10B981' },
      { id: 'stealth', label: 'Private Pay', href: '/stealth', icon: Eye, color: '#10B981' },
      { id: 'pay', label: 'Quick Pay', href: '/pay', icon: Send, color: '#10B981' },
      { id: 'subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: Repeat, color: '#10B981' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: MessageCircle,
    color: '#F59E0B',
    children: [
      { id: 'social-hub', label: 'Social Hub', href: '/social-hub', icon: Rss, color: '#F59E0B' },
      { id: 'feed', label: 'Feed', href: '/feed', icon: Rss, color: '#F59E0B' },
      { id: 'stories', label: 'Stories', href: '/stories', icon: Camera, color: '#F59E0B' },
      { id: 'messages', label: 'Messages', href: '/social-messaging', icon: Mail, color: '#F59E0B' },
      { id: 'social-pay', label: 'Social Pay', href: '/social-payments', icon: Banknote, color: '#F59E0B' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Vote,
    color: '#6366F1',
    children: [
      { id: 'governance-main', label: 'Proposals', href: '/governance', icon: Scroll, color: '#6366F1' },
      { id: 'council', label: 'Council', href: '/council', icon: Gavel, color: '#6366F1' },
      { id: 'appeals', label: 'Appeals', href: '/appeals', icon: AlertTriangle, color: '#6366F1' },
      { id: 'treasury', label: 'Treasury', href: '/treasury', icon: Landmark, color: '#6366F1' },
    ],
  },
  {
    id: 'rewards',
    label: 'Rewards',
    icon: Trophy,
    color: '#EC4899',
    children: [
      { id: 'quests', label: 'Quests', href: '/quests', icon: Target, color: '#EC4899' },
      { id: 'achievements', label: 'Achievements', href: '/achievements', icon: Award, color: '#EC4899' },
      { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: Crown, color: '#EC4899' },
      { id: 'headhunter', label: 'Referrals', href: '/headhunter', icon: Search, color: '#EC4899' },
      { id: 'endorsements', label: 'Endorsements', href: '/endorsements', icon: Medal, color: '#EC4899' },
      { id: 'badges', label: 'Badges', href: '/badges', icon: Star, color: '#EC4899' },
      { id: 'invite', label: 'Invite Friends', href: '/invite', icon: UserPlus, color: '#EC4899' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: TrendingUp,
    color: '#14B8A6',
    children: [
      { id: 'insights-main', label: 'Analytics', href: '/insights', icon: TrendingUp, color: '#14B8A6' },
      { id: 'taxes', label: 'Tax Report', href: '/taxes', icon: FileText, color: '#14B8A6' },
      { id: 'budgets', label: 'Budgets', href: '/budgets', icon: PiggyBank, color: '#14B8A6' },
      { id: 'performance', label: 'Performance', href: '/performance', icon: BarChart3, color: '#14B8A6' },
      { id: 'reporting', label: 'Reports', href: '/reporting', icon: ClipboardList, color: '#14B8A6' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    icon: Code,
    color: '#64748B',
    children: [
      { id: 'developer-main', label: 'Dev Hub', href: '/developer', icon: Code, color: '#64748B' },
      { id: 'testnet', label: 'Testnet', href: '/testnet', icon: TestTube, color: '#64748B' },
      { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass, color: '#64748B' },
      { id: 'token-launch', label: 'Token Launch', href: '/token-launch', icon: Rocket, color: '#64748B' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    color: '#94A3B8',
    children: [
      { id: 'profile', label: 'Profile', href: '/profile', icon: User, color: '#94A3B8' },
      { id: 'notifications', label: 'Notifications', href: '/notifications', icon: Bell, color: '#94A3B8' },
      { id: 'security', label: 'Security', href: '/security-center', icon: ShieldCheck, color: '#94A3B8' },
      { id: 'settings', label: 'Settings', href: '/setup', icon: Settings, color: '#94A3B8' },
      { id: 'help', label: 'Help & Docs', href: '/docs', icon: HelpCircle, color: '#94A3B8' },
      { id: 'legal', label: 'Legal', href: '/legal', icon: Scale, color: '#94A3B8' },
    ],
  },
];

// ============================================================================
// COMPACT TILE COMPONENT
// ============================================================================

interface CompactTileProps {
  item: NavItem;
  index: number;
  total: number;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  isSubmenu?: boolean;
}

function CompactTile({ 
  item, 
  index,
  isActive, 
  isHovered,
  onClick, 
  onHover,
  isSubmenu = false,
}: CompactTileProps) {
  const Icon = item.icon;
  
  // Stagger delay based on index
  const delay = index * 0.03;
  
  return (
    <motion.button
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        x: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      whileHover={{ scale: 1.02, x: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: 'spring', 
        stiffness: 500, 
        damping: 30,
        delay,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      aria-label={`Navigate to ${item.label}${item.children ? ' (has submenu)' : ''}`}
      aria-current={isActive ? 'page' : undefined}
      className={`
        relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 group overflow-hidden
        ${isSubmenu ? 'pl-4' : ''}
      `}
      style={{
        background: isHovered || isActive
          ? `linear-gradient(135deg, ${item.color}12 0%, rgba(40,40,50,0.6) 50%, ${item.color}08 100%)`
          : 'linear-gradient(135deg, rgba(35,35,45,0.4) 0%, rgba(25,25,35,0.3) 100%)',
        borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
        boxShadow: isHovered || isActive
          ? `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Brushed metal texture */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 1px,
            rgba(255,255,255,0.015) 1px,
            rgba(255,255,255,0.015) 2px
          )`,
        }}
      />
      
      {/* Top highlight */}
      <div 
        className="absolute top-0 left-2 right-2 h-px opacity-40"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }}
      />
      
      {/* Scan line effect on hover */}
      {isHovered && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0 w-1/3 bg-linear-to-r from-transparent via-white/10 to-transparent"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Icon Container */}
      <div
        className={`
          relative w-8 h-8 rounded-lg flex items-center justify-center
          transition-all duration-200 shrink-0
        `}
        style={{
          background: isActive || isHovered 
            ? `${item.color}20` 
            : 'rgba(255,255,255,0.03)',
          boxShadow: isActive || isHovered
            ? `0 0 16px ${item.color}50, 0 0 8px ${item.color}30, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 0 8px ${item.color}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* Outer glow ring */}
        <div 
          className="absolute inset-0 rounded-lg transition-opacity duration-300"
          style={{ 
            background: `radial-gradient(circle at center, ${item.color}15 0%, transparent 70%)`,
            opacity: isActive || isHovered ? 1 : 0.4,
          }}
        />
        {/* Inner glow effect */}
        {(isActive || isHovered) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 rounded-lg blur-sm"
            style={{ background: `${item.color}40` }}
          />
        )}
        <Icon 
          size={16} 
          className="relative z-10 transition-all duration-200"
          style={{ 
            color: isActive || isHovered ? item.color : item.color,
            filter: `drop-shadow(0 0 ${isActive || isHovered ? '6px' : '3px'} ${item.color}${isActive || isHovered ? '80' : '40'})`,
          }}
        />
      </div>
      
      {/* Label */}
      <span 
        className={`
          flex-1 text-sm font-medium transition-colors duration-200 truncate
          ${isActive ? 'text-[#F8F8FC]' : 'text-[#A0A0A5] group-hover:text-[#F8F8FC]'}
        `}
      >
        {item.label}
      </span>
      
      {/* Badge */}
      {item.badge && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
          style={{
            background: `${item.color}20`,
            color: item.color,
            boxShadow: `0 0 8px ${item.color}30`,
          }}
        >
          {item.badge}
        </span>
      )}
      
      {/* Has children indicator */}
      {item.children && item.children.length > 0 && (
        <motion.div
          animate={{ x: isHovered ? 2 : 0 }}
          className="w-4 h-4 flex items-center justify-center shrink-0"
        >
          <ChevronLeft 
            size={14} 
            className="rotate-180 transition-colors duration-200"
            style={{ color: isHovered ? item.color : '#4A4A4F' }}
          />
        </motion.div>
      )}
    </motion.button>
  );
}

// ============================================================================
// CENTER TRIGGER BUTTON
// ============================================================================

interface TriggerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  activeCategory?: NavItem;
}

function TriggerButton({ isOpen, onClick, activeCategory }: TriggerButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      className="relative w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden"
      style={{
        background: isOpen
          ? `linear-gradient(145deg, ${activeCategory?.color || '#6366f1'}25 0%, #2a2a38 40%, #1e1e28 100%)`
          : 'linear-gradient(145deg, #3a3a4a 0%, #2a2a38 50%, #1e1e28 100%)',
        boxShadow: isOpen
          ? `
            0 0 30px ${activeCategory?.color || '#6366f1'}40,
            0 8px 24px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -1px 0 rgba(0,0,0,0.3)
          `
          : `
            0 8px 24px rgba(0,0,0,0.5),
            0 2px 6px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.3)
          `,
        border: `1px solid ${isOpen ? (activeCategory?.color || '#6366f1') + '50' : '#3a3a4a'}`,
      }}
    >
      {/* Brushed metal horizontal lines */}
      <div 
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 1px,
            rgba(255,255,255,0.04) 1px,
            rgba(255,255,255,0.04) 2px
          )`,
        }}
      />
      
      {/* Corner bevels - top highlight */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-b from-white/12 to-transparent rounded-t-2xl" />
      
      {/* Corner bevels - bottom shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-t from-black/30 to-transparent rounded-b-2xl" />
      
      {/* Left edge highlight */}
      <div className="absolute top-2 bottom-2 left-0 w-px bg-linear-to-b from-transparent via-white/10 to-transparent" />
      
      {/* Rotating border effect when open */}
      {isOpen && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, transparent, ${activeCategory?.color || '#6366f1'}40, transparent)`,
            borderRadius: '1rem',
          }}
        />
      )}
      
      {/* Inner content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={20} className="text-[#FF6B6B]" />
            </motion.div>
          ) : (
            <motion.div
              key="logo"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-lg"
              style={{
                background: 'linear-gradient(135deg, #c0c5d0 0%, #9ca3b0 40%, #7a8290 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              V
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ============================================================================
// MAIN PIE MENU - SLIDE OUT STYLE
// ============================================================================

export function PieMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveCategory(null);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveCategory(null);
  }, [pathname]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCategory) {
          setActiveCategory(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCategory]);

  const handleItemClick = useCallback((item: NavItem) => {
    if (item.children && item.children.length > 0) {
      setActiveCategory(item);
    } else if (item.href) {
      router.push(item.href);
      setIsOpen(false);
      setActiveCategory(null);
    }
  }, [router]);

  const handleBack = useCallback(() => {
    setActiveCategory(null);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
    if (isOpen) {
      setActiveCategory(null);
    }
  }, [isOpen]);

  const itemsToShow = activeCategory?.children || navigationItems;

  const isPathActive = (href?: string) => {
    if (!href) return false;
    return pathname?.startsWith(href);
  };

  return (
    <nav 
      ref={menuRef}
      className="fixed bottom-4 right-4 z-100 sm:bottom-6 sm:right-6"
      aria-label="Main navigation"
    >
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
          />
        )}
      </AnimatePresence>
      
      {/* Menu Container */}
      <div className="relative flex items-end justify-end gap-3">
        
        {/* Slide-out Menu Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.98 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 30,
              }}
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: 'linear-gradient(145deg, #2a2a38 0%, #222230 30%, #1a1a26 70%, #161620 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `
                  0 25px 50px -12px rgba(0, 0, 0, 0.6),
                  0 0 0 1px rgba(255,255,255,0.05),
                  inset 0 1px 0 rgba(255,255,255,0.12),
                  inset 0 -2px 0 rgba(0,0,0,0.3)
                `,
                minWidth: '200px',
                maxWidth: '240px',
              }}
            >
              {/* Brushed metal vertical texture */}
              <div 
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    90deg,
                    transparent 0px,
                    transparent 1px,
                    rgba(255,255,255,0.02) 1px,
                    rgba(255,255,255,0.02) 2px
                  )`,
                }}
              />
              
              {/* Secondary horizontal brush strokes */}
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent 0px,
                    transparent 3px,
                    rgba(255,255,255,0.015) 3px,
                    rgba(255,255,255,0.015) 4px
                  )`,
                }}
              />
              
              {/* Top edge highlight bevel */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)',
                }}
              />
              
              {/* Left edge highlight */}
              <div 
                className="absolute top-4 bottom-4 left-0 w-px pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)',
                }}
              />
              
              {/* Top glow line */}
              <div 
                className="absolute top-0 left-4 right-4 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${activeCategory?.color || '#6366f1'}60, transparent)`,
                }}
              />
              
              {/* Grid pattern overlay */}
              <div 
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
              
              {/* Header for submenu */}
              <AnimatePresence>
                {activeCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative border-b border-white/5 overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, rgba(50,50,65,0.4) 0%, rgba(35,35,48,0.3) 100%)',
                    }}
                  >
                    {/* Brushed texture for header */}
                    <div 
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          90deg,
                          transparent 0px,
                          transparent 1px,
                          rgba(255,255,255,0.02) 1px,
                          rgba(255,255,255,0.02) 2px
                        )`,
                      }}
                    />
                    <motion.button
                      onClick={handleBack}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left group relative z-10"
                    >
                      <motion.div
                        animate={{ x: [-2, 0, -2] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronLeft 
                          size={16} 
                          style={{ color: activeCategory.color }}
                        />
                      </motion.div>
                      <span 
                        className="text-sm font-semibold"
                        style={{ color: activeCategory.color }}
                      >
                        {activeCategory.label}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Menu Items */}
              <div className="py-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory?.id || 'main'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-0.5 px-1.5"
                  >
                    {itemsToShow.map((item, index) => (
                      <CompactTile
                        key={item.id}
                        item={item}
                        index={index}
                        total={itemsToShow.length}
                        isActive={isPathActive(item.href)}
                        isHovered={hoveredItem === item.id}
                        onClick={() => handleItemClick(item)}
                        onHover={(hovered) => setHoveredItem(hovered ? item.id : null)}
                        isSubmenu={!!activeCategory}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Bottom accent line */}
              <div 
                className="absolute bottom-0 left-4 right-4 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${activeCategory?.color || '#6366f1'}40, transparent)`,
                }}
              />
              
              {/* Bottom bevel shadow */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Trigger Button */}
        <TriggerButton
          isOpen={isOpen}
          onClick={toggleMenu}
          activeCategory={activeCategory || undefined}
        />
      </div>
    </nav>
  );
}

export default PieMenu;
