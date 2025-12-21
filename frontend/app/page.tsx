"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, Zap, Users, TrendingDown, Lock } from "lucide-react";

export default function Home() {
  return (
    <>
      <GlobalNav />
      
      {/* Hero Section - Clean and Direct */}
      <section className="min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-[#0F0F12] to-[#1A1A1F] pt-20">
        <div className="container mx-auto px-4 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-display)] font-bold text-[#F5F5F7] mb-6">
              Accept Crypto Payments.
              <br />
              <span className="text-[#00F0FF]">0% Processing Fees.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-[#B8B8BD] mb-12 max-w-3xl mx-auto">
              The first payment system where merchants pay <strong className="text-[#F5F5F7]">zero payment processing fees</strong>. 
              Network burn fees (0.25-5%) based on ProofScore still apply. Your funds, your vault, your control.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link 
                href="/token-launch"
                className="px-10 py-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#0F0F12] rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[#00F0FF]/20"
              >
                Get Started Now
              </Link>
              <Link 
                href="/live-demo" 
                className="px-10 py-4 border-2 border-[#00F0FF] text-[#00F0FF] rounded-xl font-bold text-lg hover:bg-[#00F0FF]/10 transition-colors"
              >
                View Live Demo
              </Link>
            </div>

            {/* Key Stats - Live Demo Indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-[#B8B8BD]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00F0FF] rounded-full animate-pulse" />
                <span>Testnet Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
                <span>14 Smart Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#22C55E] rounded-full" />
                <span>All Tests Passing</span>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="mt-8 text-xs text-[#8A8A8F] max-w-2xl mx-auto">
              VFIDE tokens are utility tokens for governance and payments, not investment securities. Cryptocurrency involves significant risk including total loss of funds. Nothing on this site constitutes financial, investment, legal, or tax advice. See <a href="/legal" className="text-[#00F0FF] hover:underline">full terms</a>.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Value Props - Clean 3x2 Grid */}
      <section className="py-20 bg-[#1A1A1F]">
        <div className="container mx-auto px-4 max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-center text-[#F5F5F7] mb-16"
          >
            Why VFIDE?
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 0% Fees */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#00F0FF] transition-colors"
            >
              <div className="w-12 h-12 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingDown className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">0% Processing Fees</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                No merchant processing fees like Stripe (2.9%). Network burn fees (0.25-5%) based on ProofScore apply.
              </p>
            </motion.div>

            {/* Non-Custodial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#00FF88] transition-colors"
            >
              <div className="w-12 h-12 bg-[#00FF88]/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-[#00FF88]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">You Own Your Funds</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                Your vault, your control. VFIDE never holds or accesses your funds. True non-custodial.
              </p>
            </motion.div>

            {/* Instant Settlement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#FFD700] transition-colors"
            >
              <div className="w-12 h-12 bg-[#FFD700]/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-[#FFD700]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">Instant Settlement</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                Funds settle immediately in your vault. No waiting days for payment processing.
              </p>
            </motion.div>

            {/* ProofScore */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#A78BFA] transition-colors"
            >
              <div className="w-12 h-12 bg-[#A78BFA]/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-[#A78BFA]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">Trust System</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                Build reputation through actions, not wealth. Higher ProofScore = lower fees.
              </p>
            </motion.div>

            {/* Community Governed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#00F0FF] transition-colors"
            >
              <div className="w-12 h-12 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">Community Governed</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                Vote on protocol changes using your ProofScore. True decentralization.
              </p>
            </motion.div>

            {/* Global Access */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-[#0F0F12] border border-[#2A2A35] rounded-xl p-8 hover:border-[#22C55E] transition-colors"
            >
              <div className="w-12 h-12 bg-[#22C55E]/10 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />
              </div>
              <h3 className="text-2xl font-bold text-[#F5F5F7] mb-3">Global & Open</h3>
              <p className="text-[#B8B8BD] leading-relaxed">
                No KYC, no geo-restrictions. If you have a wallet, you&apos;re in. Works anywhere.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Simple 3 Steps */}
      <section className="py-20 bg-[#0F0F12]">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-center text-[#F5F5F7] mb-4"
          >
            How It Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-[#B8B8BD] text-lg mb-16"
          >
            Get started in under 60 seconds
          </motion.p>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Connect Your Wallet",
                description: "Use MetaMask, Coinbase Wallet, or any Web3 wallet. No email, no KYC required.",
                time: "10 seconds"
              },
              {
                step: "2",
                title: "Your Vault is Auto-Created",
                description: "On your first token receipt, a personal vault (smart contract safe) is automatically created. Wallet = ATM card. Vault = bank account. Only your wallet key can unlock it.",
                time: "Instant"
              },
              {
                step: "3",
                title: "Start Accepting Payments",
                description: "Share your payment link or QR code. Customers pay with any crypto. No processor fees (burn + gas apply).",
                time: "Ready to go"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-6 bg-[#1A1A1F] border border-[#2A2A35] rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#00F0FF] to-[#0080FF] rounded-full flex items-center justify-center text-[#0F0F12] font-bold text-xl flex-shrink-0">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#F5F5F7] mb-2">{item.title}</h3>
                  <p className="text-[#B8B8BD] mb-2">{item.description}</p>
                  <span className="text-[#00F0FF] text-sm font-semibold">→ {item.time}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link 
              href="/merchant"
              className="inline-block px-10 py-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#0F0F12] rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-[#00F0FF]/20"
            >
              Start Accepting Payments
            </Link>
            <p className="mt-4 text-[#B8B8BD] text-sm">
              No signup required • Non-custodial • Permissionless access
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
