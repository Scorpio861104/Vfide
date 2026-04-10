'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Users, Shield, Clock, Check, Star, Award, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { SEED_CANDIDATES } from '@/lib/data/seed';

interface Candidate {
  address: string;
  name?: string;
  proofScore: number;
  voteCount: number;
  votePower: number;
  badges: string[];
  platform?: string;
  registered: boolean;
  elected: boolean;
}

interface ElectionInfo {
  councilSize: number;
  termDays: number;
  minScore: number;
  currentTermEnd: number;
  electionActive: boolean;
  totalVotes: number;
  totalVotePower: number;
}

interface ProposalPreview {
  id: number;
  title: string;
  status?: string;
}

const MOCK_ELECTION: ElectionInfo = {
  councilSize: 12, termDays: 365, minScore: 6000, currentTermEnd: 0,
  electionActive: true, totalVotes: 0, totalVotePower: 0,
};

export default function ElectionsPage() {
  const { address, isConnected } = useAccount();
  const [candidates, setCandidates] = useState<Candidate[]>(SEED_CANDIDATES.map(c => ({
    ...c, registered: true, elected: false, badges: c.badges,
  })));
  const [electionInfo] = useState<ElectionInfo>(MOCK_ELECTION);
  const [proposals, setProposals] = useState<ProposalPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [platform, setPlatform] = useState('');
  const [tab, setTab] = useState<'candidates' | 'council' | 'rules'>('candidates');

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

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  const scoreColor = (score: number) => {
    if (score >= 8000) return 'text-emerald-400';
    if (score >= 6500) return 'text-cyan-400';
    if (score >= 5000) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-2"><Vote className="text-cyan-400" />Council Elections</h1>
          <p className="text-gray-400 text-sm mb-6">Elect the {electionInfo.councilSize}-member council that governs the protocol. Votes are weighted by ProofScore.</p>

          {/* Election status */}
          <div className="p-4 bg-white/3 border border-white/10 rounded-xl mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${electionInfo.electionActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-white text-sm font-medium">{electionInfo.electionActive ? 'Election Active' : 'No Active Election'}</span>
            </div>
            <div className="text-gray-500 text-xs">
              {electionInfo.councilSize} seats · Min score: {electionInfo.minScore} · Term: {electionInfo.termDays} days
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
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

          <div className="grid gap-4 md:grid-cols-2 mb-6">
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

          {previewError ? (
            <div className="mb-6 inline-flex items-center gap-2 text-xs text-amber-200"><AlertCircle size={14} /> {previewError}</div>
          ) : null}

          {/* Tabs */}
          <div className="flex gap-1.5 mb-6">
            {([
              { id: 'candidates' as const, label: 'Candidates', icon: <Users size={14} /> },
              { id: 'council' as const, label: 'Current Council', icon: <Award size={14} /> },
              { id: 'rules' as const, label: 'Rules', icon: <Shield size={14} /> },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold ${tab === t.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── CANDIDATES TAB ──────────────────────────────── */}
          {tab === 'candidates' && (
            <div className="space-y-4">
              {/* Register as candidate */}
              {isConnected && (
                <button onClick={() => setShowRegister(!showRegister)}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-white/3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
                  <Star size={16} />Register as Candidate
                </button>
              )}

              <AnimatePresence>
                {showRegister && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
                    <p className="text-gray-400 text-sm">Stand for election. You need ProofScore ≥ {electionInfo.minScore} to register. Your platform statement is visible to all voters.</p>
                    <textarea value={platform} onChange={e =>  setPlatform(e.target.value)} placeholder="Your platform: what will you do for the VFIDE community?"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm h-24 resize-none focus:border-cyan-500/50 focus:outline-none" />
                    <div className="flex gap-3">
                      <button onClick={() => setShowRegister(false)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-400 font-bold rounded-xl text-sm">Cancel</button>
                      <button disabled={!platform.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl text-sm disabled:opacity-30">Register</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {candidates.length === 0 ? (
                <div className="text-center py-16">
                  <Vote size={48} className="mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400 mb-1">No candidates registered yet</p>
                  <p className="text-gray-600 text-xs">Be the first to register and shape VFIDE&apos;s future</p>
                </div>
              ) : (
                candidates.sort((a, b) => b.votePower - a.votePower).map((c, rank) => (
                  <div key={c.address} className={`p-4 border rounded-2xl ${rank < electionInfo.councilSize ? 'bg-emerald-500/3 border-emerald-500/15' : 'bg-white/3 border-white/10'}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCandidate(expandedCandidate === c.address ? null : c.address)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                          #{rank + 1}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{c.name || shortAddr(c.address)}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`flex items-center gap-0.5 ${scoreColor(c.proofScore)}`}><Shield size={10} />{c.proofScore}</span>
                            <span className="text-gray-500">{c.voteCount} votes · {c.votePower.toLocaleString()} power</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rank < electionInfo.councilSize && <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-bold">Winning</span>}
                        {expandedCandidate === c.address ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedCandidate === c.address && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="mt-3 pt-3 border-t border-white/5 space-y-3">
                          {c.platform && <p className="text-gray-400 text-sm">{c.platform}</p>}
                          {c.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {c.badges.map(b => <span key={b} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">{b}</span>)}
                            </div>
                          )}
                          <p className="text-gray-600 text-xs font-mono">{c.address}</p>
                          {isConnected && !hasVoted && (
                            <button className="w-full py-2.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                              <Vote size={14} />Vote for this candidate
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── CURRENT COUNCIL TAB ────────────────────────── */}
          {tab === 'council' && (
            <div className="text-center py-16">
              <Award size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-1">No council elected yet</p>
              <p className="text-gray-600 text-xs">The first council will be elected after the protocol launches and enough users build ProofScore</p>
            </div>
          )}

          {/* ── RULES TAB ─────────────────────────────────── */}
          {tab === 'rules' && (
            <div className="space-y-4">
              {[
                { title: 'Council Size', value: `${electionInfo.councilSize} members`, desc: 'Elected by ProofScore-weighted community vote' },
                { title: 'Term Length', value: '1 year', desc: 'Fixed. Cannot be changed by governance.' },
                { title: 'Term Limits', value: '1 consecutive term', desc: 'Must wait 1 year before re-election. Prevents entrenchment.' },
                { title: 'Minimum Score', value: `${electionInfo.minScore} ProofScore`, desc: 'Candidates must have proven trust in the system' },
                { title: 'Vote Weight', value: 'ProofScore-based', desc: 'Your vote power equals your ProofScore. Not token balance.' },
                { title: 'Community Veto', value: '100 votes', desc: 'Any council proposal can be blocked by 100 community members' },
                { title: 'Council Pay', value: 'Fee-funded', desc: '15% of all protocol fees go to DAO payroll. Work-proportional via ServicePool.' },
                { title: 'After Handover', value: 'Dev key burns', desc: 'SystemHandover transfers control to the council. The creator key burns to address(0). Irreversible.' },
              ].map(rule => (
                <div key={rule.title} className="p-4 bg-white/3 border border-white/10 rounded-xl">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white text-sm font-medium">{rule.title}</span>
                    <span className="text-cyan-400 text-sm font-bold">{rule.value}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{rule.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
