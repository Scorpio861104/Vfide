'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertCircle, ArrowRight, Check, Clock, Handshake, Scale, ShieldCheck, Users, X } from 'lucide-react';

export interface PeerMediationDispute {
  id: string;
  buyerAddress: string;
  merchantAddress: string;
  amount: string;
  reason: string;
  status: 'open' | 'mediating' | 'resolved' | 'escalated';
  mediatorName?: string;
  proposedResolution?: string;
  proposedSplit?: { buyerPercent: number; merchantPercent: number };
  mediationDeadline?: number;
}

interface PeerMediationProps {
  dispute?: Partial<PeerMediationDispute>;
  userRole?: 'buyer' | 'merchant' | 'mediator';
  onAcceptMediation?: () => void;
  onAcceptResolution?: () => void;
  onRejectResolution?: () => void;
  onEscalate?: () => void;
}

const mediationSteps = [
  'Confirm the order details and expected resolution with both sides.',
  'Offer merchant correction first: refund, exchange, or store credit.',
  'Escalate to formal appeals only if peer mediation does not resolve the case.',
];

const DEFAULT_DISPUTE: PeerMediationDispute = {
  id: 'preview-case',
  buyerAddress: '0x7a12...42ef',
  merchantAddress: '0x1fd0...90ab',
  amount: '250',
  reason: 'Return request pending review',
  status: 'open',
  mediatorName: 'Market elder',
  proposedSplit: { buyerPercent: 50, merchantPercent: 50 },
  mediationDeadline: Date.now() + (24 * 60 * 60 * 1000),
};

const shortAddress = (value: string) => value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

export default function PeerMediation({
  dispute,
  userRole = 'merchant',
  onAcceptMediation,
  onAcceptResolution,
  onRejectResolution,
  onEscalate,
}: PeerMediationProps) {
  const currentDispute = useMemo<PeerMediationDispute>(() => ({
    ...DEFAULT_DISPUTE,
    ...dispute,
    proposedSplit: dispute?.proposedSplit ?? DEFAULT_DISPUTE.proposedSplit,
  }), [dispute]);

  const hoursRemaining = currentDispute.mediationDeadline
    ? Math.max(0, Math.floor((currentDispute.mediationDeadline - Date.now()) / (1000 * 60 * 60)))
    : 0;

  const statusClass = {
    open: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    mediating: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
    resolved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    escalated: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  }[currentDispute.status];

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            <Handshake size={14} /> Peer mediation
          </div>
          <h3 className="text-xl font-semibold text-white">Resolve simple disputes before escalation</h3>
          <p className="mt-2 text-sm text-gray-300">
            This mediation-first flow keeps buyer and merchant disputes lightweight, faster, and cheaper before formal review is needed.
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
          <Scale size={14} /> {currentDispute.status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-gray-400">Case</div>
          <div className="mt-1 font-semibold text-white">#{currentDispute.id.slice(0, 8)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-gray-400">Buyer</div>
          <div className="mt-1 font-semibold text-white">{shortAddress(currentDispute.buyerAddress)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-gray-400">Merchant</div>
          <div className="mt-1 font-semibold text-white">{shortAddress(currentDispute.merchantAddress)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-gray-400">Amount</div>
          <div className="mt-1 font-semibold text-white">{currentDispute.amount} VFIDE</div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300 space-y-2">
        <div className="flex items-center gap-2 text-purple-200"><Users size={16} /> Reason: {currentDispute.reason}</div>
        {currentDispute.mediatorName ? (
          <div className="flex items-center gap-2 text-cyan-200"><ShieldCheck size={16} /> Mediator: {currentDispute.mediatorName}</div>
        ) : null}
        {hoursRemaining > 0 ? (
          <div className="flex items-center gap-2 text-amber-200"><Clock size={16} /> {hoursRemaining}h left in the peer-review window</div>
        ) : (
          <div className="flex items-center gap-2 text-amber-200"><AlertCircle size={16} /> Mediation can still escalate if no agreement lands.</div>
        )}
      </div>

      <ul className="space-y-2 text-sm text-gray-300">
        {mediationSteps.map((step) => (
          <li key={step} className="flex items-start gap-2">
            <ShieldCheck size={16} className="mt-0.5 text-emerald-300" />
            <span>{step}</span>
          </li>
        ))}
      </ul>

      {currentDispute.proposedResolution ? (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-gray-200">
          <div className="font-semibold text-white">Mediator proposal</div>
          <p className="mt-2">{currentDispute.proposedResolution}</p>
          {currentDispute.proposedSplit ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">Buyer {currentDispute.proposedSplit.buyerPercent}%</span>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-amber-200">Merchant {currentDispute.proposedSplit.merchantPercent}%</span>
            </div>
          ) : null}
          {(userRole === 'buyer' || userRole === 'merchant') ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onAcceptResolution} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100">
                <Check size={14} /> Accept proposal
              </button>
              <button onClick={onRejectResolution} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 font-semibold text-rose-100">
                <X size={14} /> Reject and review
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button onClick={onAcceptMediation} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">
          Start peer review <ArrowRight size={14} />
        </button>
        <button onClick={onEscalate} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
          Escalate to appeals <ArrowRight size={14} />
        </button>
        <Link href="/merchant/returns" className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
          Merchant returns <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
