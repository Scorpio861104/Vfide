'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Lock, FileText } from "lucide-react";

type TabType = 'legal' | 'privacy' | 'terms';

const TABS = [
  { id: 'legal' as TabType, label: 'Disclaimers', icon: Scale },
  { id: 'privacy' as TabType, label: 'Privacy', icon: Lock },
  { id: 'terms' as TabType, label: 'Terms', icon: FileText },
];

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('legal');

  return (
    <>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden"
      >
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.05), transparent 65%)', filter: 'blur(60px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        {/* Header */}
        <section className="py-10 relative z-10">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="badge-live mb-3 w-fit"><Scale size={11} /> Legal</div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                Legal & Policies
              </h1>
              <p className="text-zinc-400">
                Important legal information, privacy policy, and terms of service.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="border-b border-white/8 sticky top-7 md:top-[5.25rem] z-40"
          style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(24px)' }}>
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" role="tablist" aria-label="Legal document sections">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id ? 'tab-pill-active' : 'tab-pill-inactive'
                  }`}
                >
                  <tab.icon size={15} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <div className="container mx-auto px-4 max-w-4xl py-10 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
            >
              {activeTab === 'legal' && <LegalDisclaimersTab />}
              {activeTab === 'privacy' && <PrivacyPolicyTab />}
              {activeTab === 'terms' && <TermsOfServiceTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}

function LegalDisclaimersTab() {
  return (
    <div className="space-y-8">
      <div className="bg-zinc-800 border-2 border-red-400 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-3">
          <span className="text-4xl">⚠️</span> STANDARD DISCLAIMER
        </h2>
        <div className="space-y-4 text-zinc-100">
          <p><strong>1. NOT INVESTMENT SECURITIES:</strong> VFIDE tokens are utility tokens for governance and payments, NOT investment securities, equity, or financial instruments.</p>
          <p><strong>2. NO PROFIT GUARANTEE:</strong> No promise, guarantee, or representation of profits, returns, or value appreciation. Token value may go to ZERO.</p>
          <p><strong>3. UTILITY ONLY:</strong> Tokens purchased solely for utility use (governance, payments, protocol participation), not investment or speculation.</p>
          <p><strong>4. ACTIVE PARTICIPATION REQUIRED:</strong> Benefits require your active participation in protocol governance, payments, or operations. NOT passive income.</p>
          <p><strong>5. NO PASSIVE INCOME:</strong> VFIDE does NOT provide dividends, interest, or any form of passive income from team efforts. Peer-to-peer credit lanes are user-negotiated and not a VFIDE yield product.</p>
          <p><strong>6. TOTAL LOSS RISK:</strong> Cryptocurrency involves EXTREME RISK. You may lose your ENTIRE purchase amount. Only purchase what you can afford to lose.</p>
          <p><strong>7. YOUR TAX RESPONSIBILITY:</strong> You are solely responsible for all tax obligations. No tax advice provided.</p>
          <p><strong>8. NOT FINANCIAL ADVICE:</strong> Nothing provided by VFIDE constitutes financial, investment, legal, or tax advice. Consult qualified professionals.</p>
        </div>
      </div>

      <div className="bg-zinc-800 border border-cyan-400 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6">✓ What VFIDE Tokens ARE</h2>
        <ul className="space-y-3 text-zinc-100">
          <li>✓ <strong>Governance Rights:</strong> Vote on protocol proposals and parameter changes</li>
          <li>✓ <strong>Payment Utility:</strong> Use tokens for merchant payments and transactions</li>
          <li>✓ <strong>Fee Reductions:</strong> Higher ProofScore = lower transaction fees (earned through behavior, not purchase)</li>
          <li>✓ <strong>Protocol Participation:</strong> Access to all VFIDE ecosystem features</li>
        </ul>
      </div>

      <div className="bg-zinc-800 border border-red-600 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-6">✗ What VFIDE Tokens ARE NOT</h2>
        <ul className="space-y-3 text-zinc-100">
          <li>✗ <strong>Securities:</strong> Not stocks, bonds, or investment contracts</li>
          <li>✗ <strong>Ownership:</strong> No equity, company shares, or ownership rights</li>
          <li>✗ <strong>Profit Instruments:</strong> No dividend rights or profit-sharing</li>
          <li>✗ <strong>Passive Income:</strong> No staking rewards from team efforts</li>
        </ul>
      </div>

      <div className="bg-zinc-800 border border-amber-400 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">🌍 Your Local Laws Apply</h2>
        <p className="text-zinc-100 leading-relaxed">
          VFIDE is a permissionless protocol with no KYC, no geo-restrictions, and no minimums &mdash;
          if you have a wallet, you can interact with it. Cryptocurrency regulations vary by location
          and change over time, so it is YOUR responsibility to ensure your use of VFIDE complies
          with the laws that apply to you before participating.
        </p>
      </div>
    </div>
  );
}

function PrivacyPolicyTab() {
  return (
    <div className="space-y-8">
      <div className="bg-cyan-400/10 border-2 border-cyan-400 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Key Privacy Points</h2>
        <ul className="space-y-3 text-zinc-100">
          <li>✓ <strong>No KYC Required:</strong> We do not collect personal identification documents</li>
          <li>✓ <strong>No Email Collection:</strong> We don&apos;t require email addresses for protocol use</li>
          <li>✓ <strong>Wallet-Based:</strong> Only your public wallet address is used for interactions</li>
          <li>✓ <strong>On-Chain Transparency:</strong> All transactions are public on the blockchain</li>
          <li>✓ <strong>Self-Custody First:</strong> We do not hold your private keys, but protocol safeguards and governance controls can affect how some flows execute</li>
        </ul>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
        <p className="text-zinc-100 leading-relaxed">
          VFIDE (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy 
          explains how information is collected, used, and disclosed when you interact with our 
          decentralized protocol and website.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Information We Collect</h2>
        <div className="space-y-4 text-zinc-100">
          <p><strong>Public Blockchain Data:</strong> Your wallet address and on-chain transactions are publicly visible on the blockchain.</p>
          <p><strong>Website Analytics:</strong> Anonymous usage data may be collected for improving user experience.</p>
          <p><strong>Voluntary Information:</strong> Any information you choose to provide in governance proposals or discussions.</p>
        </div>
      </div>

      <div className="bg-zinc-800 border border-emerald-500 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-emerald-500 mb-4">3. Data We DO NOT Collect</h2>
        <ul className="space-y-2 text-zinc-100">
          <li>❌ Personal identification documents</li>
          <li>❌ Email addresses (unless voluntarily provided)</li>
          <li>❌ Phone numbers</li>
          <li>❌ Physical addresses</li>
          <li>❌ Private keys or seed phrases</li>
          <li>❌ Bank account or credit card information</li>
        </ul>
      </div>

      <p className="text-zinc-400 text-sm text-center">Last updated: December 2025</p>
    </div>
  );
}

function TermsOfServiceTab() {
  return (
    <div className="space-y-8">
      <div className="bg-zinc-800 border border-red-400 rounded-xl p-6">
        <p className="text-zinc-100 leading-relaxed m-0">
          For complete Terms of Service, please refer to <strong>TERMS-OF-SERVICE.md</strong> in the project repository.
          This page provides a summary of key terms.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Nature of VFIDE Tokens</h2>
        <p className="text-zinc-400 leading-relaxed mb-4">
          VFIDE tokens are <strong className="text-zinc-100">utility tokens</strong> providing access to protocol features. They are <strong className="text-red-400">NOT</strong> securities, equity, or investment instruments.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Utility Functions</h2>
        <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
          <li>Governance voting rights on protocol proposals</li>
          <li>Payment utility within the VFIDE ecosystem</li>
          <li>Access to protocol features and services</li>
          <li>Contribution to ProofScore reputation building</li>
        </ul>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Risk Acknowledgment</h2>
        <p className="text-zinc-400 leading-relaxed">
          By using VFIDE, you acknowledge and accept all risks associated with blockchain technology, 
          smart contracts, and cryptocurrency, including total loss of funds.
        </p>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Self-Custody And Protocol Controls</h2>
        <p className="text-zinc-400 leading-relaxed">
          VFIDE is designed around user-controlled wallets and vaults, and VFIDE does not hold your private keys.
          Some protocol actions, including fraud review, queued withdrawals, guardian recovery, and governance-mediated safety controls,
          can delay, reroute, or constrain specific protocol flows. You should review the active contract rules before relying on any absolute custody claim.
        </p>
      </div>

      <p className="text-zinc-400 text-sm text-center">Last updated: December 2025</p>
    </div>
  );
}
