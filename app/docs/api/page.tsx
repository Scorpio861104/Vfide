"use client";

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Code, Book, Zap, Shield, Key } from "lucide-react";
import Link from "next/link";

export default function APIDocsPage() {
  return (
    <>
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Code className="w-16 h-16 text-[#00F0FF] mx-auto mb-6" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-6">
                VFIDE API Documentation
              </h1>
              <p className="text-xl md:text-2xl text-[#A0A0A5] leading-relaxed">
                Build on VFIDE with our comprehensive API
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-8">
                Quick Start
              </h2>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#F5F3E8] mb-4">Base URL</h3>
                <code className="block bg-[#1A1A1D] p-4 rounded-lg text-[#00F0FF] font-mono text-sm">
                  https://vfide.app/api
                </code>
              </div>
            </motion.div>

            {/* API Endpoints */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-8">
                Core Endpoints
              </h2>
              
              <div className="grid gap-6">
                {/* Users */}
                <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-[#00F0FF]" />
                    <h3 className="text-xl font-semibold text-[#F5F3E8]">Users</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/users</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">List all users</p>
                    </div>
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/users/[address]</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get user by wallet address</p>
                    </div>
                  </div>
                </div>

                {/* Crypto Operations */}
                <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-6 h-6 text-[#00F0FF]" />
                    <h3 className="text-xl font-semibold text-[#F5F3E8]">Crypto Operations</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/crypto/balance/[address]</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get wallet balance</p>
                    </div>
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/crypto/transactions/[userId]</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get transaction history</p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-mono text-sm">POST</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/crypto/payment-requests</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Create payment request</p>
                    </div>
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/crypto/price</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get current token prices</p>
                    </div>
                  </div>
                </div>

                {/* Gamification */}
                <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-6 h-6 text-[#00F0FF]" />
                    <h3 className="text-xl font-semibold text-[#F5F3E8]">Gamification</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/badges</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get all badges</p>
                    </div>
                    <div>
                      <code className="text-green-400 font-mono text-sm">GET</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/quests/daily</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Get daily quests</p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-mono text-sm">POST</code>
                      <code className="ml-3 text-[#A0A0A5] font-mono text-sm">/api/quests/claim</code>
                      <p className="text-sm text-[#A0A0A5] mt-2">Claim quest reward</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Authentication */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-8">
                Authentication
              </h2>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <p className="text-[#A0A0A5] mb-4">
                  All API requests require wallet signature authentication. Include your wallet address and signature in the request headers:
                </p>
                <code className="block bg-[#1A1A1D] p-4 rounded-lg text-[#00F0FF] font-mono text-sm">
                  {`{
  "X-Wallet-Address": "0x...",
  "X-Signature": "0x..."
}`}
                </code>
              </div>
            </motion.div>

            {/* Rate Limits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-8">
                Rate Limits
              </h2>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
                <ul className="space-y-2 text-[#A0A0A5]">
                  <li>• <strong>Standard:</strong> 100 requests per minute</li>
                  <li>• <strong>Merchant:</strong> 500 requests per minute</li>
                  <li>• <strong>Enterprise:</strong> Unlimited (contact us)</li>
                </ul>
              </div>
            </motion.div>

            {/* Resources */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-[#00F0FF] mb-8">
                Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  href="/docs"
                  className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
                >
                  <Book className="w-8 h-8 text-[#00F0FF] mb-4" />
                  <h3 className="text-lg font-semibold text-[#F5F3E8] mb-2">Full Documentation</h3>
                  <p className="text-sm text-[#A0A0A5]">Complete guides and tutorials</p>
                </Link>
                <a
                  href="https://github.com/Scorpio861104/Vfide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
                >
                  <Code className="w-8 h-8 text-[#00F0FF] mb-4" />
                  <h3 className="text-lg font-semibold text-[#F5F3E8] mb-2">GitHub</h3>
                  <p className="text-sm text-[#A0A0A5]">View source code and examples</p>
                </a>
                <Link
                  href="/merchant"
                  className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
                >
                  <Shield className="w-8 h-8 text-[#00F0FF] mb-4" />
                  <h3 className="text-lg font-semibold text-[#F5F3E8] mb-2">Merchant Portal</h3>
                  <p className="text-sm text-[#A0A0A5]">Start accepting VFIDE payments</p>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
