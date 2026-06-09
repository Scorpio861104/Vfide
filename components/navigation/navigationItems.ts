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
  Info,
  LifeBuoy,
  HardDrive,
  Tag,
  // CODE-3: Heart added for Sanctum (charity/community giving — semantic match over Cpu)
  Heart,
  // CODE-4: Calendar added for Payroll (scheduled payment, not a banknote)
  Calendar,
  // NAV: icons for product pages that were previously reachable only by URL
  Users,
  Plane,
  Split,
  QrCode,
  FlaskConical,
  GraduationCap,
  Map,
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
  /** Navigation tier: 1 primary, 2 in-hub, 3 deep-link, internal off-nav/permissioned. */
  tier?: 1 | 2 | 3 | 'internal';
}

/**
 * INSTITUTION NAVIGATION (Constitutional restructure).
 * Reorganized from feature-groups (Vault/Merchant/Social/Governance/Rewards/
 * Insights/Tools/Account) into the five institutions of Volume I §5.1 /
 * Volume III: Citizens, Merchants, Builders, Stewards, Academy. Curated to the
 * key destinations per the "reduce cognitive load" directive — the long tail
 * (operational merchant tools, payment types, insights, recognition, etc.)
 * remains reachable via institution hubs and direct routes, not the top nav.
 * Internal/dev/demo surfaces (theme*, demo*, control-panel, admin, api-coverage,
 * token-launch) are intentionally NOT top-level destinations. comingSoon flags
 * mark future-tier routes (developer/SDK, council, elections) per the Veritas Law.
 */
export const navigationItems: NavItem[] = [
  { id: 'home',      label: 'Home',      href: '/',          icon: Home,            color: '#F8F8FC', tier: 1 },
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: '#00F0FF', tier: 1 },

  // Citizens - personal ownership and protection
  {
    id: 'citizens', label: 'Citizens', icon: Shield, color: '#8B5CF6',
    children: [
      { id: 'vault',         label: 'My Vault',     href: '/vault',         icon: Shield,      color: '#8B5CF6', dataOnboarding: 'nav-vault' },
      { id: 'proofscore',    label: 'ProofScore',   href: '/proofscore',    icon: TrendingUp,  color: '#8B5CF6', tier: 1 },
      { id: 'continuity',    label: 'Continuity',   href: '/continuity',    icon: Heart,       color: '#8B5CF6', tier: 1 },
      { id: 'guardians',     label: 'Guardians',    href: '/guardians',     icon: ShieldCheck, color: '#8B5CF6', tier: 1 },
      { id: 'recovery',      label: 'Recovery',     href: '/vault/recover', icon: KeyRound,    color: '#8B5CF6', tier: 1 },
      { id: 'inheritance',   label: 'Inheritance',  href: '/inheritance',   icon: Users,       color: '#8B5CF6', tier: 1 },
      { id: 'pay',           label: 'Pay',          href: '/pay',           icon: Send,        color: '#8B5CF6', tier: 1 },
      { id: 'wallet',        label: 'Wallet',       href: '/wallet',        icon: Wallet,      color: '#8B5CF6', tier: 1 },
      { id: 'endorsements',  label: 'Endorsements', href: '/endorsements',  icon: Medal,       color: '#8B5CF6', tier: 1 },
    ],
  },

  // Merchants - commerce and business participation
  {
    id: 'merchants', label: 'Merchants', icon: Store, color: '#10B981',
    children: [
      { id: 'merchant-hub',  label: 'Merchant Hub',  href: '/merchant',               icon: Store,      color: '#10B981', dataOnboarding: 'nav-merchant', tier: 1 },
      { id: 'pos',           label: 'POS Terminal',  href: '/pos',                    icon: CreditCard, color: '#10B981', tier: 1 },
      { id: 'payment-links', label: 'Payment Links', href: '/merchant/payment-links', icon: QrCode,     color: '#10B981', tier: 1 },
      { id: 'invoices',      label: 'Invoices',      href: '/merchant/invoices',      icon: FileText,   color: '#10B981', tier: 1 },
      { id: 'inventory',     label: 'Inventory',     href: '/merchant/inventory',     icon: Tag,        color: '#10B981', tier: 1 },
      { id: 'customers',     label: 'Customers',     href: '/merchant/customers',     icon: User,       color: '#10B981', tier: 1 },
      { id: 'payouts',       label: 'Payouts',       href: '/merchant/payouts',       icon: Banknote,   color: '#10B981', tier: 1 },
      { id: 'marketplace',   label: 'Marketplace',   href: '/marketplace',            icon: Globe,      color: '#10B981', tier: 1 },
    ],
  },

  // Builders - infrastructure creation
  {
    id: 'builders', label: 'Builders', icon: Code, color: '#64748B',
    children: [
      { id: 'developer', label: 'Developer', href: '/developer', icon: Code,         color: '#64748B', comingSoon: true, tier: 1 },
      { id: 'docs',      label: 'Docs',      href: '/docs',      icon: FileText,     color: '#64748B', tier: 1 },
      { id: 'explorer',  label: 'Explorer',  href: '/explorer',  icon: Compass,      color: '#64748B', tier: 1 },
      { id: 'testnet',   label: 'Testnet',   href: '/testnet',   icon: FlaskConical, color: '#64748B', tier: 1 },
    ],
  },

  // Stewards - institutional responsibility
  {
    id: 'stewards', label: 'Stewards', icon: Vote, color: '#6366F1',
    children: [
      { id: 'governance', label: 'Governance',      href: '/governance', icon: Vote,          color: '#6366F1', badge: 'DAO', dataOnboarding: 'nav-governance', tier: 1 },
      { id: 'treasury',   label: 'Treasury',        href: '/treasury',   icon: Landmark,      color: '#6366F1', tier: 1 },
      { id: 'appeals',    label: 'Appeals',         href: '/appeals',    icon: AlertTriangle, color: '#6366F1', tier: 1 },
      { id: 'fraud',      label: 'Fraud Reporting', href: '/fraud',      icon: ShieldCheck,   color: '#6366F1', tier: 1 },
      { id: 'sanctum',    label: 'Sanctum',         href: '/sanctum',    icon: Heart,         color: '#6366F1', tier: 1 },
      { id: 'council',    label: 'Council',         href: '/council',    icon: Crown,         color: '#6366F1', comingSoon: true, tier: 1 },
      { id: 'elections',  label: 'Elections',       href: '/elections',  icon: Vote,          color: '#6366F1', comingSoon: true, tier: 1 },
    ],
  },

  // Academy - capability development
  {
    id: 'academy', label: 'Academy', icon: GraduationCap, color: '#F59E0B',
    children: [
      { id: 'learn',       label: 'Learn',              href: '/seer-academy', icon: GraduationCap, color: '#F59E0B', tier: 1 },
      { id: 'get-started', label: 'Get Started',        href: '/onboarding',   icon: Map,           color: '#F59E0B', tier: 1 },
      { id: 'seer',        label: 'Seer - Trust Guide', href: '/seer-service', icon: Eye,           color: '#F59E0B', tier: 1 },
    ],
  },
];

/**
 * Utility destinations are account/support affordances that should stay
 * discoverable but not be framed as a core institution.
 */
export const utilityNavigationItems: NavItem[] = [
  { id: 'notifications', label: 'Notifications', href: '/notifications', icon: Bell,      color: '#94A3B8', tier: 1 },
  { id: 'settings',      label: 'Settings',      href: '/settings',      icon: Settings,  color: '#94A3B8', tier: 1 },
  { id: 'profile',       label: 'Profile',       href: '/me',            icon: User,      color: '#94A3B8', tier: 1 },
  { id: 'support',       label: 'Help & Support',href: '/support',       icon: LifeBuoy,  color: '#94A3B8', tier: 1 },
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
