/**
 * Shared navigation data for the "More" menu and PieMenu.
 *
 * Consolidation pass 2026-05-28:
 *   - Rewards group: 8 separate pages → single /rewards-hub with tabs
 *   - Coming-soon stubs: 7 pages → single /roadmap page
 *   - Insights group: 5 pages → single /insights hub with tabs
 *   - Social: /stories → tab inside /social-hub
 *   - Governance: /appeals + /fraud → tabs inside /governance
 *   - Security: /verifier → tab inside /security-center
 *
 * All old URLs are preserved as server-side redirects, so bookmarks and
 * existing deep-links continue to work.
 */

import type { ComponentType, CSSProperties } from 'react';
import {
  Home,
  LayoutDashboard,
  Cpu,
  Shield,
  Wallet,
  MessageCircle,
  Store,
  Vote,
  Trophy,
  Lock,
  CreditCard,
  Landmark,
  Rss,
  Mail,
  Banknote,
  Target,
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
  Compass,
  Scale,
  Rocket,
  Star,
  UserPlus,
  Sparkles,
  Palette,
  Globe,
  Info,
  LifeBuoy,
  HardDrive,
  Calendar,
  // CODE-3: Heart for Sanctum (charity/community giving)
  Heart,
  // Roadmap / coming-soon
  Map,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string; size?: number; style?: CSSProperties }>;
  color: string;
  children?: NavItem[];
  badge?: string;
  dataOnboarding?: string;
  /** Grayed-out and unclickable in MoreSheet — links to /roadmap#slug */
  comingSoon?: boolean;
}

export const navigationItems: NavItem[] = [
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

  // ─── Vault ────────────────────────────────────────────────────────────────
  {
    id: 'vault',
    label: 'Vault',
    icon: Shield,
    color: '#8B5CF6',
    children: [
      { id: 'vault-main',     label: 'My Vault',     href: '/vault',            icon: Shield,     color: '#8B5CF6' },
      { id: 'wallet',         label: 'Wallet',       href: '/crypto',           icon: Wallet,     color: '#8B5CF6' },
      { id: 'guardians',      label: 'Guardians',    href: '/guardians',        icon: ShieldCheck,color: '#8B5CF6' },
      { id: 'vault-recover',  label: 'Recovery',     href: '/vault/recover',    icon: KeyRound,   color: '#8B5CF6' },
      { id: 'vesting',        label: 'Vesting',      href: '/vesting',          icon: Gift,       color: '#8B5CF6' },
      // Coming-soon vault features — redirect to /roadmap#<slug>
      { id: 'multisig',       label: 'Multi-Sig',    href: '/roadmap#multisig', icon: Users,      color: '#8B5CF6', comingSoon: true },
      { id: 'time-locks',     label: 'Time Locks',   href: '/roadmap#time-locks',icon: Clock,     color: '#8B5CF6', comingSoon: true },
    ],
  },

  // ─── Merchant ─────────────────────────────────────────────────────────────
  {
    id: 'merchant',
    label: 'Merchant',
    icon: Store,
    color: '#10B981',
    dataOnboarding: 'nav-merchant',
    children: [
      { id: 'merchant-main',  label: 'Merchant Hub',   href: '/merchant',      icon: Store,          color: '#10B981', dataOnboarding: 'nav-merchant' },
      { id: 'pos',            label: 'POS Terminal',   href: '/pos',           icon: CreditCard,     color: '#10B981' },
      { id: 'buy',            label: 'Buy Tokens',     href: '/buy',           icon: Globe,          color: '#10B981' },
      { id: 'flashloan',      label: 'Flashloans P2P', href: '/flashloans',    icon: Zap,            color: '#10B981', badge: 'P2P' },
      { id: 'escrow',         label: 'Escrow',         href: '/escrow',        icon: Lock,           color: '#10B981' },
      { id: 'payroll',        label: 'Payroll',        href: '/payroll',       icon: Calendar,       color: '#10B981' },
      { id: 'cross-chain',    label: 'Cross-Chain',    href: '/cross-chain',   icon: ArrowLeftRight, color: '#10B981' },
      { id: 'stealth',        label: 'Private Pay',    href: '/stealth',       icon: Eye,            color: '#10B981' },
      { id: 'pay',            label: 'Quick Pay',      href: '/pay',           icon: Send,           color: '#10B981' },
      { id: 'subscriptions',  label: 'Subscriptions',  href: '/roadmap#subscriptions', icon: Repeat, color: '#10B981', comingSoon: true },
      { id: 'streaming',      label: 'Streaming',      href: '/roadmap#streaming',     icon: Zap,    color: '#10B981', comingSoon: true },
      { id: 'lending',        label: 'Lending',        href: '/roadmap#lending',       icon: Scale,  color: '#10B981', comingSoon: true },
      { id: 'merchant-agent', label: 'AI Agent',       href: '/roadmap#agent',         icon: Cpu,    color: '#10B981', comingSoon: true },
    ],
  },

  // ─── Social ───────────────────────────────────────────────────────────────
  {
    id: 'social',
    label: 'Social',
    icon: MessageCircle,
    color: '#F59E0B',
    dataOnboarding: 'nav-social',
    children: [
      // Social Hub is the single destination — tabs: Feed | Stories | Messages | Pay | Analytics
      { id: 'social-hub',  label: 'Social Hub',   href: '/social-hub',                 icon: Rss,     color: '#F59E0B', dataOnboarding: 'nav-social' },
      { id: 'stories',     label: 'Stories',      href: '/social-hub?tab=stories',     icon: Eye,     color: '#F59E0B' },
      { id: 'messages',    label: 'Messages',     href: '/social-hub?tab=messages',    icon: Mail,    color: '#F59E0B' },
      { id: 'social-pay',  label: 'Pay Friends',  href: '/social-hub?tab=pay',         icon: Banknote,color: '#F59E0B' },
    ],
  },

  // ─── Governance ───────────────────────────────────────────────────────────
  {
    id: 'governance',
    label: 'Governance',
    icon: Vote,
    color: '#6366F1',
    dataOnboarding: 'nav-governance',
    children: [
      // /governance is the single hub: Proposals | DAO | Council | Elections | Disputes | Appeals | Fraud
      { id: 'governance-main', label: 'Governance Hub', href: '/governance',                    icon: Vote,       color: '#6366F1', dataOnboarding: 'nav-governance', badge: 'DAO' },
      { id: 'appeals',         label: 'Appeals',        href: '/governance?tab=appeals',        icon: ShieldCheck,color: '#6366F1' },
      { id: 'fraud',           label: 'Fraud Reporting',href: '/governance?tab=fraud',          icon: Eye,        color: '#6366F1' },
      // CODE-3: Heart is semantically correct for Sanctum (charity/community giving)
      { id: 'sanctum',         label: 'Sanctum',        href: '/sanctum',                       icon: Heart,      color: '#6366F1' },
    ],
  },

  // ─── Rewards ──────────────────────────────────────────────────────────────
  {
    id: 'rewards',
    label: 'Rewards',
    icon: Trophy,
    color: '#EC4899',
    children: [
      // Single hub with tabs: Quests | Achievements | Badges | Leaderboard | Endorsements | Benefits | Referrals | About
      { id: 'rewards-hub',     label: 'Rewards Hub',    href: '/rewards-hub',                       icon: Sparkles,  color: '#EC4899' },
      { id: 'quests',          label: 'Quests',         href: '/rewards-hub?tab=quests',            icon: Target,    color: '#EC4899' },
      { id: 'achievements',    label: 'Achievements',   href: '/rewards-hub?tab=achievements',      icon: Star,      color: '#EC4899' },
      { id: 'leaderboard',     label: 'Leaderboard',    href: '/rewards-hub?tab=leaderboard',       icon: Trophy,    color: '#EC4899' },
      { id: 'invite',          label: 'Invite Friends', href: '/invite',                            icon: UserPlus,  color: '#EC4899' },
    ],
  },

  // ─── Insights ─────────────────────────────────────────────────────────────
  {
    id: 'insights',
    label: 'Insights',
    icon: TrendingUp,
    color: '#14B8A6',
    children: [
      // Single hub with tabs: Overview | Budgets | Tax Report | Performance | Price Alerts
      { id: 'insights-main',  label: 'Insights',       href: '/insights',                          icon: TrendingUp, color: '#14B8A6' },
      { id: 'budgets',        label: 'Budgets',        href: '/insights?tab=budgets',              icon: PiggyBank,  color: '#14B8A6' },
      { id: 'taxes',          label: 'Tax Report',     href: '/insights?tab=taxes',                icon: FileText,   color: '#14B8A6' },
      { id: 'price-alerts',   label: 'Price Alerts',   href: '/insights?tab=price-alerts',         icon: Bell,       color: '#14B8A6' },
      { id: 'reporting',      label: 'Full Reports',   href: '/roadmap#reporting',                 icon: BarChart3,  color: '#14B8A6', comingSoon: true },
    ],
  },

  // ─── Developer / Tools ────────────────────────────────────────────────────
  {
    id: 'developer',
    label: 'Tools',
    icon: Code,
    color: '#64748B',
    children: [
      { id: 'explorer',        label: 'Explorer',       href: '/explorer',        icon: Compass,    color: '#64748B' },
      { id: 'paper-wallet',    label: 'Paper Wallet',   href: '/paper-wallet',    icon: FileText,   color: '#64748B' },
      { id: 'hardware-wallet', label: 'Hardware Wallet',href: '/hardware-wallet', icon: HardDrive,  color: '#64748B' },
      { id: 'enterprise',      label: 'Enterprise',     href: '/enterprise',      icon: Landmark,   color: '#64748B' },
      { id: 'token-launch',    label: 'Token Launch',   href: '/token-launch',    icon: Rocket,     color: '#64748B' },
      { id: 'roadmap',         label: "What's Coming",  href: '/roadmap',         icon: Map,        color: '#64748B' },
    ],
  },

  // ─── Account ──────────────────────────────────────────────────────────────
  {
    id: 'account',
    label: 'Account',
    icon: User,
    color: '#94A3B8',
    children: [
      // /settings is the single config hub: Account | Vault | Security | Notifications
      { id: 'settings',  label: 'Settings',   href: '/settings',        icon: Settings,   color: '#94A3B8' },
      { id: 'profile',   label: 'Profile',    href: '/profile',         icon: User,       color: '#94A3B8' },
      { id: 'security',  label: 'Security',   href: '/security-center', icon: ShieldCheck,color: '#94A3B8' },
      { id: 'theme',     label: 'Theme',      href: '/theme',           icon: Palette,    color: '#94A3B8' },
      { id: 'help',      label: 'Help & Docs',href: '/docs',            icon: HelpCircle, color: '#94A3B8' },
      { id: 'legal',     label: 'Legal',      href: '/legal',           icon: Scale,      color: '#94A3B8' },
      { id: 'about',     label: 'About',      href: '/about',           icon: Info,       color: '#94A3B8' },
      { id: 'support',   label: 'Support',    href: '/support',         icon: LifeBuoy,   color: '#94A3B8' },
    ],
  },
];

/**
 * Flatten all group children into a single ordered list. Useful for the
 * MoreSheet's search/filter so a user typing "vault" matches items inside
 * the Vault group, not just the group label.
 */
export function flattenNavItems(items: NavItem[]): NavItem[] {
  const flat: NavItem[] = [];
  for (const item of items) {
    if (item.href) flat.push(item);
    if (item.children) {
      for (const c of item.children) flat.push(c);
    }
  }
  return flat;
}
