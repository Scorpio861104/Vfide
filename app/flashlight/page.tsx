'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flashlight,
  Gavel,
  Scale,
  Shield,
  Users,
  Wallet,
} from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

const highlights = [
  {
    title: 'Peer-to-peer credit lanes',
    description: 'Borrow directly from other users with transparent pricing and no pooled yield promises.',
    icon: <Users className="w-4 h-4" />,
  },
  {
    title: 'Escrow-backed repayment',
    description: 'Repayments route through escrow with DAO arbitration and clear release milestones.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    title: 'Interest only when used',
    description: 'Flashlight interest accrues on drawn balance only, so unused credit stays free.',
    icon: <Flashlight className="w-4 h-4" />,
  },
]

const fairnessRules = [
  {
    title: 'No passive income claims',
    detail: 'Rates are negotiated by borrowers and lenders. VFIDE does not promise returns or profits.',
    icon: <Scale className="w-4 h-4" />,
  },
  {
    title: 'DAO dispute arbitration',
    detail: 'Escalations auto-route to the DAO hub with evidence packs and voting trails.',
    icon: <Gavel className="w-4 h-4" />,
  },
  {
    title: 'Time-boxed settlement',
    detail: 'Timeouts protect both sides with automatic release or refund windows.',
    icon: <Clock className="w-4 h-4" />,
  },
]

const steps = [
  {
    title: 'Borrower requests a flashlight line',
    detail: 'Select amount, term, and a trusted lender. ProofScore helps price the lane.',
  },
  {
    title: 'Lender approves terms',
    detail: 'Funds move into escrow with clear milestones and an arbitration fallback.',
  },
  {
    title: 'Repayment closes the lane',
    detail: 'Repayments release escrow automatically. Disputes route to the DAO hub.',
  },
]

export default function FlashlightPage() {
  return (
    <>
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0e111f] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,153,102,0.16),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,240,255,0.12),transparent_50%)]" />
      </div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        <section className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-200">
              <Flashlight className="w-4 h-4" />
              Flashlight P2P Credit
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-black text-white">
              Flashlight Borrowing, Built on Trust
            </h1>
            <p className="mt-3 text-lg text-zinc-400">
              A peer-to-peer credit lane where borrowers and lenders agree on terms, interest, and escrow protections.
              No pooled returns. No hidden yield promises. Just transparent, verifiable settlement.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button className="rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 px-6 py-2 text-sm font-semibold text-zinc-900 shadow-lg shadow-cyan-500/20">
                Request Flashlight Line
              </button>
              <button className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-sm font-semibold text-white">
                Offer Liquidity
              </button>
            </div>
          </motion.div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-amber-200 font-semibold">
                  {item.icon}
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-cyan-200 font-semibold">
                <Wallet className="w-4 h-4" />
                How Flashlight Works
              </div>
              <div className="mt-6 space-y-4">
                {steps.map((step, index) => (
                  <div key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3 text-white font-semibold">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-200">
                        {index + 1}
                      </span>
                      {step.title}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-amber-200 font-semibold">
                <Scale className="w-4 h-4" />
                Fairness & Compliance
              </div>
              <div className="mt-6 space-y-4">
                {fairnessRules.map((rule) => (
                  <div key={rule.title} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2 text-amber-100 font-semibold">
                      {rule.icon}
                      {rule.title}
                    </div>
                    <p className="mt-2 text-xs text-zinc-300">{rule.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Howey-safe positioning
                </div>
                <p className="mt-2 text-emerald-100/80">
                  Flashlight is a peer-to-peer credit tool. VFIDE does not market profit expectations, pool user funds,
                  or promise returns. Participants set their own terms and remain responsible for local compliance.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-white font-semibold">Ready to deploy Flashlight lanes?</div>
                <p className="text-sm text-zinc-400">
                  Use escrow defaults for new partners, and graduate to instant lanes for trusted repeat borrowers.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-semibold text-white">
                View DAO Arbitration Hub
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </motion.main>
      <Footer />
    </>
  )
}
