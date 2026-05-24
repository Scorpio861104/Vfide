'use client';

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Users, Zap, Heart, ArrowRight, Globe, Lock, Flame, Vote } from "lucide-react";

const PRINCIPLES = [
  {
    icon: Zap,
    color: "#FFD700",
    title: "Zero merchant fees",
    body: "Sellers keep 100% of every sale. Buyers pay a trust fee that shrinks as their ProofScore grows — the protocol rewards honest behaviour with cheaper transactions.",
  },
  {
    icon: Lock,
    color: "#22d3ee",
    title: "You hold the keys",
    body: "Non-custodial by design. Your tokens live in your CardBound Vault, controlled by your wallet. VFIDE never holds, touches, or can freeze your funds.",
  },
  {
    icon: Shield,
    color: "#00FF88",
    title: "Guardian-assisted recovery",
    body: "Lose access to your wallet? Guardians you trust can help rotate your vault credentials — without ever gaining custody of your funds.",
  },
  {
    icon: Heart,
    color: "#ec4899",
    title: "The Sanctum Fund",
    body: "20% of every buyer fee goes directly into a protocol-level charity and emergency grant pool — not to VFIDE the company, but to the community it serves.",
  },
  {
    icon: Vote,
    color: "#a78bfa",
    title: "The Seer Constitution",
    body: "Users have enumerated, immutable rights baked into the protocol: the right to recovery, the right to contest fraud, the right to privacy. Not a terms-of-service — an on-chain guarantee.",
  },
  {
    icon: Flame,
    color: "#f97316",
    title: "The key burn",
    body: "Six months after mainnet launch, the developer master key is permanently destroyed. No admin backdoor, no upgrade path — the protocol becomes truly ownerless.",
  },
];

const REGIONS = [
  { flag: "🇬🇭", name: "Accra", detail: "Mobile-money native. No bank account needed." },
  { flag: "🇦🇪", name: "Dubai", detail: "Crypto-forward. Low remittance costs." },
  { flag: "🇨🇴", name: "Medellín", detail: "Underbanked population. High USD demand." },
  { flag: "🇳🇬", name: "Lagos", detail: "Largest economy in Africa. Unmet fintech need." },
  { flag: "🇮🇳", name: "Mumbai", detail: "World's largest remittance recipient." },
  { flag: "🇵🇭", name: "Manila", detail: "10M+ OFWs sending money home monthly." },
];

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden text-white">
        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        {/* Hero */}
        <section className="relative pt-20 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs uppercase tracking-widest text-cyan-300 mb-6">
                <Globe size={12} /> Built for the world's 1.4 billion unbanked
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6">
                Money should work<br />
                <span className="text-transparent bg-clip-text" style={{
                  backgroundImage: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)"
                }}>for everyone.</span>
              </h1>
              <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                VFIDE is a self-custodial payments and commerce protocol built on Base. 
                It exists because billions of people have been failed by traditional financial systems — 
                through extraction, exclusion, and gatekeeping.
              </p>
            </motion.div>
          </div>
        </section>

        {/* The problem */}
        <section className="py-16 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl font-bold mb-6">The problem we're solving</h2>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                {[
                  { stat: "2.6%+", label: "Average payment processor fee", sub: "Stripe, Square, PayPal — merchants absorb it or pass it on." },
                  { stat: "$45B", label: "Lost to remittance fees annually", sub: "Families sending money home pay 6–10% just to move their own money." },
                  { stat: "1.4B", label: "Adults without a bank account", sub: "Excluded not by choice — by geography, documentation, or poverty." },
                ].map((item) => (
                  <div key={item.stat} className="glass-card-premium p-6">
                    <div className="text-4xl font-black text-cyan-400 mb-2">{item.stat}</div>
                    <div className="font-semibold text-white mb-1">{item.label}</div>
                    <div className="text-zinc-400">{item.sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Principles */}
        <section className="py-16 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-10">How we're different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {PRINCIPLES.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="glass-card-premium p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                        <Icon size={20} style={{ color: p.color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">{p.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">{p.body}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who we're building for */}
        <section className="py-16 px-4 border-t border-white/5">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-4">Who we're building for</h2>
            <p className="text-zinc-400 mb-10 max-w-2xl">
              Not for the Silicon Valley engineer with five bank accounts. For the street vendor in Accra who can't get a merchant account. For the OFW in Manila sending money home. For the freelancer in Medellín who gets hit with 8% on every dollar they earn.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {REGIONS.map((r) => (
                <div key={r.name} className="glass-card-premium p-4">
                  <div className="text-3xl mb-2">{r.flag}</div>
                  <div className="font-semibold text-white">{r.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 border-t border-white/5 text-center">
          <div className="container mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">Ready to see it in action?</h2>
            <p className="text-zinc-400 mb-8">Testnet is live. Connect a wallet and explore the protocol with no real funds.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/testnet" className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors">
                Try testnet <ArrowRight size={16} />
              </Link>
              <Link href="/docs" className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 hover:border-white/20 text-white rounded-xl transition-colors">
                Read the docs
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
