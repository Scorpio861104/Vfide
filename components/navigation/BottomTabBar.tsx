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
 * When wallet is NOT connected, the More slot is replaced with a
 * "Connect" button (using RainbowKit's ConnectButton.Custom) so
 * mobile users can connect without needing the desktop TopNav.
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
  Wallet,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
        className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom md:hidden"
        style={{
          background: 'linear-gradient(to top, rgba(6,6,10,0.97), rgba(8,8,14,0.92))',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.03), 0 -8px 30px rgba(0,0,0,0.3)',
        }}
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
                className={`relative flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all duration-200 ${
                  isActive ? 'text-cyan-400' : 'text-zinc-500 active:text-zinc-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setMoreOpen(false)}
              >
                {/* Active highlight pill */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0,240,255,0.08)' }}
                  />
                )}
                <Icon size={21} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className={`text-[10px] font-semibold relative z-10 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute bottom-1 h-0.5 w-4 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #00F0FF, #3B82F6)',
                      boxShadow: '0 0 6px rgba(0,240,255,0.5)',
                    }}
                  />
                )}
              </Link>
            );
          })}

          {/* 5th slot: "Connect" when not connected, "More" when connected */}
          {!isConnected ? (
            /* Connect Wallet — always visible on mobile so users never get stuck. */
            <ConnectButton.Custom>
              {({ openConnectModal, mounted }) => (
                <button
                  type="button"
                  onClick={openConnectModal}
                  disabled={!mounted}
                  aria-label="Connect wallet"
                  className="relative flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all duration-200 text-cyan-400 active:scale-95 disabled:opacity-50"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0,240,255,0.10)' }}
                  />
                  <div className="relative">
                    <Wallet size={21} strokeWidth={2.0} />
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 animate-pulse"
                      style={{ boxShadow: '0 0 0 2px rgba(6,6,10,0.97), 0 0 6px rgba(0,240,255,0.8)' }}
                    />
                  </div>
                  <span className="relative z-10 text-[10px] font-semibold text-cyan-400">
                    Connect
                  </span>
                  <div
                    aria-hidden="true"
                    className="absolute bottom-1 h-0.5 w-4 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #00F0FF, #3B82F6)',
                      boxShadow: '0 0 6px rgba(0,240,255,0.5)',
                    }}
                  />
                </button>
              )}
            </ConnectButton.Custom>
          ) : (
            /* More tab — opens the sheet instead of navigating. */
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-label="More destinations"
              className={`relative flex w-16 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 transition-all duration-200 ${
                activeTab === 'more' ? 'text-cyan-400' : 'text-zinc-500 active:text-zinc-300'
              }`}
            >
              {activeTab === 'more' && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(0,240,255,0.08)' }}
                />
              )}
              <div className="relative">
                <MoreHorizontal size={21} strokeWidth={activeTab === 'more' ? 2.2 : 1.5} />
                <div
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
                  style={{
                    background: 'rgb(52,211,153)',
                    boxShadow: '0 0 0 2px rgba(6,6,10,0.97), 0 0 5px rgba(52,211,153,0.5)',
                  }}
                />
              </div>
              <span
                className={`relative z-10 text-[10px] font-semibold ${
                  activeTab === 'more' ? 'text-cyan-400' : 'text-zinc-500'
                }`}
              >
                More
              </span>
              {activeTab === 'more' && (
                <div
                  aria-hidden="true"
                  className="absolute bottom-1 h-0.5 w-4 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #00F0FF, #3B82F6)',
                    boxShadow: '0 0 6px rgba(0,240,255,0.5)',
                  }}
                />
              )}
            </button>
          )}
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} variant="bottom" />
    </>
  );
}
