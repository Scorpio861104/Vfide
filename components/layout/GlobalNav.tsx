'use client';

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
import { QuickWalletConnect } from "../wallet/QuickWalletConnect";
import { NetworkSwitcher } from "../wallet/NetworkSwitcher";
import {
  MetalDashboardIcon,
  MetalVaultIcon,
  MetalSocialIcon,
  MetalMerchantIcon,
  MetalGovernanceIcon,
  MetalHeadhunterIcon,
  MetalShieldIcon,
  MetalRewardsIcon,
  MetalTokenIcon,
} from "../icons/MetallicIcons";

// Icon mapping for navigation
const navIcons: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Dashboard: MetalDashboardIcon,
  Vault: MetalVaultIcon,
  Wallet: MetalVaultIcon, // Using vault icon for wallet
  Social: MetalSocialIcon,
  Messages: MetalSocialIcon,
  Merchant: MetalMerchantIcon,
  Governance: MetalGovernanceIcon,
  "DAO Hub": MetalGovernanceIcon,
  "Flashloans P2P": MetalTokenIcon,
  Flashlight: MetalTokenIcon,
  Headhunter: MetalHeadhunterIcon,
  Endorsements: MetalShieldIcon,
  Rewards: MetalRewardsIcon,
  "Token Launch": MetalTokenIcon,
};

// Primary navigation - organized by category
const navLinks: Array<{ href: string; label: string; highlight?: boolean; accent?: boolean }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vault", label: "Vault" },
  { href: "/crypto", label: "Wallet", highlight: true },
  { href: "/feed", label: "Feed", highlight: true },
  { href: "/stories", label: "Stories", highlight: true },
  { href: "/social-messaging", label: "Messages", highlight: true },
  { href: "/merchant", label: "Merchant" },
  { href: "/flashlight", label: "Flashloans P2P", highlight: true },
  { href: "/governance", label: "Governance" },
  { href: "/dao-hub", label: "DAO Hub", highlight: true, accent: true },
];

// Secondary navigation - organized by category
const moreLinks = [
  {
    category: "Social",
    items: [
      { href: "/social", label: "Analytics", accent: true },
      { href: "/social-hub", label: "Social Hub", accent: true },
      { href: "/social-payments", label: "Social Payments", accent: true },
      { href: "/docs", label: "Docs" },
    ]
  },
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
      { href: "/dao-hub", label: "DAO Hub", accent: true },
    ]
  },
  {
    category: "Finance",
    items: [
      { href: "/pay", label: "Pay", accent: true },
      { href: "/pos", label: "POS", accent: true },
      { href: "/flashlight", label: "Flashloans P2P", accent: true },
      { href: "/payroll", label: "Payroll" },
      { href: "/escrow", label: "Escrow" },
      { href: "/treasury", label: "Treasury" },
      { href: "/reporting", label: "Reporting" },
      { href: "/token-launch", label: "Token Launch", accent: true },
      { href: "/streaming", label: "Streaming", accent: true },
      { href: "/cross-chain", label: "Cross-Chain", accent: true },
      { href: "/subscriptions", label: "Subscriptions", accent: true },
      { href: "/buy", label: "Buy Tokens", accent: true },
    ]
  },
  {
    category: "Privacy & Security",
    items: [
      { href: "/stealth", label: "Private Pay", accent: true },
      { href: "/guardians", label: "Guardians" },
      { href: "/vault/settings", label: "Vault Settings" },
      { href: "/vault/recover", label: "Vault Recovery" },
      { href: "/multisig", label: "Multi-Sig" },
      { href: "/time-locks", label: "Time Locks" },
    ]
  },
  {
    category: "Intelligence",
    items: [
      { href: "/insights", label: "Insights", accent: true },
      { href: "/taxes", label: "Tax Report" },
      { href: "/budgets", label: "Budgets" },
      { href: "/price-alerts", label: "Price Alerts" },
    ]
  },
  {
    category: "System",
    items: [
      { href: "/enterprise", label: "Enterprise", accent: true },
      { href: "/performance", label: "Performance", accent: true },
      { href: "/sanctum", label: "Sanctum" },
      { href: "/security-center", label: "Security" },
      { href: "/admin", label: "Admin" },
      { href: "/developer", label: "Developer", accent: true },
      { href: "/control-panel", label: "Control Panel", accent: true },
      { href: "/setup", label: "Setup" },
      { href: "/testnet", label: "Testnet" },
      { href: "/support", label: "Support" },
      { href: "/notifications", label: "Notifications" },
      { href: "/live-demo", label: "Live Demo" },
      { href: "/demo/crypto-social", label: "Crypto Social Demo", accent: true },
      { href: "/explorer", label: "Explorer", accent: true },
      { href: "/explorer/[id]", label: "Explorer Detail" },
      { href: "/theme", label: "Theme" },
      { href: "/theme-manager", label: "Theme Manager" },
      { href: "/theme-showcase", label: "Theme Showcase" },
      { href: "/about", label: "About" },
      { href: "/benefits", label: "Benefits" },
      { href: "/vesting", label: "Vesting" },
      { href: "/paper-wallet", label: "Paper Wallet" },
      { href: "/hardware-wallet", label: "Hardware Wallet" },
      { href: "/invite", label: "Invite", accent: true },
      { href: "/invite/[code]", label: "Invite Code" },
      { href: "/legal", label: "Legal" },
    ]
  }
];

export function GlobalNav() {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  return (
    <header role="banner" className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800">
      <nav aria-label="Global navigation">
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
            <span className="text-2xl font-(family-name:--font-display) font-bold text-zinc-50 group-hover:text-cyan-400 transition-colors">
              VFIDE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname?.startsWith(link.href);
              const IconComponent = navIcons[link.label];
              
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`
                    relative px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2
                    ${link.accent 
                      ? 'text-cyan-400 hover:bg-cyan-400/10' 
                      : isActive 
                        ? 'text-zinc-50 bg-zinc-900' 
                        : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                    }
                  `}
                >
                  {IconComponent && <IconComponent size={18} className="opacity-80" />}
                  {link.label}
                  {isActive && !link.accent && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full"
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
                className="px-4 py-2 rounded-lg font-medium text-sm text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-all flex items-center gap-1"
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
                      className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 max-h-128 overflow-y-auto scrollbar-thin"
                    >
                      {moreLinks.map((section, sectionIdx) => (
                        <div key={section.category} className={sectionIdx > 0 ? "mt-4 pt-4 border-t border-zinc-800" : ""}>
                          <div className="px-2 mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            {section.category}
                          </div>
                          {section.items.map((link) => {
                            const isActive = pathname?.startsWith(link.href);
                            const IconComponent = navIcons[link.label];
                            
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setShowMoreMenu(false)}
                                className={`
                                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                                  ${link.accent 
                                    ? 'text-cyan-400 hover:bg-cyan-400/10' 
                                    : isActive 
                                      ? 'text-zinc-50 bg-zinc-900' 
                                      : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900'
                                  }
                                `}
                              >
                                {IconComponent && <IconComponent size={18} className="opacity-70 shrink-0" />}
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
            <NetworkSwitcher />
            <Link
              href="/profile"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-all"
              aria-label="Profile"
            >
              <User className="w-5 h-5" />
            </Link>
            <QuickWalletConnect />
          </div>

          {/* Mobile: Just wallet essentials (navigation is in bottom nav) */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationCenter />
            <QuickWalletConnect />
          </div>
        </div>
      </div>
      
      {/* Vault Status Modal - shows when wallet connects */}
      <VaultStatusModal />
      </nav>
    </header>
  );
}
