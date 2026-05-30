/**
 * Shared navigation data for the "More" menu and PieMenu.
 *
 * Previously this lived inline in PieMenu.tsx, which meant if we
 * wanted a second consumer (the new MoreSheet that lives in the
 * bottom tab bar) we either had to duplicate the data or export it
 * from PieMenu. Splitting it into its own module is the cleaner move:
 * one source of truth for "what destinations exist," consumed by
 * whatever surface chooses to render them.
 *
 * The shape (parent group → children) was designed for a radial
 * menu but reads fine in any list/grid layout. The `color` field is
 * used by PieMenu for its colored arcs; MoreSheet uses it as the
 * group accent and otherwise lets the standard text colors run.
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
  Camera,
  Mail,
  Banknote,
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
  Compass,
  Scale,
  Rocket,
  Star,
  UserPlus,
  Sparkles,
  Palette,
  Globe,
  Layers,
  Sliders,
  Info,
  LifeBuoy,
  Monitor,
  ShieldAlert,
  HardDrive,
  Tag,
  // CODE-3: Heart added for Sanctum (charity/community giving — semantic match over Cpu)
  Heart,
  // CODE-4: Calendar added for Payroll (scheduled payment, not a banknote)
  Calendar,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: ComponentType<{ className?: string; size?: number; style?: CSSProperties }>;
  /** Group accent color. PieMenu uses this for arc tinting; MoreSheet uses it
   * for the small group color indicator. */
  color: string;
  children?: NavItem[];
  /** Small tag rendered next to the label, e.g. "NEW" or "DAO". */
  badge?: string;
  /** Tutorial / product-tour anchor. Not used by MoreSheet. */
  dataOnboarding?: string;
  /** T2-4: If true, item is rendered grayed-out and unclickable in MoreSheet. */
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
      { id: 'vault-settings', label: 'Settings', href: '/vault/settings', icon: Settings, color: '#8B5CF6' },
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
    dataOnboarding: 'nav-merchant',
    children: [
      { id: 'merchant-main', label: 'Merchant Hub',  href: '/merchant',      icon: Store,          color: '#10B981', dataOnboarding: 'nav-merchant' },
      { id: 'pos',           label: 'POS Terminal',  href: '/pos',           icon: CreditCard,     color: '#10B981' },
      { id: 'buy',           label: 'Buy Tokens',    href: '/buy',           icon: Globe,          color: '#10B981' },
      // CODE-4: Distinct icons to avoid triple-Banknote confusion in the Merchant group
      { id: 'flashloan',     label: 'Flashloans P2P',href: '/flashloans',    icon: Zap,            color: '#10B981', badge: 'P2P' },
      { id: 'escrow',        label: 'Escrow',        href: '/escrow',        icon: Lock,           color: '#10B981' },
      { id: 'payroll',       label: 'Payroll',       href: '/payroll',       icon: Calendar,       color: '#10B981' },
      { id: 'streaming',     label: 'Streaming',     href: '/streaming',     icon: Zap,            color: '#10B981', comingSoon: true },
      { id: 'cross-chain',   label: 'Cross-Chain',   href: '/cross-chain',   icon: ArrowLeftRight, color: '#10B981' },
      { id: 'stealth',       label: 'Private Pay',   href: '/stealth',       icon: Eye,            color: '#10B981', comingSoon: true },
      { id: 'pay',           label: 'Quick Pay',     href: '/pay',           icon: Send,           color: '#10B981' },
      { id: 'subscriptions', label: 'Subscriptions', href: '/subscriptions', icon: Repeat,         color: '#10B981' },
      { id: 'lending',       label: 'Lending',       href: '/lending',       icon: Scale,          color: '#10B981', comingSoon: true },
      // NAV-10: Use merchant-prefixed IDs to avoid duplicate IDs with Vault group
      { id: 'merchant-multisig',    label: 'Multi-Sig',     href: '/multisig',      icon: Users,          color: '#10B981', comingSoon: true },
      { id: 'merchant-time-locks',  label: 'Time Locks',    href: '/time-locks',    icon: Clock,          color: '#10B981', comingSoon: true },
      { id: 'agent',         label: 'AI Agent',      href: '/agent',         icon: Cpu,            color: '#10B981', comingSoon: true },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: MessageCircle,
    color: '#F59E0B',
    dataOnboarding: 'nav-social',
    children: [
      // T1-1: All social routes now consolidated under /social-hub with tabs
      { id: 'social-hub',  label: 'Social Hub',   href: '/social-hub',              icon: Rss,      color: '#F59E0B', dataOnboarding: 'nav-social' },
      // NAV-11: Removed duplicate 'feed' entry — both pointed to /social-hub (Feed is the default tab)
      { id: 'stories',     label: 'Stories',      href: '/stories',                  icon: Camera,   color: '#F59E0B' },
      // NAV-3/NAV-11: Use tab-specific hrefs so clicking opens the right tab directly
      { id: 'messages',    label: 'Messages',     href: '/social-hub?tab=messages',  icon: Mail,     color: '#F59E0B' },
      { id: 'social-pay',  label: 'Pay Friends',  href: '/social-hub?tab=pay',       icon: Banknote, color: '#F59E0B' },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Vote,
    color: '#6366F1',
    dataOnboarding: 'nav-governance',
    children: [
      // T1-2: /governance is now the single consolidated hub (Proposals | DAO | Council | Elections | Treasury | Disputes)
      { id: 'governance-main', label: 'Governance Hub', href: '/governance', icon: Vote, color: '#6366F1', dataOnboarding: 'nav-governance', badge: 'DAO' },
      { id: 'appeals',         label: 'Appeals',         href: '/appeals',   icon: AlertTriangle, color: '#6366F1' },
      { id: 'fraud',           label: 'Fraud Reporting', href: '/fraud',     icon: ShieldCheck,   color: '#6366F1' },
      { id: 'treasury',        label: 'Treasury',        href: '/treasury',  icon: Landmark,      color: '#6366F1' },
      // T1-4: Sanctum moved from Account to Governance (it's protocol finance, not account settings)
      // CODE-3: Heart is semantically correct for Sanctum (charity/community giving) vs Cpu (AI/hardware)
      { id: 'sanctum',         label: 'Sanctum',         href: '/sanctum',   icon: Heart,         color: '#6366F1' },
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
      { id: 'benefits', label: 'Benefits', href: '/benefits', icon: Tag, color: '#EC4899' },
      // NAV-10: Use rewards-hub ID to avoid duplicate with the parent group ID 'rewards'
      { id: 'rewards-hub', label: 'Rewards Hub', href: '/rewards', icon: Sparkles, color: '#EC4899' },
      { id: 'invite', label: 'Invite Friends', href: '/invite', icon: UserPlus, color: '#EC4899' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: TrendingUp,
    color: '#14B8A6',
    children: [
      { id: 'insights-main', label: 'Analytics',    href: '/insights',      icon: TrendingUp,  color: '#14B8A6' },
      { id: 'taxes',         label: 'Tax Report',   href: '/taxes',         icon: FileText,    color: '#14B8A6' },
      { id: 'budgets',       label: 'Budgets',      href: '/budgets',       icon: PiggyBank,   color: '#14B8A6' },
      { id: 'performance',   label: 'Performance',  href: '/performance',   icon: BarChart3,   color: '#14B8A6' },
      { id: 'reporting',     label: 'Reports',      href: '/reporting',     icon: ClipboardList, color: '#14B8A6', comingSoon: true },
      { id: 'price-alerts',  label: 'Price Alerts', href: '/price-alerts',  icon: Bell,        color: '#14B8A6' },
    ],
  },
  {
    id: 'developer',
    label: 'Tools',
    icon: Code,
    color: '#64748B',
    children: [
      { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass, color: '#64748B' },
      { id: 'paper-wallet', label: 'Paper Wallet', href: '/paper-wallet', icon: FileText, color: '#64748B' },
      { id: 'hardware-wallet', label: 'Hardware Wallet', href: '/hardware-wallet', icon: HardDrive, color: '#64748B' },
      { id: 'enterprise', label: 'Enterprise', href: '/enterprise', icon: Landmark, color: '#64748B' },
      { id: 'token-launch', label: 'Token Launch', href: '/token-launch', icon: Rocket, color: '#64748B' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    color: '#94A3B8',
    children: [
      // T1-3: /settings is now the single config hub (Account | Vault | Security | Notifications)
      { id: 'settings',      label: 'Settings',     href: '/settings',        icon: Settings,  color: '#94A3B8' },
      { id: 'profile',       label: 'Profile',      href: '/profile',         icon: User,      color: '#94A3B8' },
      { id: 'security',      label: 'Security',     href: '/security-center', icon: ShieldCheck, color: '#94A3B8' },
      // T1-4: Theme merged — one entry for /theme (the canonical theme page)
      { id: 'theme',         label: 'Theme',        href: '/theme',           icon: Palette,   color: '#94A3B8' },
      { id: 'help',          label: 'Help & Docs',  href: '/docs',            icon: HelpCircle, color: '#94A3B8' },
      { id: 'legal',         label: 'Legal',        href: '/legal',           icon: Scale,     color: '#94A3B8' },
      { id: 'about',         label: 'About',        href: '/about',           icon: Info,      color: '#94A3B8' },
      { id: 'support',       label: 'Support',      href: '/support',         icon: LifeBuoy,  color: '#94A3B8' },
      // T1-4: Admin/Control Panel removed from public nav; they still exist at their routes
      //       but are not listed here so regular users don't see them.
    ],
  },
];

/**
 * Flatten all group children into a single ordered list. Useful for the
 * MoreSheet's search/filter (a user typing "vault" should match items
 * inside the Vault group, not just the group label).
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
