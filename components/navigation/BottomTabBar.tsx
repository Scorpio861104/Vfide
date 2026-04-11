'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Store, ArrowLeftRight, MessageCircle, User } from 'lucide-react';
import { useAccount } from 'wagmi';

const tabs = [
  { id: 'home', href: '/dashboard', icon: Home, label: 'Home', match: ['/dashboard', '/'] },
  { id: 'shop', href: '/merchant', icon: Store, label: 'Shop', match: ['/merchant', '/pos', '/marketplace', '/merchants', '/store', '/product', '/checkout'] },
  { id: 'pay', href: '/pay', icon: ArrowLeftRight, label: 'Pay', match: ['/pay', '/remittance', '/lending', '/crypto', '/escrow', '/flashloans', '/buy', '/streaming', '/subscriptions'] },
  { id: 'social', href: '/feed', icon: MessageCircle, label: 'Social', match: ['/feed', '/stories', '/social', '/endorsements', '/headhunter', '/social-hub', '/social-payments', '/social-messaging'] },
  { id: 'me', href: '/profile', icon: User, label: 'Me', match: ['/profile', '/vault', '/settings', '/badges', '/achievements', '/guardians', '/governance', '/dao-hub', '/council', '/elections', '/disputes', '/sanctum', '/rewards', '/leaderboard', '/quests', '/proofscore', '/security-center', '/notifications'] },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();

  const activeTab = tabs.find(t =>
    t.match.some(m => pathname === m || pathname.startsWith(m + '/'))
  )?.id || 'home';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-zinc-950/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom"
      role="navigation" aria-label="Main navigation">
      <div className="flex items-center justify-around px-2 h-16">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link key={tab.id} href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-cyan-400'
                  : 'text-gray-500 active:text-gray-300'
              }`}
              aria-current={isActive ? 'page' : undefined}>
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                {tab.id === 'me' && isConnected && (
                  <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 shadow-[0_0_0_2px_rgba(9,9,11,0.95)]" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-5 h-0.5 rounded-full bg-cyan-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
