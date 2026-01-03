"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Shield, Users, Zap, Heart } from "lucide-react";
import { SurfaceCard, SectionHeading } from '@/components/ui/primitives';

export default function AboutPage() {
  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Hero */}
        <section className="py-20 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <SectionHeading
              badge="Our Story"
              title="About VFIDE"
              subtitle="A decentralized payment protocol built on integrity, not wealth. Where trust is earned through actions, not purchased with capital."
            />
          </div>
        </section>

        {/* Mission */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <SurfaceCard className="p-8 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
              <h2 className="text-3xl font-bold text-cyan-400 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-white leading-relaxed mb-4">
                VFIDE exists to create a financial system that values <strong>integrity over wealth</strong>. 
                We believe that trust should be earned through actions, not bought with money.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                Our ProofScore system rewards good behavior, community participation, and honest dealings - 
                not the size of your wallet. A user with 1 VFIDE token can have the same influence as 
                someone with 500,000 tokens if they&apos;ve demonstrated genuine trust and contribution.
              </p>
              </motion.div>
            </SurfaceCard>

            {/* Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                { icon: Shield, title: 'Non-Custodial', desc: 'Your funds live in YOUR vault. VFIDE never holds, controls, or has access to your assets. True financial sovereignty.', color: 'cyan' },
                { icon: Users, title: 'Community Governed', desc: 'Every protocol decision is made by the community through DAO governance. No central authority, no hidden agendas.', color: 'emerald' },
                { icon: Zap, title: 'No Processor Fees', desc: 'Merchants pay no payment processing fees like Stripe/PayPal. Network burn fees (0.25-5%) and Base gas apply.', color: 'amber' },
                { icon: Heart, title: 'For Everyone', desc: 'No KYC, no geo-restrictions, no minimums. If you have a wallet, you\'re in. Financial inclusion for all.', color: 'red' },
              ].map((value, idx) => (
                <SurfaceCard key={idx} interactive className="p-6">
                  <motion.div
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={`w-12 h-12 bg-${value.color}-500/20 rounded-lg flex items-center justify-center mb-4`}>
                      <value.icon className={`w-6 h-6 text-${value.color}-400`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                    <p className="text-gray-400">{value.desc}</p>
                  </motion.div>
                </SurfaceCard>
              ))}
            </div>

            {/* Philosophy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-[#00F0FF]/10 to-[#0080FF]/10 border-2 border-[#00F0FF]/30 rounded-xl p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-[#00F0FF] mb-4">
                &quot;This is not a system for the rich. This is for the forgotten and the struggling.&quot;
              </h2>
              <p className="text-[#A0A0A5]">
                VFIDE Core Philosophy
              </p>
            </motion.div>
          </div>
        </section>

        {/* Open Source */}
        <section className="py-16 bg-[#2A2A2F]">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-[#F5F3E8] mb-4">Open Source & Transparent</h2>
            <p className="text-[#A0A0A5] mb-8">
              All VFIDE smart contracts are open source, professionally audited, and deployed on public blockchains.
              Verify everything yourself.
            </p>
            <a
              href="https://github.com/Scorpio861104/Vfide"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform"
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
