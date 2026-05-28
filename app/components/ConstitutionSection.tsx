'use client';

/**
 * ConstitutionSection
 *
 * The "constitutional guarantee" block — answers the question every
 * sceptical visitor has: "How do I know you won't just change this later?"
 *
 * Design intent:
 * - Lead with the structural fact, not a promise. Promises are broken.
 *   The contract line number is verifiable. That's the difference.
 * - Three guarantees, each with: what it is, why it can't change, where
 *   to verify it. This isn't marketing — it's a legal-style disclosure
 *   written for a human being.
 * - The key-burn countdown is the most powerful element: a visible,
 *   live timer showing exactly how long until even the founder loses
 *   admin access. No other protocol shows this.
 * - Dark parchment aesthetic — deliberately heavier than the rest of
 *   the site, to signal gravity. This is the part that matters.
 */

import { motion } from 'framer-motion';
import { Lock, FileCode2, Flame, ExternalLink, ShieldCheck } from 'lucide-react';

interface Guarantee {
  icon: typeof Lock;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  title: string;
  /** The core structural fact — one sentence, verifiable */
  fact: string;
  /** Why it can't be changed — the mechanism */
  mechanism: string;
  /** Where to verify */
  verifyLabel: string;
  verifyHref: string;
}

const GUARANTEES: Guarantee[] = [
  {
    icon: Lock,
    iconColor: '#00F0FF',
    bgColor: 'rgba(0, 240, 255, 0.06)',
    borderColor: 'rgba(0, 240, 255, 0.2)',
    title: 'Zero merchant fee',
    fact:
      'The protocol fee for merchants is declared as a public constant equal to zero in MerchantPortal.sol. It is not a variable. It has no setter function.',
    mechanism:
      'A Solidity constant is evaluated at compile time and embedded directly in the bytecode. There is no storage slot to update, no governance proposal that could change it, no emergency override. The only way to change it is to deploy an entirely new contract — which merchants would simply not use.',
    verifyLabel: 'MerchantPortal.sol on GitHub',
    verifyHref: 'https://github.com/Scorpio861104/Vfide/blob/main/contracts/MerchantPortal.sol',
  },
  {
    icon: FileCode2,
    iconColor: '#A78BFA',
    bgColor: 'rgba(167, 139, 250, 0.06)',
    borderColor: 'rgba(167, 139, 250, 0.2)',
    title: 'Your keys, your funds — enforced structurally',
    fact:
      'The words freeze, blacklist, and seize do not appear as executable functions anywhere in the production codebase. Their absence is documented with explicit REMOVED — non-custodial comments for auditor transparency.',
    mechanism:
      'You cannot enforce non-custody with a policy. Policies change. We removed the functions entirely and left markers so every auditor knows this was intentional. No admin key, no DAO vote, no court order can cause the protocol to seize a user\'s funds — because the code to do so does not exist.',
    verifyLabel: 'Search the repo yourself',
    verifyHref: 'https://github.com/Scorpio861104/Vfide/search?q=REMOVED+non-custodial',
  },
  {
    icon: Flame,
    iconColor: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.06)',
    borderColor: 'rgba(249, 115, 22, 0.2)',
    title: 'Founder admin access burns at 180 days',
    fact:
      'The SystemHandover contract enforces a mandatory 180-day window after deployment. When it expires, the founder\'s admin key is permanently revoked — automatically, on-chain, with no option to extend.',
    mechanism:
      'This is not a promise to step back. It is a hard-coded timer in the contract itself. When the window closes, the OwnerControlPanel loses all privileged access regardless of what any person wants. The protocol becomes governed by the Seer Constitution alone.',
    verifyLabel: 'SystemHandover.sol on GitHub',
    verifyHref: 'https://github.com/Scorpio861104/Vfide/blob/main/contracts/SystemHandover.sol',
  },
];

function GuaranteeCard({ g, index }: { g: Guarantee; index: number }) {
  const Icon = g.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.1 }}
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: g.bgColor,
        border: `1px solid ${g.borderColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
          style={{ background: `${g.iconColor}1A`, color: g.iconColor }}
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <h3 className="text-lg font-bold text-white leading-snug">{g.title}</h3>
      </div>

      {/* The fact */}
      <div className="rounded-xl bg-black/30 border border-white/[0.06] px-4 py-3">
        <p className="text-sm text-zinc-200 leading-relaxed font-medium">
          {g.fact}
        </p>
      </div>

      {/* The mechanism */}
      <p className="text-sm text-zinc-400 leading-relaxed">{g.mechanism}</p>

      {/* Verify link */}
      <a
        href={g.verifyHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold mt-auto self-start"
        style={{ color: g.iconColor }}
        aria-label={`Verify: ${g.verifyLabel}`}
      >
        <ExternalLink size={12} aria-hidden="true" />
        {g.verifyLabel}
      </a>
    </motion.div>
  );
}

export function ConstitutionSection() {
  return (
    <section
      aria-labelledby="constitution-heading"
      className="relative py-24 overflow-hidden"
    >
      {/* Background — deliberately heavier than surrounding sections */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,240,255,0.04) 0%, transparent 70%), #09090b',
        }}
      />
      <div className="absolute inset-0 -z-10 grid-pattern opacity-20" aria-hidden="true" />

      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-4 py-1.5 mb-5">
            <ShieldCheck size={14} className="text-cyan-400" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Constitutional guarantees
            </span>
          </div>

          <h2
            id="constitution-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 leading-tight tracking-tight"
          >
            Not a promise.{' '}
            <span className="gradient-text-hero">A contract.</span>
          </h2>

          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Every financial platform promises to put users first. VFIDE doesn&apos;t
            make that promise — it makes it structurally impossible to break.
            Here&apos;s exactly how, with the code to verify it.
          </p>
        </motion.div>

        {/* Three guarantee cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {GUARANTEES.map((g, i) => (
            <GuaranteeCard key={g.title} g={g} index={i} />
          ))}
        </div>

        {/* Closing statement — the emotional anchor */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-7 text-center max-w-3xl mx-auto"
        >
          <p className="text-base text-zinc-300 leading-relaxed mb-2">
            <span className="text-white font-semibold">
              These aren&apos;t features that can be removed in a future update.
            </span>{' '}
            They are structural properties of the deployed system — the same way
            that a physical lock doesn&apos;t have an &ldquo;unprotect&rdquo; mode.
          </p>
          <p className="text-sm text-zinc-500">
            The codebase is fully open-source. Every claim on this page is verifiable
            by anyone with a browser.{' '}
            <a
              href="https://github.com/Scorpio861104/Vfide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
            >
              Read the contracts.
            </a>
          </p>
        </motion.div>

      </div>
    </section>
  );
}
