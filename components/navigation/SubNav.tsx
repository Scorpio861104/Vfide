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
      { href: '/merchant/inventory', label: 'Inventory' },
      { href: '/merchant/invoices', label: 'Invoices' },
      { href: '/merchant/payment-links', label: 'Payment Links' },
      { href: '/merchant/bookings', label: 'Bookings' },
      { href: '/merchant/subscriptions', label: 'Subscriptions' },
      { href: '/merchant/analytics', label: 'Analytics' },
      { href: '/merchant/customers', label: 'Customers' },
      { href: '/merchant/loyalty', label: 'Loyalty' },
      { href: '/merchant/coupons', label: 'Coupons' },
      { href: '/merchant/gift-cards', label: 'Gift Cards' },
      { href: '/merchant/returns', label: 'Returns' },
      { href: '/merchant/expenses', label: 'Expenses' },
      { href: '/merchant/tax', label: 'Tax' },
      { href: '/merchant/tips', label: 'Tips' },
      { href: '/merchant/installments', label: 'Installments' },
      { href: '/merchant/staff', label: 'Staff' },
      { href: '/merchant/locations', label: 'Locations' },
      { href: '/merchant/suppliers', label: 'Suppliers' },
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
      // NAV-3: social-messaging / social-payments now live as tabs inside /social-hub
      { href: '/social-hub?tab=messages', label: 'Messages' },
      { href: '/endorsements', label: 'Endorsements' },
      { href: '/social-hub?tab=pay', label: 'Social Pay' },
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
      // NAV-3: elections, council, dao-hub, disputes now live as tabs inside /governance
      { href: '/governance?tab=elections', label: 'Elections' },
      { href: '/governance?tab=council', label: 'Council' },
      { href: '/governance?tab=dao', label: 'DAO Hub' },
      { href: '/governance?tab=disputes', label: 'Disputes' },
      { href: '/fraud', label: 'Fraud Reporting' },
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
  // NAV-3: /social-messaging and /social-payments now redirect to /social-hub — keep matching so SubNav still shows
  for (const socialPath of ['/stories', '/social-messaging', '/endorsements', '/social-payments', '/headhunter', '/social-hub']) {
    if (pathname.startsWith(socialPath)) return SUB_NAVS['/feed']!;
  }

  // Special: merchant sub-paths
  if (pathname.startsWith('/merchant/') || pathname === '/pos') return SUB_NAVS['/merchant']!;

  // Special: me sub-paths
  for (const mePath of ['/vault', '/badges', '/achievements', '/guardians', '/proofscore', '/settings', '/rewards', '/security-center', '/notifications', '/setup']) {
    if (pathname.startsWith(mePath)) return SUB_NAVS['/profile']!;
  }

  // Special: governance/community sub-paths
  // NAV-3: /elections, /council, /dao-hub, /disputes now redirect to /governance — keep matching so SubNav still shows
  for (const govPath of ['/elections', '/council', '/dao-hub', '/disputes', '/treasury', '/sanctum', '/appeals', '/leaderboard', '/quests']) {
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
