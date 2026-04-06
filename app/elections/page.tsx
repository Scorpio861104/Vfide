'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Vote, Shield, Users, Award, BarChart3, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface ProposalPreview {
  id: number;
  title: string;
  status?: string;
}

export default function ElectionsPage() {
  const [proposals, setProposals] = useState<ProposalPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProposals() {
      try {
        setLoading(true);
        setPreviewError(null);
        const response = await fetch('/api/proposals?status=active&limit=3');
        const data = await response.json().catch(() => ({ proposals: [] }));

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to load governance preview');
        }

        if (!cancelled) {
          setProposals(Array.isArray(data?.proposals) ? data.proposals : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to load governance preview');
          setProposals([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProposals();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300">
              <Vote size={14} /> Governance bridge
            </div>
            <h1 className="text-4xl font-bold">Council Elections</h1>
            <p className="mt-3 max-w-3xl text-gray-400">Track proposal momentum, governance participation, and council oversight from the same VFIDE decision surface.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-purple-200">Active proposals</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : proposals.length}</div>
                <div className="mt-1 text-sm text-gray-300">{loading ? 'Loading preview…' : `${proposals.length} active proposal${proposals.length === 1 ? '' : 's'}`}</div>
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Election path</div>
                <div className="mt-2 text-lg font-bold text-white">Governance → Council</div>
                <div className="mt-1 text-sm text-gray-300">Proposal review, voting, then council oversight</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-300">Participation model</div>
                <div className="mt-2 text-lg font-bold text-white">ProofScore weighted</div>
                <div className="mt-1 text-sm text-gray-300">Current governance logic remains the source of truth</div>
              </div>
            </div>

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

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
                <div className="mb-2 flex items-center gap-2 text-emerald-300"><Users size={16} /> ProofScore-weighted participation</div>
                Candidate reputation, attendance, and voting context already exist in the current governance experience; this page now adds a live proposal preview without duplicating logic.
                {previewError ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-200"><AlertCircle size={14} /> {previewError}</div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-3 flex items-center gap-2 text-cyan-300"><BarChart3 size={16} /> Current proposal snapshot</div>
                {proposals.length > 0 ? (
                  <div className="space-y-2">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                        <div className="font-semibold text-white">{proposal.title}</div>
                        <div className="text-gray-400">Status: {proposal.status ?? 'active'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
                    No live proposals were returned, so the elections route stays linked to the governance and council workspaces.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
