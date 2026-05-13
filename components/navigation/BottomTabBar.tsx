'use client';

/**
 * BottomTabBar (mobile).
 *
 * Five slots:
 *   - 4 most-used destinations: Home, Shop, Pay, Social. Each is a
 *     direct Link — tap navigates immediately.
 *   - 1 "More" slot: opens the MoreSheet (a bottom sheet that lists
 *     everything else, organized by group, with search). The More
 *     slot is a button, not a Link — tapping does not navigate.
 *
 * Why "More" instead of "Me": the previous design used "Me" pointing
 * at /profile, which buried 17 other destinations behind a tab that
 * looked like it just opened settings. The user's mental model for a
 * mobile tab bar is "the four things I do most, plus an app-drawer
 * for everything else." This matches that pattern — same convention
 * iOS Mail, App Store, and most modern mobile UIs use when there are
 * more than 5 sections.
 *
 * The full /me hub still exists as a page; the MoreSheet has an
 * "Open full hub" link in its footer for users who want the rich
 * full-screen view.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Store,
  ArrowLeftRight,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { MoreSheet } from './MoreSheet';

const MAIN_TABS = [
  { id: 'home',   href: '/dashboard',  icon: Home,           label: 'Home',   match: ['/dashboard', '/'] },
  { id: 'shop',   href: '/merchant',   icon: Store,          label: 'Shop',   match: ['/merchant', '/pos', '/marketplace', '/merchants', '/store', '/product', '/checkout'] },
  { id: 'pay',    href: '/pay',        icon: ArrowLeftRight, label: 'Pay',    match: ['/pay', '/remittance', '/lending', '/crypto', '/escrow', '/flashloans', '/buy', '/streaming', '/subscriptions'] },
  { id: 'social', href: '/social-hub', icon: MessageCircle,  label: 'Social', match: ['/feed', '/stories', '/social', '/endorsements', '/headhunter', '/social-hub', '/social-payments', '/social-messaging'] },
];

// All the routes that, when active, should also visually highlight the
// More tab — since the user got there from More, that tab should still
// look "current".
const MORE_MATCH = [
  '/me', '/profile', '/vault', '/settings', '/badges', '/achievements',
  '/guardians', '/governance', '/dao-hub', '/council', '/elections',
  '/disputes', '/sanctum', '/rewards', '/leaderboard', '/quests',
  '/proofscore', '/security-center', '/notifications', '/treasury',
  '/multisig', '/time-locks', '/vesting', '/appeals', '/insights',
  '/taxes', '/budgets', '/performance', '/reporting', '/price-alerts',
  '/explorer', '/paper-wallet', '/hardware-wallet', '/enterprise',
  '/token-launch', '/payroll', '/cross-chain', '/stealth', '/benefits',
  '/invite', '/docs', '/legal', '/about', '/support', '/theme',
  '/theme-manager', '/theme-showcase', '/admin', '/control-panel',
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeMainTab = MAIN_TABS.find((t) =>
    t.match.some((m) => pathname === m || pathname.startsWith(m + '/'))
  )?.id;

  const onMoreRoute =
    !activeMainTab &&
    MORE_MATCH.some((m) => pathname === m || pathname.startsWith(m + '/'));

  const activeTab = moreOpen ? 'more' : activeMainTab ?? (onMoreRoute ? 'more' : 'home');

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl safe-area-bottom md:hidden"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around px-2 h-16">
          {MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all ${
                  isActive ? 'text-cyan-400' : 'text-gray-500 active:text-gray-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMoreOpen(false)}
              >
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 h-0.5 w-5 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}

          {/* More tab — opens the sheet instead of navigating. */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label="More destinations"
            className={`relative flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all ${
              activeTab === 'more' ? 'text-cyan-400' : 'text-gray-500 active:text-gray-300'
            }`}
          >
            <div className="relative">
              <MoreHorizontal size={22} strokeWidth={activeTab === 'more' ? 2.2 : 1.5} />
              {/* Connection indicator dot — sat on the old "Me" icon to
                  hint "you're signed in"; keep it on More so the cue
                  doesn't disappear when we swapped tabs. */}
              {isConnected && (
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_0_2px_rgba(9,9,11,0.95)]" />
              )}
            </div>
            <span
              className={`text-[10px] font-medium ${
                activeTab === 'more' ? 'text-cyan-400' : 'text-gray-500'
              }`}
            >
              More
            </span>
            {activeTab === 'more' && (
              <div className="absolute bottom-1 h-0.5 w-5 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} variant="bottom" />
    </>
  );
}
