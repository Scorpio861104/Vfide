'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Store, ArrowLeftRight, MessageCircle, User, Search } from 'lucide-react';
import { NotificationBell } from '@/lib/notifications';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const sections = [
  { id: 'home', href: '/dashboard', icon: Home, label: 'Home' },
  { id: 'shop', href: '/merchant', icon: Store, label: 'Shop' },
  { id: 'pay', href: '/pay', icon: ArrowLeftRight, label: 'Pay' },
  { id: 'social', href: '/feed', icon: MessageCircle, label: 'Social' },
  { id: 'me', href: '/profile', icon: User, label: 'Me' },
];

const sectionMatch: Record<string, string[]> = {
  home: ['/dashboard', '/'],
  shop: ['/merchant', '/pos', '/marketplace', '/merchants', '/store', '/product', '/checkout'],
  pay: ['/pay', '/remittance', '/lending', '/crypto', '/escrow', '/flashloans', '/buy'],
  social: ['/feed', '/stories', '/social', '/endorsements', '/headhunter', '/social-hub', '/social-payments', '/social-messaging'],
  me: ['/profile', '/vault', '/settings', '/badges', '/achievements', '/guardians', '/governance', '/dao-hub', '/council', '/elections', '/disputes', '/sanctum', '/rewards', '/leaderboard', '/quests', '/proofscore', '/security-center', '/notifications'],
};

export function TopNav() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const activeSection = Object.entries(sectionMatch).find(([_, paths]) =>
    paths.some(p => pathname === p || pathname.startsWith(p + '/'))
  )?.[0] || 'home';

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5 h-14 items-center px-6"
      role="navigation" aria-label="Main navigation">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-8">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">V</div>
        <span className="text-white font-bold text-sm tracking-tight">VFIDE</span>
      </Link>

      {/* Section tabs */}
      <div className="flex items-center gap-1">
        {sections.map(s => {
          const isActive = activeSection === s.id;
          const Icon = s.icon;
          return (
            <Link key={s.id} href={s.href}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Search trigger */}
        <button onClick={() => {
          // Trigger command palette (Cmd+K)
          const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
          document.dispatchEvent(event);
        }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs">
          <Search size={14} />
          <span className="hidden lg:inline">Search</span>
          <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-white/10 text-gray-500 text-[10px] font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Wallet */}
        <ConnectButton 
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </nav>
  );
}
