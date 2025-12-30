/**
 * MobileBottomNav - Fixed bottom navigation for mobile users
 * Shows on screens smaller than md (768px)
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutDashboard, Vault, Store, Vote, MoreHorizontal, X } from 'lucide-react'
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
  { href: '/token-launch', label: 'Token Launch', emoji: '🚀' },
  { href: '/leaderboard', label: 'Leaderboard', emoji: '🏆' },
  { href: '/rewards', label: 'Rewards', emoji: '🎁' },
  { href: '/escrow', label: 'Escrow', emoji: '🔒' },
  { href: '/sanctum', label: 'Sanctum', emoji: '⚡' },
  { href: '/docs', label: 'Docs', emoji: '📚' },
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-20 left-3 right-3 glass rounded-2xl z-50 md:hidden p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-menu-title"
            >
              <div className="flex items-center justify-between mb-4">
                <span id="more-menu-title" className="text-sm font-semibold text-[#F8F8FC]">More Options</span>
                <button 
                  onClick={() => setShowMore(false)}
                  className="w-8 h-8 rounded-lg bg-[#1F1F2A] flex items-center justify-center text-[#6B6B78] hover:text-[#F8F8FC] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all ${
                        pathname === item.href
                          ? 'bg-[#00F0FF]/20 border border-[#00F0FF]/30'
                          : 'bg-[#16161D] border border-[#1F1F2A] hover:border-[#00F0FF]/20'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className={`text-xs font-medium ${
                        pathname === item.href ? 'text-[#00F0FF]' : 'text-[#A8A8B3]'
                      }`}>
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[#1F1F2A] md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
                  isActive 
                    ? 'text-[#00F0FF]' 
                    : 'text-[#6B6B78] active:text-[#F8F8FC]'
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-10 h-1 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
          
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all ${
              showMore ? 'text-[#00F0FF]' : 'text-[#6B6B78] active:text-[#F8F8FC]'
            }`}
            aria-label={showMore ? 'Close more options' : 'Open more options'}
            aria-expanded={showMore}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: showMore ? 90 : 0 }}
              className="flex flex-col items-center"
            >
              <MoreHorizontal size={22} strokeWidth={showMore ? 2.5 : 1.5} />
              <span className="text-[10px] mt-1 font-medium">More</span>
            </motion.div>
            {showMore && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute top-0 w-10 h-1 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </nav>
    </>
  )
}
