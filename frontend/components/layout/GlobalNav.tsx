"use client";

import Link from "next/link";
import { useState } from "react";
import { SimpleWalletConnect } from "../wallet/SimpleWalletConnect";
import { FaucetButton } from "../wallet/FaucetButton";
import { VaultStatusModal } from "../vault/VaultStatusModal";
import { VaultStatusIndicator } from "../vault/VaultStatusIndicator";
import { NavbarBalance } from "../ui/TokenBalance";
import { NotificationBell } from "../ui/NotificationBell";

export function GlobalNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F0F12]/95 backdrop-blur-sm border-b border-[#2A2A35]">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="hover:scale-110 transition-transform">
              {/* Shield background */}
              <path d="M20 2L35 8V18C35 28 28 35 20 38C12 35 5 28 5 18V8L20 2Z" fill="url(#shield-gradient)" stroke="#00F0FF" strokeWidth="1.5"/>
              
              {/* V letterform */}
              <path d="M12 12L20 28L28 12" stroke="#F5F3E8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              
              {/* Accent lines */}
              <path d="M15 10H25" stroke="#00F0FF" strokeWidth="1" opacity="0.6"/>
              <circle cx="20" cy="30" r="1.5" fill="#00F0FF"/>
              
              <defs>
                <linearGradient id="shield-gradient" x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1A1A1D"/>
                  <stop offset="1" stopColor="#2A2A2F"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-2xl font-[family-name:var(--font-display)] font-bold text-[#F5F5F7]">
              VFIDE
            </span>
          </Link>

          {/* Desktop Navigation - Simplified */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/dashboard" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Dashboard
            </Link>
            <Link href="/vault" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Vault
            </Link>
            <Link href="/merchant" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Merchant
            </Link>
            <Link href="/leaderboard" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Leaderboard
            </Link>
            <Link href="/governance" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Governance
            </Link>
            <Link href="/token-launch" className="text-[#00F0FF] hover:text-[#00D4FF] transition-colors font-semibold">
              Launch
            </Link>
            <Link href="/docs" className="text-[#B8B8BD] hover:text-[#00F0FF] transition-colors font-medium">
              Docs
            </Link>
          </div>

          {/* Wallet Connection & Vault Status */}
          <div className="hidden md:flex items-center gap-3">
            <FaucetButton />
            <NavbarBalance />
            <NotificationBell />
            <VaultStatusIndicator />
            <SimpleWalletConnect />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[#F5F3E8]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2">
            <Link href="/dashboard" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </Link>
            <Link href="/vault" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Vault
            </Link>
            <Link href="/merchant" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Merchant
            </Link>
            <Link href="/leaderboard" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Leaderboard
            </Link>
            <Link href="/governance" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Governance
            </Link>
            <Link href="/token-launch" className="block py-2 text-[#00F0FF] hover:text-[#00D4FF] font-bold" onClick={() => setMobileMenuOpen(false)}>
              Launch
            </Link>
            <Link href="/docs" className="block py-2 text-[#A0A0A5] hover:text-[#00F0FF]" onClick={() => setMobileMenuOpen(false)}>
              Docs
            </Link>
            <div className="mt-2">
              <SimpleWalletConnect />
            </div>
          </div>
        )}
      </div>
      
      {/* Vault Status Modal - shows when wallet connects */}
      <VaultStatusModal />
    </nav>
  );
}
