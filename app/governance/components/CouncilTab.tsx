'use client';

/**
 * CouncilTab — placeholder for a feature deferred to a future VFIDE release.
 *
 * The Council contracts (CouncilSalary, CouncilElection) live in
 * contracts/future/ — they are NOT deployed at V1 mainnet. The previous version
 * of this tab displayed fake council members behind a SampleDataBanner, which
 * was misleading: users could mistake mock entries for real on-chain governance
 * participants.
 *
 * Phase 4 Turn 4 replaces that with an honest deferral notice that:
 *   • Explains what governance looks like at V1 (direct DAO + ProofScore voting)
 *   • Describes what the council will add when it ships
 *   • Tells the user what they can do today (use the Proposals tab)
 */

import Link from 'next/link';
import { Users, ArrowRight, Info, Vote, ShieldCheck, Scale } from 'lucide-react';

export function CouncilTab() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-3xl space-y-6">
        <div className="bg-cyan-500/5 border border-accent/20 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Users size={20} className="text-cyan-400 shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">Council governance — coming soon</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                The VFIDE Council is a future-release governance layer that adds elected representatives
                to handle proposal review and emergency response. It is{' '}
                <span className="text-zinc-300">not active at V1 launch</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Vote size={16} className="text-cyan-400" />
            How governance works at V1
          </h3>
          <div className="space-y-3 text-sm text-zinc-300">
            <p>
              At V1, the DAO operates with direct ProofScore-weighted voting — no intermediate council.
              Any eligible token holder can:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 ml-2">
              <li>Submit proposals (subject to ProofScore eligibility + cooldown)</li>
              <li>Vote FOR or AGAINST any active proposal</li>
              <li>Finalize a proposal once its voting window closes</li>
              <li>Execute a passed proposal after its timelock window</li>
            </ul>
            <p className="pt-2">
              See the{' '}
              <Link href="/governance" className="text-cyan-400 hover:underline font-semibold">
                Proposals tab
              </Link>{' '}
              for currently active proposals, or the{' '}
              <Link href="/governance" className="text-cyan-400 hover:underline font-semibold">
                Create tab
              </Link>{' '}
              to submit a new one.
            </p>
          </div>
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            What the council will add
          </h3>
          <div className="space-y-3 text-sm text-zinc-300">
            <p>When the Council layer is enabled in a future release, it will provide:</p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 ml-2">
              <li>Elected representatives with on-chain accountability</li>
              <li>Faster-response paths for time-sensitive decisions</li>
              <li>Specialized roles (Chair, Security, Treasury, Community)</li>
              <li>Council salary streams tied to attendance + voting participation</li>
            </ul>
            <p className="pt-2 text-zinc-500 text-xs flex items-start gap-1">
              <Info size={11} className="shrink-0 mt-0.5" />
              <span>
                The council contracts (CouncilElection, CouncilSalary) are deferred to
                a future release and live in <code className="bg-black/30 px-1 rounded">contracts/future/</code>.
              </span>
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <Scale size={14} className="text-zinc-400" />
            Disputes &amp; arbitration at V1
          </h3>
          <p className="text-sm text-zinc-400">
            CommerceEscrow disputes are arbitrated by the full DAO via proposals (the Create tab has a
            template for resolving disputes). At V1 there is no separate council court — every disputed
            escrow goes through a standard DAO proposal vote.
          </p>
          <Link
            href="/governance"
            className="text-cyan-400 hover:underline text-sm inline-flex items-center gap-1"
          >
            View active proposals <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
}
