"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, User } from "lucide-react";
import { NotificationCenter } from "../ui/NotificationCenter";
import { NavbarBalance } from "../ui/TokenBalance";
import { VaultStatusIndicator } from "../vault/VaultStatusIndicator";
import { VaultStatusModal } from "../vault/VaultStatusModal";
import { FaucetButton } from "../wallet/FaucetButton";
import { SimpleWalletConnect } from "../wallet/SimpleWalletConnect";

// Primary navigation - organized by category
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/crypto", label: "Wallet", highlight: true },
  { href: "/social", label: "Social", highlight: true },
  { href: "/social-messaging", label: "Messages", highlight: true },
  { href: "/merchant", label: "Merchant" },
  { href: "/governance", label: "Governance" },
  { href: "/docs", label: "Docs" },
];

// Secondary navigation - organized by category
const moreLinks = [
  {
    category: "Gamification",
    items: [
      { href: "/quests", label: "Quests", accent: true },
      { href: "/achievements", label: "Achievements", accent: true },
      { href: "/badges", label: "Badges", accent: true },
      { href: "/rewards", label: "Rewards", accent: true },
      { href: "/leaderboard", label: "Leaderboard" },
    ]
  },
  {
    category: "Community",
    items: [
      { href: "/headhunter", label: "Headhunter", accent: true },
      { href: "/endorsements", label: "Endorsements" },
      { href: "/appeals", label: "Appeals" },
      { href: "/council", label: "Council" },
    ]
  },
  {
    category: "Finance",
    items: [
      { href: "/payroll", label: "Payroll" },
      { href: "/escrow", label: "Escrow" },
      { href: "/treasury", label: "Treasury" },
      { href: "/token-launch", label: "Token Launch", accent: true },
    ]
  },
  {
    category: "System",
    items: [
      { href: "/sanctum", label: "Sanctum" },
      { href: "/security-center", label: "Security" },
      { href: "/admin", label: "Admin" },
    ]
  }
];

export function GlobalNav() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#1F1F2A]">
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">\n            <motion.svg 
              width="40" 
              height="40" 
              viewBox="0 0 40 40" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {/* Shield background */}
              <path 
                d="M20 2L35 8V18C35 28 28 35 20 38C12 35 5 28 5 18V8L20 2Z" 
                fill="url(#shield-gradient)" 
                stroke="url(#shield-stroke)" 
                strokeWidth="1.5"
              />
              
              {/* V letterform */}
              <path 
                d="M12 12L20 28L28 12" 
                stroke="#F8F8FC" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              
              {/* Accent lines */}
              <path d="M15 10H25" stroke="#00F0FF" strokeWidth="1" opacity="0.6"/>
              <circle cx="20" cy="30" r="1.5" fill="#00F0FF"/>
              
              <defs>
                <linearGradient id="shield-gradient" x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1A1A1D"/>
                  <stop offset="1" stopColor="#0F0F12"/>
                </linearGradient>
                <linearGradient id="shield-stroke" x1="5" y1="2" x2="35" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00F0FF"/>
                  <stop offset="1" stopColor="#0080FF"/>
                </linearGradient>
              </defs>
            </motion.svg>
            <span className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F8F8FC] group-hover:text-[#00F0FF] transition-colors">
              VFIDE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href);
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`
                    relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                    ${link.accent 
                      ? 'text-[#00F0FF] hover:bg-[#00F0FF]/10' 
                      : isActive 
                        ? 'text-[#F8F8FC] bg-[#1F1F2A]' 
                        : 'text-[#8A8A8F] hover:text-[#F8F8FC] hover:bg-[#16161D]'
                    }
                  `}
                >
                  {link.label}
                  {isActive && !link.accent && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00F0FF] rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            
            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="px-4 py-2 rounded-lg font-medium text-sm text-[#8A8A8F] hover:text-[#F8F8FC] hover:bg-[#16161D] transition-all flex items-center gap-1"
              >
                <MoreHorizontal className="w-4 h-4" />
                More
              </button>
              
              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-[#0F0F12] border border-[#1F1F2A] rounded-xl shadow-2xl p-3 z-50 max-h-[32rem] overflow-y-auto scrollbar-thin"
                    >
                      {moreLinks.map((section, sectionIdx) => (
                        <div key={section.category} className={sectionIdx > 0 ? "mt-4 pt-4 border-t border-[#1F1F2A]" : ""}>
                          <div className="px-2 mb-2 text-xs font-semibold text-[#8A8A8F] uppercase tracking-wider">
                            {section.category}
                          </div>
                          {section.items.map((link) => {
                            const isActive = pathname?.startsWith(link.href);
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setShowMoreMenu(false)}
                                className={`
                                  block px-3 py-2 rounded-lg text-sm transition-all
                                  ${link.accent 
                                    ? 'text-[#00F0FF] hover:bg-[#00F0FF]/10' 
                                    : isActive 
                                      ? 'text-[#F8F8FC] bg-[#1F1F2A]' 
                                      : 'text-[#A8A8B3] hover:text-[#F8F8FC] hover:bg-[#16161D]'
                                  }
                                `}
                              >
                                {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Wallet Connection & Vault Status - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <FaucetButton />
            <NavbarBalance />
            <NotificationCenter />
            <VaultStatusIndicator />
            <Link
              href="/profile"
              className="p-2 rounded-lg text-[#8A8A8F] hover:text-[#F8F8FC] hover:bg-[#16161D] transition-all"
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </Link>
            <SimpleWalletConnect />
          </div>

          {/* Mobile: Just wallet essentials (navigation is in bottom nav) */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationCenter />
            <SimpleWalletConnect />
          </div>
        </div>
      </div>
      
      {/* Vault Status Modal - shows when wallet connects */}
      <VaultStatusModal />
    </nav>
  );
}
