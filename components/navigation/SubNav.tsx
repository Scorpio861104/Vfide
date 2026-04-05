'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRef, useEffect } from 'react';

interface SubNavItem {
  href: string;
  label: string;
  badge?: number;
}

// Route-to-sub-nav mapping
// Only shows when the user is in a section with sub-pages
const SUB_NAVS: Record<string, { title: string; items: SubNavItem[] }> = {
  '/merchant': {
    title: 'Merchant',
    items: [
      { href: '/merchant', label: 'Overview' },
      { href: '/pos', label: 'POS' },
      { href: '/merchant/analytics', label: 'Analytics' },
      { href: '/merchant/staff', label: 'Staff' },
      { href: '/merchant/customers', label: 'Customers' },
      { href: '/merchant/coupons', label: 'Coupons' },
      { href: '/merchant/loyalty', label: 'Loyalty' },
      { href: '/merchant/expenses', label: 'Expenses' },
      { href: '/merchant/suppliers', label: 'Suppliers' },
      { href: '/merchant/gift-cards', label: 'Gift Cards' },
      { href: '/merchant/returns', label: 'Returns' },
      { href: '/merchant/installments', label: 'Installments' },
      { href: '/merchant/locations', label: 'Locations' },
      { href: '/merchant/wholesale', label: 'Wholesale' },
      { href: '/merchant/setup', label: 'Setup' },
    ],
  },
  '/pay': {
    title: 'Pay',
    items: [
      { href: '/pay', label: 'Send' },
      { href: '/remittance', label: 'Remittance' },
      { href: '/lending', label: 'Lending' },
      { href: '/escrow', label: 'Escrow' },
      { href: '/crypto', label: 'Wallet' },
      { href: '/buy', label: 'Buy' },
    ],
  },
  '/feed': {
    title: 'Social',
    items: [
      { href: '/feed', label: 'Feed' },
      { href: '/stories', label: 'Stories' },
      { href: '/social-messaging', label: 'Messages' },
      { href: '/endorsements', label: 'Endorsements' },
      { href: '/social-payments', label: 'Social Pay' },
      { href: '/headhunter', label: 'Headhunter' },
    ],
  },
  '/profile': {
    title: 'Me',
    items: [
      { href: '/profile', label: 'Profile' },
      { href: '/vault', label: 'Vault' },
      { href: '/proofscore', label: 'ProofScore' },
      { href: '/badges', label: 'Badges' },
      { href: '/guardians', label: 'Guardians' },
      { href: '/rewards', label: 'Rewards' },
      { href: '/settings', label: 'Settings' },
    ],
  },
  '/governance': {
    title: 'Community',
    items: [
      { href: '/governance', label: 'Governance' },
      { href: '/elections', label: 'Elections' },
      { href: '/council', label: 'Council' },
      { href: '/dao-hub', label: 'DAO Hub' },
      { href: '/disputes', label: 'Disputes' },
      { href: '/sanctum', label: 'Sanctum' },
      { href: '/leaderboard', label: 'Leaderboard' },
    ],
  },
};

// Map any path to its parent sub-nav
function findSubNav(pathname: string): { title: string; items: SubNavItem[] } | null {
  // Direct match
  if (SUB_NAVS[pathname]) return SUB_NAVS[pathname];

  // Find which sub-nav contains this path
  for (const [key, nav] of Object.entries(SUB_NAVS)) {
    if (nav.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
      return nav;
    }
  }

  // Special: social paths under /social-* or /stories
  for (const socialPath of ['/stories', '/social-messaging', '/endorsements', '/social-payments', '/headhunter', '/social-hub']) {
    if (pathname.startsWith(socialPath)) return SUB_NAVS['/feed']!;
  }

  // Special: merchant sub-paths
  if (pathname.startsWith('/merchant/') || pathname === '/pos') return SUB_NAVS['/merchant']!;

  // Special: me sub-paths
  for (const mePath of ['/vault', '/badges', '/achievements', '/guardians', '/proofscore', '/settings', '/rewards', '/security-center', '/notifications']) {
    if (pathname.startsWith(mePath)) return SUB_NAVS['/profile']!;
  }

  // Special: governance/community sub-paths
  for (const govPath of ['/elections', '/council', '/dao-hub', '/disputes', '/sanctum', '/appeals', '/leaderboard', '/quests']) {
    if (pathname.startsWith(govPath)) return SUB_NAVS['/governance']!;
  }

  return null;
}

export function SubNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const subNav = findSubNav(pathname);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [pathname]);

  if (!subNav) return null;

  return (
    <div className="sticky top-0 md:top-14 z-40 bg-zinc-950/90 backdrop-blur-lg border-b border-white/5">
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-0.5 px-4 py-1.5 min-w-max">
          {subNav.items.map(item => {
            const isActive = pathname === item.href || (item.href !== '/merchant' && item.href !== '/pay' && item.href !== '/feed' && item.href !== '/profile' && item.href !== '/governance' && pathname.startsWith(item.href + '/'));
            const isExactActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} data-active={isActive || isExactActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive || isExactActive
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full font-bold">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
