'use client';

/**
 * PlainEnglishCard — the "what does this mean?" translator.
 *
 * Three proper nouns (ProofScore, Guardian, Sanctum) appear all over
 * the marketing site and the product itself. New visitors don't know
 * what any of them are, and a hero that uses them without translation
 * reads as opaque jargon. This card defines each one in a single,
 * concrete sentence — placed directly under the hero so the rest of
 * the page becomes readable.
 *
 * Design constraints:
 *  - One line per term. If you need two lines, the term is too vague.
 *  - No protocol-internal language ("epoch", "tier", "burn rate").
 *  - No returns/yield/investment vocabulary (Howey-compliant).
 *  - Plain English first, proper noun in parens or after a colon.
 */

import { motion } from 'framer-motion';
import { Trophy, Shield, LifeBuoy } from 'lucide-react';

const TERMS = [
  {
    icon: Trophy,
    name: 'ProofScore',
    plain:
      'Your reputation score, earned by completing real transactions honestly. The higher it is, the lower your fees.',
    color: '#FFD700',
  },
  {
    icon: Shield,
    name: 'Guardian',
    plain:
      'A trusted contact who can help you recover access if you lose your wallet — never custodian of your funds.',
    color: '#00F0FF',
  },
  {
    icon: LifeBuoy,
    name: 'Sanctum',
    plain:
      'A protocol-level charity and impact fund. 20% of every transaction fee flows here and is disbursed — on-chain, transparently — to DAO-approved charitable organisations worldwide.',
    color: '#A78BFA',
  },
] as const;

export function PlainEnglishCard() {
  return (
    <section
      aria-labelledby="plain-english-heading"
      className="border-y border-white/5 bg-zinc-950/40 py-12"
    >
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            New here? Start with this.
          </p>
          <h2
            id="plain-english-heading"
            className="text-2xl font-bold text-white sm:text-3xl"
          >
            VFIDE in plain English
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TERMS.map((term, i) => {
            const Icon = term.icon;
            return (
              <motion.div
                key={term.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${term.color}1A`,
                      color: term.color,
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-white">{term.name}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {term.plain}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
