/**
 * MobileBottomNav - Fixed bottom navigation for mobile users
 * Shows quick access to key features on small screens
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Wallet, Send, Store, User } from 'lucide-react'
import { useAccount } from 'wagmi'

export function MobileBottomNav() {
  const pathname = usePathname()
  useAccount() // Keep for future conditional display
  
  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/vault', label: 'Vault', icon: Wallet },
    { href: '/pay', label: 'Send', icon: Send, highlight: true },
    { href: '/merchant', label: 'Merchant', icon: Store },
    { href: '/dashboard', label: 'Profile', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1D]/95 backdrop-blur-xl border-t border-[#3A3A3F] z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                item.highlight 
                  ? 'bg-gradient-to-r from-[#00F0FF] to-[#0080FF] -mt-4 shadow-lg shadow-[#00F0FF]/20'
                  : isActive 
                    ? 'text-[#00F0FF]' 
                    : 'text-[#A0A0A5]'
              }`}
            >
              <div className={`${item.highlight ? 'p-3 rounded-full' : ''}`}>
                <Icon 
                  className={`w-5 h-5 ${item.highlight ? 'text-[#1A1A1D]' : ''}`} 
                />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${
                item.highlight ? 'text-[#1A1A1D]' : ''
              }`}>
                {item.label}
              </span>
              {isActive && !item.highlight && (
                <div className="w-1 h-1 bg-[#00F0FF] rounded-full mt-1" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
