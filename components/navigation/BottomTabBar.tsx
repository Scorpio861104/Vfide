'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, CreditCard, Shield, Store, MoreHorizontal } from 'lucide-react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MoreSheet } from './MoreSheet';

type TabAction =
  | { kind: 'navigate'; href: string }
  | { kind: 'open-more' };

type Tab = {
  label: string;
  icon: typeof Home;
  /** Used as the React key and as the active-state path match (for navigate tabs). */
  matchPath: string;
  action: TabAction;
};

const MAIN_TABS: readonly Tab[] = [
  { label: 'Home',      icon: Home,            matchPath: '/dashboard',  action: { kind: 'navigate', href: '/dashboard'  } },
  { label: 'Pay',       icon: CreditCard,      matchPath: '/pay',        action: { kind: 'navigate', href: '/pay'        } },
  { label: 'Trust',     icon: Shield,          matchPath: '/proofscore', action: { kind: 'navigate', href: '/proofscore' } },
  { label: 'Merchants', icon: Store,           matchPath: '/merchants',  action: { kind: 'navigate', href: '/merchants'  } },
  // The "More" tab opens the MoreSheet drawer rather than navigating to a
  // /more route (no such route exists — the drawer is the canonical
  // "everything else" surface, mirroring TopNav on desktop).
  { label: 'More',      icon: MoreHorizontal,  matchPath: '__more__',    action: { kind: 'open-more' } },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/50 pb-safe">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.action.kind === 'open-more'
                ? moreOpen
                : pathname === tab.action.href || pathname.startsWith(tab.action.href + '/');

            return (
              <button
                key={tab.matchPath}
                onClick={() => {
                  if (tab.action.kind === 'navigate') {
                    router.push(tab.action.href);
                  } else {
                    setMoreOpen((v) => !v);
                  }
                }}
                aria-label={tab.label}
                aria-pressed={tab.action.kind === 'open-more' ? moreOpen : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0',
                  isActive
                    ? 'text-accent'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <m.div
                      layoutId="tab-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                    />
                  )}
                </div>
                <span className={cn('text-xs truncate', isActive ? 'font-semibold' : 'font-normal')}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} variant="bottom" />
    </>
  );
}
