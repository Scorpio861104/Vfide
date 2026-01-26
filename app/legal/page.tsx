'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";

type TabType = 'legal' | 'privacy' | 'terms';

export default function LegalPage() {
  const [activeTab, setActiveTab] = useState<TabType>('legal');

  return (
    <>
      
      <main className="min-h-screen bg-zinc-900 pt-20">
        <section className="py-12 bg-zinc-800 border-b border-zinc-700">
          <div className="container mx-auto px-3 sm:px-4">
            <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-2 text-center">
              Legal & Policies
            </h1>
            <p className="text-center text-zinc-400 text-sm">
              Important legal information, privacy policy, and terms of service
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-zinc-900 border-b border-zinc-700 sticky top-20 z-40">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-1 overflow-x-auto py-2" role="tablist" aria-label="Legal document sections">
              {[
                { id: 'legal' as const, label: 'Disclaimers', color: '#FF6B6B' },
                { id: 'privacy' as const, label: 'Privacy', color: '#00F0FF' },
                { id: 'terms' as const, label: 'Terms', color: '#00FF88' },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-t-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-zinc-100 border-t-2'
                      : 'bg-transparent text-zinc-400 hover:text-zinc-100'
                  }`}
                  style={{ borderColor: activeTab === tab.id ? tab.color : 'transparent' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <div className="container mx-auto px-4 max-w-4xl py-12">
          <div role="tabpanel" id="tabpanel-legal" hidden={activeTab !== 'legal'}>
            {activeTab === 'legal' && <LegalDisclaimersTab />}
          </div>
          <div role="tabpanel" id="tabpanel-privacy" hidden={activeTab !== 'privacy'}>
            {activeTab === 'privacy' && <PrivacyPolicyTab />}
          </div>
          <div role="tabpanel" id="tabpanel-terms" hidden={activeTab !== 'terms'}>
            {activeTab === 'terms' && <TermsOfServiceTab />}
          </div>
        </div>
      </main>
      
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
          <p><strong>5. NO PASSIVE INCOME:</strong> VFIDE does NOT provide dividends, interest, or any form of passive income from team efforts.</p>
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
        <h2 className="text-2xl font-bold text-amber-400 mb-6">🌍 Jurisdiction Notice</h2>
        <p className="text-zinc-100 leading-relaxed">
          VFIDE tokens are not offered to residents of the United States, China, or any jurisdiction where 
          cryptocurrency transactions are prohibited. It is YOUR responsibility to ensure compliance with 
          your local laws before participating.
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
          <li>✓ <strong>Non-Custodial:</strong> We never have access to your funds or private keys</li>
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
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Non-Custodial Nature</h2>
        <p className="text-zinc-400 leading-relaxed">
          VFIDE operates as a non-custodial protocol. You maintain full control of your funds and 
          private keys at all times. VFIDE cannot freeze, seize, or access your funds.
        </p>
      </div>

      <p className="text-zinc-400 text-sm text-center">Last updated: December 2025</p>
    </div>
  );
}
