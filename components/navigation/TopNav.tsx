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
// FIX UX-1: Use VfideConnectButton instead of raw RainbowKit ConnectButton.
// The raw ConnectButton renders in RainbowKit's default colorful palette which
// clashes with VFIDE's dark zinc + cyan design system.
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { MoreSheet } from './MoreSheet';
import { ProofScoreCrystal } from '@/components/identity/ProofScoreCrystal';

// T2-2: "Shop" renamed → "Marketplace" and points to /marketplace (buyer view).
// Merchant sellers reach their portal via More → Merchant group.
const MAIN_SECTIONS = [
  { id: 'home',        href: '/dashboard',   icon: Home,           label: 'Home'        },
  { id: 'marketplace', href: '/marketplace', icon: Store,          label: 'Marketplace' },
  { id: 'pay',         href: '/pay',         icon: ArrowLeftRight, label: 'Pay'         },
  { id: 'social',      href: '/social-hub',  icon: MessageCircle,  label: 'Social'      },
];

const SECTION_MATCH: Record<string, string[]> = {
  home:        ['/dashboard', '/'],
  marketplace: ['/marketplace', '/merchants', '/store', '/product', '/checkout'],
  pay:         ['/pay', '/remittance', '/lending', '/crypto', '/escrow', '/flashloans', '/buy'],
  social:      ['/feed', '/stories', '/social', '/endorsements', '/headhunter', '/social-hub', '/social-payments', '/social-messaging'],
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
        className="topnav-premium fixed left-0 right-0 top-0 z-50 hidden h-14 items-center px-5 md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo — gradient wordmark */}
        <Link href="/" className="mr-8 flex items-center gap-2.5 group shrink-0">
          <div
            className="logo-icon-ring flex h-8 w-8 items-center justify-center text-sm font-black text-white"
            style={{ fontSize: '0.875rem', letterSpacing: '-0.02em' }}
          >
            V
          </div>
          <span className="logo-wordmark text-[0.9375rem] hidden sm:block">VFIDE</span>
        </Link>

        {/* Separator */}
        <div className="mr-4 hidden sm:block h-5 w-px bg-white/10" aria-hidden="true" />

        {/* Section tabs: 4 direct links + 1 More button. */}
        <div className="flex items-center gap-0.5">
          {MAIN_SECTIONS.map((s) => {
            const isActive = activeSection === s.id;
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={s.href}
                onClick={() => setMoreOpen(false)}
                className={`topnav-active-pill relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/12 text-cyan-400'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.6} />
                <span>{s.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg,#00F0FF,#3B82F6)',
                      boxShadow: '0 0 8px rgba(0,240,255,0.6)',
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* More — opens the sheet popover. */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeSection === 'more'
                ? 'bg-cyan-500/12 text-cyan-400'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
            }`}
          >
            <MoreHorizontal size={15} strokeWidth={activeSection === 'more' ? 2.2 : 1.6} />
            More
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              document.dispatchEvent(event);
            }}
            className="hidden lg:flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/8 transition-all"
          >
            <Search size={13} />
            <span>Search</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">⌘K</kbd>
          </button>

          <NotificationBell />

          {isConnected && (
            <Link
              href="/proofscore"
              className="hidden lg:flex items-center rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 hover:bg-white/8 hover:border-cyan-500/20 transition-all"
              title="ProofScore"
            >
              <ProofScoreCrystal size={28} showScore />
            </Link>
          )}

          <VfideConnectButton size="sm" />
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} variant="top-right" />
    </>
  );
}
