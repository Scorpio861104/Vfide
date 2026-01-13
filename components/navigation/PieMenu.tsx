'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import {
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
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  children?: NavItem[];
}

// ============================================================================
// NAVIGATION STRUCTURE
// ============================================================================

/**
 * VFIDE ECOSYSTEM NAVIGATION
 * ==========================
 * 
 * A cryptocurrency ecosystem with integrated social platform, merchant services,
 * and decentralized governance. The navigation is organized into 6 core categories:
 * 
 * 1. DASHBOARD - Central hub for user overview and quick actions
 * 2. VAULT & WALLET - Asset management, security, and transactions  
 * 3. MERCHANT & PAY - Business tools: POS, QR payments, escrow
 * 4. SOCIAL - Full social media platform with feed, stories, messaging
 * 5. GOVERNANCE - DAO proposals, council, appeals, treasury
 * 6. REWARDS & COMMUNITY - Gamification, referrals, reputation
 */

const navigationItems: NavItem[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // DASHBOARD - Central User Hub
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: '#00F0FF',
  },
  
  // ────────────────────────────────────────────────────────────────────────────
  // VAULT & WALLET - Asset Security & Management
  // Secure storage, recovery, guardians, and wallet operations
  // ────────────────────────────────────────────────────────────────────────────
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
    ],
  },
  
  // ────────────────────────────────────────────────────────────────────────────
  // MERCHANT & PAY - Business & Payment Tools
  // Full POS system, QR payments, escrow protection, payroll streaming
  // ────────────────────────────────────────────────────────────────────────────
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
    ],
  },
  
  // ────────────────────────────────────────────────────────────────────────────
  // SOCIAL - Full Social Media Platform
  // Posts, stories, messaging, payments, and social analytics
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'social',
    label: 'Social',
    icon: MessageCircle,
    color: '#F59E0B',
    children: [
      { id: 'social-hub', label: 'Social Hub', href: '/social-hub', icon: Rss, color: '#F59E0B' },
      { id: 'stories', label: 'Stories', href: '/stories', icon: Camera, color: '#F59E0B' },
      { id: 'messages', label: 'Messages', href: '/social-messaging', icon: Mail, color: '#F59E0B' },
      { id: 'social-pay', label: 'Social Pay', href: '/social-payments', icon: Banknote, color: '#F59E0B' },
    ],
  },
  
  // ────────────────────────────────────────────────────────────────────────────
  // GOVERNANCE - DAO & Protocol Management
  // Proposals, voting, council, appeals, treasury oversight
  // ────────────────────────────────────────────────────────────────────────────
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
  
  // ────────────────────────────────────────────────────────────────────────────
  // REWARDS & COMMUNITY - Gamification & Reputation
  // Quests, achievements, leaderboards, referrals, endorsements
  // ────────────────────────────────────────────────────────────────────────────
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
    ],
  },
];

// ============================================================================
// BRUSHED METAL TILE COMPONENT
// ============================================================================

interface MetalTileProps {
  item: NavItem;
  angle: number;
  radius: number;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

function MetalTile({ 
  item, 
  angle, 
  radius, 
  isActive, 
  isHovered,
  onClick, 
  onHover,
  size = 'md' 
}: MetalTileProps) {
  const Icon = item.icon;
  
  // Calculate position from center
  const angleRad = (angle - 90) * (Math.PI / 180); // -90 to start from top
  const x = Math.cos(angleRad) * radius;
  const y = Math.sin(angleRad) * radius;
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };
  
  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28,
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x,
        y,
      }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        delay: angle / 1000,
      }}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
        absolute ${sizeClasses[size]} rounded-2xl
        flex flex-col items-center justify-center gap-1
        cursor-pointer select-none
        transition-shadow duration-300
        ${isActive ? 'ring-2 ring-offset-2 ring-offset-[#0A0A0F]' : ''}
      `}
      style={{
        // Brushed metal base
        background: `
          linear-gradient(135deg, 
            #2A2A35 0%, 
            #1A1A22 25%, 
            #252530 50%, 
            #1A1A22 75%, 
            #2A2A35 100%
          )
        `,
        // Brushed metal texture overlay
        backgroundImage: `
          linear-gradient(135deg, 
            #2A2A35 0%, 
            #1A1A22 25%, 
            #252530 50%, 
            #1A1A22 75%, 
            #2A2A35 100%
          ),
          repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 1px,
            rgba(255,255,255,0.02) 1px,
            rgba(255,255,255,0.02) 2px
          )
        `,
        boxShadow: isHovered
          ? `
              0 0 20px ${item.color}40,
              inset 0 1px 0 rgba(255,255,255,0.1),
              inset 0 -1px 0 rgba(0,0,0,0.3),
              0 4px 12px rgba(0,0,0,0.4)
            `
          : `
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 0 rgba(0,0,0,0.3),
              0 2px 8px rgba(0,0,0,0.3)
            `,
        border: `1px solid ${isHovered || isActive ? item.color + '60' : '#3A3A4520'}`,
        // Ring color handled via Tailwind ring-* classes with dynamic color
        ['--tw-ring-color' as string]: item.color,
      }}
    >
      {/* Brushed metal highlight line */}
      <div 
        className="absolute inset-x-2 top-1 h-px rounded-full opacity-30"
        style={{ 
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)` 
        }}
      />
      
      {/* Icon */}
      <div 
        className="transition-colors duration-200"
        style={{ color: isHovered || isActive ? item.color : '#8A8A8F' }}
      >
        <Icon size={iconSizes[size]} />
      </div>
      
      {/* Label - only show on hover or for larger sizes */}
      {size !== 'sm' && (
        <span 
          className="text-[10px] font-medium transition-colors duration-200 truncate max-w-full px-1"
          style={{ color: isHovered || isActive ? item.color : '#8A8A8F' }}
        >
          {item.label}
        </span>
      )}
      
      {/* Has children indicator */}
      {item.children && item.children.length > 0 && (
        <div 
          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ backgroundColor: item.color }}
        />
      )}
    </motion.button>
  );
}

// ============================================================================
// CENTER BUTTON COMPONENT
// ============================================================================

interface CenterButtonProps {
  isOpen: boolean;
  onClick: () => void;
  showBack: boolean;
  onBack: () => void;
  activeCategory?: NavItem;
}

function CenterButton({ isOpen, onClick, showBack, onBack, activeCategory }: CenterButtonProps) {
  return (
    <motion.button
      onClick={showBack ? onBack : onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer z-10"
      style={{
        // Brushed metal center button
        background: `
          radial-gradient(ellipse at 30% 30%, 
            #3A3A45 0%, 
            #252530 40%, 
            #1A1A22 100%
          )
        `,
        backgroundImage: `
          radial-gradient(ellipse at 30% 30%, 
            #3A3A45 0%, 
            #252530 40%, 
            #1A1A22 100%
          ),
          repeating-linear-gradient(
            45deg,
            transparent 0px,
            transparent 1px,
            rgba(255,255,255,0.015) 1px,
            rgba(255,255,255,0.015) 2px
          )
        `,
        boxShadow: isOpen
          ? `
              0 0 30px ${activeCategory?.color || '#00F0FF'}50,
              inset 0 2px 0 rgba(255,255,255,0.1),
              inset 0 -2px 0 rgba(0,0,0,0.3),
              0 4px 20px rgba(0,0,0,0.5)
            `
          : `
              inset 0 2px 0 rgba(255,255,255,0.08),
              inset 0 -2px 0 rgba(0,0,0,0.3),
              0 4px 16px rgba(0,0,0,0.4)
            `,
        border: `2px solid ${isOpen ? (activeCategory?.color || '#00F0FF') + '60' : '#3A3A4540'}`,
      }}
    >
      {/* Brushed metal highlight */}
      <div 
        className="absolute inset-2 top-1 h-4 rounded-full opacity-20"
        style={{ 
          background: `radial-gradient(ellipse at center top, rgba(255,255,255,0.4), transparent)` 
        }}
      />
      
      <AnimatePresence mode="wait">
        {showBack ? (
          <motion.div
            key="back"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft 
              size={24} 
              style={{ color: activeCategory?.color || '#00F0FF' }}
            />
          </motion.div>
        ) : isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={24} className="text-[#FF6B6B]" />
          </motion.div>
        ) : (
          <motion.div
            key="logo"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#00F0FF] font-bold text-lg"
          >
            V
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ============================================================================
// MAIN PIE MENU COMPONENT
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
      // Has children - show submenu
      setActiveCategory(item);
    } else if (item.href) {
      // No children - navigate directly
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

  // Determine which items to show
  const itemsToShow = activeCategory?.children || navigationItems;
  const itemCount = itemsToShow.length;
  const angleStep = 360 / itemCount;
  const radius = activeCategory ? 100 : 120; // Slightly smaller radius for submenu

  // Check if current path is active
  const isPathActive = (href?: string) => {
    if (!href) return false;
    return pathname?.startsWith(href);
  };

  return (
    <div 
      ref={menuRef}
      className="fixed bottom-6 right-6 z-[100]"
    >
      {/* Backdrop blur when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>
      
      {/* Menu Container */}
      <div className="relative flex items-center justify-center">
        {/* Category Label */}
        <AnimatePresence>
          {activeCategory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap"
              style={{
                backgroundColor: activeCategory.color + '20',
                color: activeCategory.color,
                border: `1px solid ${activeCategory.color}40`,
              }}
            >
              {activeCategory.label}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pie Menu Items */}
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              key={activeCategory?.id || 'main'}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {itemsToShow.map((item, index) => {
                const angle = index * angleStep;
                return (
                  <MetalTile
                    key={item.id}
                    item={item}
                    angle={angle}
                    radius={radius}
                    isActive={isPathActive(item.href)}
                    isHovered={hoveredItem === item.id}
                    onClick={() => handleItemClick(item)}
                    onHover={(hovered) => setHoveredItem(hovered ? item.id : null)}
                    size={activeCategory ? 'sm' : 'md'}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Center Button */}
        <CenterButton
          isOpen={isOpen}
          onClick={toggleMenu}
          showBack={!!activeCategory}
          onBack={handleBack}
          activeCategory={activeCategory || undefined}
        />
      </div>
      
      {/* Tooltip for hovered item */}
      <AnimatePresence>
        {hoveredItem && activeCategory && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-[#1A1A22] border border-[#3A3A45] text-[#F8F8FC]"
          >
            {itemsToShow.find(i => i.id === hoveredItem)?.label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PieMenu;
