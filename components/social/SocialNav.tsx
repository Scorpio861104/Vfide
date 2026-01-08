import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function SocialNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: '/social', label: 'Hub', icon: '🏠' },
    { href: '/social/messages', label: 'Messages', icon: '💬' },
    { href: '/social/stories', label: 'Stories', icon: '📱' },
    { href: '/social/communities', label: 'Communities', icon: '🏛️' },
    { href: '/social/calls', label: 'Calls', icon: '📞' },
    { href: '/social/discover', label: 'Discover', icon: '🔍' },
  ];

  const isActive = (href: string) => {
    if (href === '/social') {
      return pathname === '/social';
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/social" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="text-2xl">⚡</span>
            <span className="bg-gradient-to-r from-[#00F0FF] to-[#FF6B9D] text-transparent bg-clip-text">
              VFIDE Social
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isActive(item.href)
                    ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white">
            <span className="text-2xl">☰</span>
          </button>
        </div>

        {/* Mobile Navigation (Hidden by default) */}
        <div className="md:hidden pb-4">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  isActive(item.href)
                    ? 'bg-[#00F0FF]/10 text-[#00F0FF]'
                    : 'text-gray-400 hover:text-white bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
