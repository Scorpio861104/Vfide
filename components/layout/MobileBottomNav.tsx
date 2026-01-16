/**
 * MobileBottomNav - Fixed bottom navigation for mobile users
 * Shows on screens smaller than md (768px)
 */

'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Home, LayoutDashboard, MoreHorizontal, Store, Vault, Vote, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vault', label: 'Vault', icon: Vault },
  { href: '/merchant', label: 'Merchant', icon: Store },
  { href: '/governance', label: 'Gov', icon: Vote },
]

// Organized by category for better mobile UX
const moreItems = [
  { href: '/crypto', label: 'Wallet', emoji: '💳', category: 'Core' },
  { href: '/feed', label: 'Feed', emoji: '📰', category: 'Core' },
  { href: '/stories', label: 'Stories', emoji: '📸', category: 'Core' },
  { href: '/social-messaging', label: 'Messages', emoji: '💬', category: 'Core' },
  { href: '/social', label: 'Analytics', emoji: '📈', category: 'Core' },
  { href: '/profile', label: 'Profile', emoji: '👤', category: 'Core' },
  { href: '/quests', label: 'Quests', emoji: '🎯', category: 'Gamification' },
  { href: '/achievements', label: 'Achievements', emoji: '🏆', category: 'Gamification' },
  { href: '/badges', label: 'Badges', emoji: '🎖️', category: 'Gamification' },
  { href: '/rewards', label: 'Rewards', emoji: '🎁', category: 'Gamification' },
  { href: '/leaderboard', label: 'Leaderboard', emoji: '📊', category: 'Gamification' },
  { href: '/headhunter', label: 'Headhunter', emoji: '🏹', category: 'Community' },
  { href: '/endorsements', label: 'Endorsements', emoji: '⭐', category: 'Community' },
  { href: '/appeals', label: 'Appeals', emoji: '⚖️', category: 'Community' },
  { href: '/council', label: 'Council', emoji: '👑', category: 'Community' },
  { href: '/payroll', label: 'Payroll', emoji: '💰', category: 'Finance' },
  { href: '/escrow', label: 'Escrow', emoji: '🔒', category: 'Finance' },
  { href: '/treasury', label: 'Treasury', emoji: '🏦', category: 'Finance' },
  { href: '/token-launch', label: 'Token Launch', emoji: '🚀', category: 'Finance' },
  { href: '/streaming', label: 'Streaming', emoji: '⏱️', category: 'Finance' },
  { href: '/cross-chain', label: 'Cross-Chain', emoji: '🔗', category: 'Finance' },
  { href: '/stealth', label: 'Private Pay', emoji: '👁️', category: 'Privacy' },
  { href: '/guardians', label: 'Guardians', emoji: '🛡️', category: 'Privacy' },
  { href: '/multisig', label: 'Multi-Sig', emoji: '✍️', category: 'Privacy' },
  { href: '/time-locks', label: 'Time Locks', emoji: '⏳', category: 'Privacy' },
  { href: '/insights', label: 'Insights', emoji: '🧠', category: 'Intelligence' },
  { href: '/taxes', label: 'Tax Report', emoji: '📋', category: 'Intelligence' },
  { href: '/budgets', label: 'Budgets', emoji: '💵', category: 'Intelligence' },
  { href: '/sanctum', label: 'Sanctum', emoji: '⚡', category: 'System' },
  { href: '/security-center', label: 'Security', emoji: '🔐', category: 'System' },
  { href: '/developer', label: 'Developer', emoji: '👨‍💻', category: 'System' },
  { href: '/docs', label: 'Docs', emoji: '📚', category: 'System' },
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
              className="fixed bottom-16 xs:bottom-20 left-2 xs:left-3 right-2 xs:right-3 glass rounded-xl xs:rounded-2xl z-50 md:hidden p-2 xs:p-3 sm:p-4 max-h-[60vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-menu-title"
            >
              <div className="flex items-center justify-between mb-2 xs:mb-3 sm:mb-4">
                <span id="more-menu-title" className="text-xs xs:text-sm font-semibold text-[#F8F8FC]">More Options</span>
                <button 
                  onClick={() => setShowMore(false)}
                  className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg bg-[#1F1F2A] flex items-center justify-center text-[#6B6B78] hover:text-[#F8F8FC] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={14} className="xs:w-4 xs:h-4" />
                </button>
              </div>
              
              {/* Group items by category */}
              {['Core', 'Gamification', 'Community', 'Finance', 'Privacy', 'Intelligence', 'System'].map((category) => {
                const categoryItems = moreItems.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category} className="mb-3 xs:mb-4 last:mb-0">
                    <div className="px-1.5 xs:px-2 mb-1.5 xs:mb-2 text-[10px] xs:text-xs font-semibold text-[#6B6B78] uppercase tracking-wider">
                      {category}
                    </div>
                    <div className="grid grid-cols-3 xs:grid-cols-3 gap-1.5 xs:gap-2">
                      {categoryItems.map((item, index) => (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setShowMore(false)}
                            className={`flex flex-col items-center gap-1 xs:gap-2 p-2 xs:p-3 rounded-lg xs:rounded-xl text-center transition-all ${
                              pathname === item.href
                                ? 'bg-[#00F0FF]/20 border border-[#00F0FF]/30'
                                : 'bg-[#16161D] border border-[#1F1F2A] hover:border-[#00F0FF]/20'
                            }`}
                          >
                            <span className="text-base xs:text-xl">{item.emoji}</span>
                            <span className={`text-[8px] xs:text-[10px] font-medium leading-tight ${
                              pathname === item.href ? 'text-[#00F0FF]' : 'text-[#A8A8B3]'
                            }`}>
                              {item.label}
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-[#1F1F2A] md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14 xs:h-16 px-1 xs:px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center w-12 xs:w-14 sm:w-16 h-12 xs:h-14 rounded-lg xs:rounded-xl transition-all ${
                  isActive 
                    ? 'text-[#00F0FF]' 
                    : 'text-[#6B6B78] active:text-[#F8F8FC]'
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} className="xs:w-[22px] xs:h-[22px]" />
                  <span className="text-[8px] xs:text-[10px] mt-0.5 xs:mt-1 font-medium truncate max-w-[48px]">{item.label}</span>
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 w-8 xs:w-10 h-0.5 xs:h-1 bg-linear-to-r from-[#00F0FF] to-[#0080FF] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
          
          {/* More Button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`relative flex flex-col items-center justify-center w-12 xs:w-14 sm:w-16 h-12 xs:h-14 rounded-lg xs:rounded-xl transition-all ${
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
              <MoreHorizontal size={18} strokeWidth={showMore ? 2.5 : 1.5} className="xs:w-[22px] xs:h-[22px]" />
              <span className="text-[8px] xs:text-[10px] mt-0.5 xs:mt-1 font-medium">More</span>
            </motion.div>
            {showMore && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute top-0 w-8 xs:w-10 h-0.5 xs:h-1 bg-linear-to-r from-[#00F0FF] to-[#0080FF] rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </nav>
    </>
  )
}
