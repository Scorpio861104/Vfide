'use client';

/**
 * ElectionsTabContent — the Elections page content extracted as a
 * reusable component for embedding inside the Governance hub.
 */

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Users, Shield, Star, Award, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import { isConfiguredContractAddress, ZERO_ADDRESS } from '@/lib/contracts';
import { CouncilElectionABI } from '@/lib/abis/future';


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

const DEFAULT_ELECTION: ElectionInfo = {
  councilSize: 12, termDays: 365, minScore: 7000, currentTermEnd: 0,
  electionActive: true, totalVotes: 0, totalVotePower: 0,
};

const COUNCIL_ELECTION_ADDRESS = ZERO_ADDRESS;

export function ElectionsTabContent() {
  const { isConnected } = useAccount();
  const [candidates] = useState<Candidate[]>([]);
  const [proposals, setProposals] = useState<ProposalPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  const { data: electionInfoData } = useReadContract({
    address: COUNCIL_ELECTION_ADDRESS as `0x${string}`,
    abi: CouncilElectionABI,
    functionName: 'getElectionInfo',
    query: { enabled: isConfiguredContractAddress(COUNCIL_ELECTION_ADDRESS) },
  });

  const electionInfo: ElectionInfo = electionInfoData
    ? {
        councilSize: Number((electionInfoData as any)[0] ?? 12),
        termDays: Number((electionInfoData as any)[1] ?? 365),
        minScore: Number((electionInfoData as any)[2] ?? 7000),
        currentTermEnd: Number((electionInfoData as any)[3] ?? 0),
        electionActive: Boolean((electionInfoData as any)[4] ?? true),
        totalVotes: Number((electionInfoData as any)[5] ?? 0),
        totalVotePower: Number((electionInfoData as any)[6] ?? 0),
      }
    : DEFAULT_ELECTION;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/proposals?limit=5')
      .then((r) => r.json())
      .then((data: { proposals?: ProposalPreview[] }) => {
        if (!cancelled) {
          setProposals(Array.isArray(data?.proposals) ? data.proposals.slice(0, 5) : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : 'Failed to load proposals');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const termEndDate = electionInfo.currentTermEnd > 0
    ? new Date(electionInfo.currentTermEnd * 1000).toLocaleDateString()
    : 'TBD';

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Council Size',    value: electionInfo.councilSize,                      color: 'text-violet-400'  },
          { label: 'Term Length',     value: `${electionInfo.termDays}d`,                   color: 'text-cyan-400'    },
          { label: 'Min ProofScore',  value: electionInfo.minScore.toLocaleString(),         color: 'text-amber-400'   },
          { label: 'Term End',        value: termEndDate,                                    color: 'text-emerald-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="analytics-card p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-white/40 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Election status */}
      <div className={`glass-card-premium p-5 border ${
        electionInfo.electionActive
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-zinc-700/40'
      }`}>
        <div className="flex items-center gap-3">
          <Vote className={electionInfo.electionActive ? 'text-emerald-400' : 'text-zinc-500'} size={20} />
          <div>
            <div className="font-semibold text-white">
              {electionInfo.electionActive ? 'Election Active' : 'No Active Election'}
            </div>
            <div className="text-sm text-white/40">
              {electionInfo.electionActive
                ? `${electionInfo.totalVotes} votes cast — ${electionInfo.totalVotePower.toLocaleString()} total voting power`
                : 'Next election will begin when the current term ends.'}
            </div>
          </div>
        </div>
      </div>

      {/* Candidates */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-violet-400" /> Registered Candidates
        </h3>
        {candidates.length === 0 ? (
          <div className="glass-card-premium p-8 text-center">
            <Users size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white/50">No candidates registered yet.</p>
            <p className="text-sm text-white/30 mt-1">
              Candidates with ProofScore ≥ {electionInfo.minScore.toLocaleString()} can register when an election opens.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <div key={c.address} className="glass-card-premium p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <Users size={16} className="text-violet-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{c.name ?? c.address.slice(0, 10) + '…'}</div>
                      <div className="text-xs text-white/40">ProofScore: {c.proofScore.toLocaleString()}</div>
                    </div>
                  </div>
                  <button onClick={() => setExpandedCandidate(expandedCandidate === c.address ? null : c.address)}
                    className="text-white/40 hover:text-white/70 transition-colors">
                    {expandedCandidate === c.address ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                <AnimatePresence>
                  {expandedCandidate === c.address && c.platform && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-white/10 text-sm text-white/60">
                      {c.platform}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent proposals preview */}
      {previewError ? (
        <div className="flex items-center gap-2 text-sm text-amber-300">
          <AlertCircle size={14} /> {previewError}
        </div>
      ) : !loading && proposals.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield size={18} className="text-cyan-400" /> Recent Proposals
          </h3>
          <div className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="glass-card-premium p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star size={13} className="text-violet-400 shrink-0" />
                  <span className="text-sm text-white/80">{p.title}</span>
                </div>
                {p.status && (
                  <span className="text-xs text-white/40 shrink-0">{p.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="glass-card-premium p-6 text-center border border-white/10">
          <Award className="mx-auto mb-3 text-violet-400" size={32} />
          <p className="text-white/70 mb-2">Connect your wallet to register as a candidate or vote.</p>
          <p className="text-sm text-white/40">Minimum ProofScore of {electionInfo.minScore.toLocaleString()} required to run.</p>
        </div>
      )}
    </div>
  );
}
