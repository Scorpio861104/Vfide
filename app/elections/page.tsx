'use client';

import Link from 'next/link';
import { ArrowRight, Vote, Shield, Users, Award } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

export default function ElectionsPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
              <Vote size={14} /> Uploaded elections handoff
            </div>
            <h1 className="text-4xl font-bold">Council Elections</h1>
            <p className="mt-3 max-w-3xl text-gray-400">This handoff page now points into the existing governance and council workspaces already present in the repo.</p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><Shield size={18} /></div>
                <h2 className="text-xl font-semibold">Governance Hub</h2>
                <p className="mt-2 text-sm text-gray-400">Review proposals, voting mechanics, and the live governance dashboard.</p>
                <Link href="/governance" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  Open Governance Hub <ArrowRight size={14} />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-purple-300"><Award size={18} /></div>
                <h2 className="text-xl font-semibold">Council Overview</h2>
                <p className="mt-2 text-sm text-gray-400">Jump straight to the current council and election-oriented interfaces already available in the app.</p>
                <Link href="/council" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200">
                  View Council Overview <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
              <div className="mb-2 flex items-center gap-2 text-emerald-300"><Users size={16} /> ProofScore-weighted participation</div>
              Candidate reputation, attendance, and voting context already exist in the current governance experience; this page keeps the uploaded elections path discoverable without duplicating logic.
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
