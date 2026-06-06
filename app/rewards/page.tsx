'use client'

// Token rewards are not available in this protocol.
// VFIDE is a governance utility token only — there are no referral bonuses,
// merchant incentives, lock bonuses, or any other profit-distribution mechanisms.

import { Footer } from '@/components/layout/Footer'
import { m as motion } from 'framer-motion'
import { Shield, Vote, Coins, Info, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale/LocaleProvider';

const WHAT_YOU_GET = [
  {
    icon: Vote,
    title: 'Governance Voting Rights',
    description: 'Participate in DAO proposals and shape the direction of the protocol.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: Coins,
    title: 'Protocol Access',
    description: 'Use VFIDE tokens to pay commerce fees, vault fees, and access premium features.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    icon: Shield,
    title: 'Governance Duty Points',
    description: 'Non-transferable participation tracking that reflects your protocol contribution — not profit.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

export default function RewardsPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden flex flex-col"
      >
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08), transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 -right-24 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.06), transparent 65%)', filter: 'blur(70px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 py-16 relative z-10">
          <div className="max-w-2xl w-full space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-premium p-8 md:p-10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Shield size={24} className="text-violet-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">No Token Rewards</h1>
                  <p className="text-zinc-500 text-sm">By design — for your protection</p>
                </div>
              </div>

              <p className="text-zinc-300 leading-relaxed mb-6">
                VFIDE is a governance utility token. There are no referral bonuses,
                merchant incentives, lock bonuses, or any other profit-distribution
                mechanisms — by design, to ensure VFIDE is not classified as a
                security under the Howey Test.
              </p>

              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">What You Do Get</h2>
              <div className="space-y-3">
                {WHAT_YOU_GET.map((item) => (
                  <div key={item.title} className="analytics-card p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.bg}`}>
                      <item.icon size={16} className={item.color} />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm mb-0.5">{item.title}</div>
                      <div className="text-xs text-zinc-500">{item.description}</div>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5 ml-auto" />
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="analytics-card p-5 border border-blue-500/20 bg-blue-500/5"
            >
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-sm mb-1">Why no rewards?</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Referral bonuses, merchant incentives, and yield create an expectation
                    of profits from the efforts of others — the third and fourth prongs of
                    the Howey Test. VFIDE deliberately omits all such mechanisms so that
                    holding or using the token cannot be construed as an investment contract.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex gap-3"
            >
              <Link href="/governance" className="btn-premium-primary flex items-center gap-2 flex-1 justify-center">
                Go to Governance <ArrowRight size={15} />
              </Link>
              <Link href="/docs" className="btn-premium-ghost flex items-center gap-2 flex-1 justify-center">
                Read the Docs
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.main>
      <Footer />
    </>
  )
}
