'use client';

/**
 * TopNav (desktop).
 *
 * Mirrors the BottomTabBar's 4-tabs-plus-More pattern: Home / Shop /
 * Pay / Social are direct links; the fifth slot is a "More" button
 * that opens the MoreSheet (a popover on desktop, anchored to the
 * top-right of the nav).
 *
 * The previous "Me" tab pointed at /me, which is a real hub page,
 * but tucked 18 destinations behind a tab labeled like it just opened
 * settings. The "More" pattern is more honest about what the slot
 * does: it opens a drawer, the drawer shows everything, and the user
 * can search inside it. /me still exists and the MoreSheet has an
 * "Open full hub" link to it for users who want the full-page view.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  Home,
  Store,
  ArrowLeftRight,
  MessageCircle,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { NotificationBell } from '@/lib/notifications';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MoreSheet } from './MoreSheet';
import { ProofScoreCrystal } from '@/components/identity/ProofScoreCrystal';

const MAIN_SECTIONS = [
  { id: 'home',   href: '/dashboard',  icon: Home,           label: 'Home'   },
  { id: 'shop',   href: '/merchant',   icon: Store,          label: 'Shop'   },
  { id: 'pay',    href: '/pay',        icon: ArrowLeftRight, label: 'Pay'    },
  { id: 'social', href: '/social-hub', icon: MessageCircle,  label: 'Social' },
];

const SECTION_MATCH: Record<string, string[]> = {
  home:   ['/dashboard', '/'],
  shop:   ['/merchant', '/pos', '/marketplace', '/merchants', '/store', '/product', '/checkout'],
  pay:    ['/pay', '/remittance', '/lending', '/crypto', '/escrow', '/flashloans', '/buy'],
  social: ['/feed', '/stories', '/social', '/endorsements', '/headhunter', '/social-hub', '/social-payments', '/social-messaging'],
};

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

export function TopNav() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeMainSection = Object.entries(SECTION_MATCH).find(([, paths]) =>
    paths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  )?.[0];

  const onMoreRoute =
    !activeMainSection &&
    MORE_MATCH.some((m) => pathname === m || pathname.startsWith(m + '/'));

  const activeSection = moreOpen
    ? 'more'
    : activeMainSection ?? (onMoreRoute ? 'more' : 'home');

  return (
    <>
      <nav
        className="fixed left-0 right-0 top-0 z-50 hidden h-14 items-center border-b border-white/10 bg-zinc-950/70 px-6 backdrop-blur-xl md:flex"
        style={{ backgroundImage: 'linear-gradient(to bottom, rgba(8,145,178,0.04), transparent)' }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
            V
          </div>
          <span className="text-sm font-bold tracking-tight text-white">VFIDE</span>
        </Link>

        {/* Section tabs: 4 direct links + 1 More button. */}
        <div className="flex items-center gap-1">
          {MAIN_SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={s.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {s.label}
              </Link>
            );
          })}

          {/* More — opens the sheet popover. */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeSection === 'more'
                ? 'bg-cyan-500/15 text-cyan-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MoreHorizontal size={16} strokeWidth={activeSection === 'more' ? 2 : 1.5} />
            More
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              // Trigger command palette (Cmd+K).
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
          >
            <Search size={14} />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 lg:inline">⌘K</kbd>
          </button>

          <NotificationBell />

          {isConnected && (
            <Link
              href="/proofscore"
              className="flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 hover:bg-white/10 transition-colors"
              title="ProofScore"
            >
              <ProofScoreCrystal size={28} showScore />
            </Link>
          )}

          <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} variant="top-right" />
    </>
  );
}
