'use client';

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Shield, Users, Zap, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      
      <main className="min-h-screen bg-zinc-900 pt-20">
        {/* Hero */}
        <section className="py-20 bg-linear-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-[family-name:var(--font-display)] font-bold text-zinc-100 mb-6">
                About VFIDE
              </h1>
              <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed">
                A decentralized payment protocol built on integrity, not wealth.
                Where trust is earned through actions, not purchased with capital.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-8 mb-12"
            >
              <h2 className="text-3xl font-[family-name:var(--font-display)] font-bold text-cyan-400 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-zinc-100 leading-relaxed mb-4">
                VFIDE exists to create a financial system that values <strong>integrity over wealth</strong>. 
                We believe that trust should be earned through actions, not bought with money.
              </p>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Our ProofScore system rewards good behavior, community participation, and honest dealings - 
                not the size of your wallet. A user with 1 VFIDE token can have the same influence as 
                someone with 500,000 tokens if they&apos;ve demonstrated genuine trust and contribution.
              </p>
            </motion.div>

            {/* Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-cyan-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Non-Custodial</h3>
                <p className="text-zinc-400">
                  Your funds live in YOUR vault. VFIDE never holds, controls, or has access to your assets.
                  True financial sovereignty.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-emerald-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">Community Governed</h3>
                <p className="text-zinc-400">
                  Every protocol decision is made by the community through DAO governance.
                  No central authority, no hidden agendas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">No Processor Fees</h3>
                <p className="text-zinc-400">
                  Merchants pay no payment processing fees like Stripe/PayPal. Network burn fees (0.25-5%) and Base gas apply.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">For Everyone</h3>
                <p className="text-zinc-400">
                  No KYC, no geo-restrictions, no minimums. If you have a wallet, you&apos;re in.
                  Financial inclusion for all.
                </p>
              </motion.div>
            </div>

            {/* Philosophy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-linear-to-r from-cyan-400/10 to-blue-500/10 border-2 border-cyan-400/30 rounded-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                &quot;This is not a system for the rich. This is for the forgotten and the struggling.&quot;
              </h2>
              <p className="text-zinc-400">
                VFIDE Core Philosophy
              </p>
            </motion.div>
          </div>
        </section>

        {/* Open Source */}
        <section className="py-16 bg-zinc-800">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4">Open Source & Transparent</h2>
            <p className="text-zinc-400 mb-8">
              All VFIDE smart contracts are open source, professionally audited, and deployed on public blockchains.
              Verify everything yourself.
            </p>
            <a
              href="https://github.com/Scorpio861104/Vfide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-linear-to-r from-cyan-400 to-blue-500 text-zinc-900 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              View Source Code on GitHub
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
