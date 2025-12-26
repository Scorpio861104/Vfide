/**
 * MobileBottomNav - Fixed bottom navigation for mobile users
 * Shows on screens smaller than md (768px)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Vault, Store, Vote, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vault', label: 'Vault', icon: Vault },
  { href: '/merchant', label: 'Merchant', icon: Store },
  { href: '/governance', label: 'Gov', icon: Vote },
]

const moreItems = [
  { href: '/token-launch', label: 'Token Launch' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/rewards', label: 'Rewards' },
  { href: '/escrow', label: 'Escrow' },
  { href: '/sanctum', label: 'Sanctum' },
  { href: '/docs', label: 'Docs' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-20 left-4 right-4 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl z-50 md:hidden p-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`px-4 py-3 rounded-lg text-center font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                        : 'text-[#A0A0A5] hover:bg-[#3A3A3F] hover:text-[#F5F3E8]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A1D]/95 backdrop-blur-lg border-t border-[#2A2A35] md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors ${
                  isActive 
                    ? 'text-[#00F0FF]' 
                    : 'text-[#A0A0A5] active:text-[#F5F3E8]'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-0.5 w-8 h-0.5 bg-[#00F0FF] rounded-full"
                  />
                )}
              </Link>
            )
          })}
          
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors ${
              showMore ? 'text-[#00F0FF]' : 'text-[#A0A0A5] active:text-[#F5F3E8]'
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={showMore ? 2.5 : 2} />
            <span className="text-xs mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
