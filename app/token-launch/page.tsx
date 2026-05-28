'use client';

import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, Wallet } from "lucide-react";

export default function TokenLaunchPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative flex flex-col">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.08]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <div className="relative flex-1 flex items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-lg"
          >
            <div className="badge-live mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Token Distribution
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-violet-500/20 border border-accent/30 flex items-center justify-center mx-auto mb-6">
              <Zap size={36} className="text-accent" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-accent to-violet-400 bg-clip-text text-transparent">
                VFIDE Token Launch
              </span>
            </h1>
            <p className="text-gray-300 text-lg mb-4">
              The VFIDE token is now available through the treasury. Token distribution
              is managed directly.
            </p>
            <p className="text-gray-400 mb-10">
              Head to your vault or the DEX to acquire VFIDE and start building
              your on-chain reputation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/vault" className="btn-premium-primary flex items-center gap-2 justify-center">
                <Wallet size={16} /> Open Vault
              </Link>
              <Link href="/" className="btn-premium-ghost flex items-center gap-2 justify-center">
                Back to Home <ArrowRight size={15} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}
