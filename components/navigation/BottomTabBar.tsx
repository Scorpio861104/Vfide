'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, CreditCard, Shield, Store, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MoreSheet } from './MoreSheet';

// NAV-BTM-1: "More" does NOT navigate — it opens the MoreSheet drawer.
// Navigating to /more would produce a 404; the sheet is the correct
// surface for the "everything else" destinations on mobile.
const NAV_TABS = [
  { label: 'Home',      href: '/dashboard',   icon: Home    },
  { label: 'Pay',       href: '/pay',          icon: CreditCard },
  { label: 'Trust',     href: '/proofscore',   icon: Shield  },
  { label: 'Merchants', href: '/merchants',    icon: Store   },
] as const;

// Routes that belong to the "More" drawer group so the More tab
// shows as active when the user is on one of these pages.
const MORE_ROUTES = [
  '/vault', '/guardians', '/time-locks', '/vesting',
  '/merchant', '/pos', '/escrow', '/flashloans', '/payroll',
  '/streaming', '/cross-chain', '/subscriptions', '/agent',
  '/social-hub', '/stories', '/feed',
  '/governance', '/dao-hub', '/council', '/elections', '/disputes',
  '/appeals', '/fraud', '/treasury', '/sanctum',
  '/quests', '/achievements', '/leaderboard', '/headhunter',
  '/endorsements', '/badges', '/benefits', '/rewards', '/invite',
  '/insights', '/taxes', '/budgets', '/performance', '/reporting', '/price-alerts',
  '/explorer', '/paper-wallet', '/hardware-wallet', '/enterprise', '/token-launch',
  '/settings', '/profile', '/security-center', '/theme', '/docs', '/legal',
  '/about', '/support', '/me', '/notifications',
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeTab = NAV_TABS.find(
    (t) => pathname === t.href || pathname.startsWith(t.href + '/'),
  )?.href ?? null;

  const onMoreRoute =
    !activeTab &&
    MORE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 pb-safe md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.href;

            return (
              <button
                key={tab.href}
                onClick={() => { setMoreOpen(false); router.push(tab.href); }}
                aria-label={tab.label}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0',
                  isActive
                    ? 'text-blue-400'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"
                    />
                  )}
                </div>
                <span className={cn('text-xs truncate', isActive ? 'font-semibold' : 'font-normal')}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More — opens MoreSheet, does NOT navigate */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0',
              moreOpen || onMoreRoute
                ? 'text-blue-400'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <div className="relative">
              <MoreHorizontal size={22} strokeWidth={moreOpen || onMoreRoute ? 2.5 : 1.8} />
              {(moreOpen || onMoreRoute) && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"
                />
              )}
            </div>
            <span className={cn('text-xs truncate', moreOpen || onMoreRoute ? 'font-semibold' : 'font-normal')}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom sheet — hidden on desktop (TopNav handles More there) */}
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        variant="bottom"
      />
    </>
  );
}
