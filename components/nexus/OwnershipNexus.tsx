'use client';

/**
 * OwnershipNexus — VFIDE's signature visual (Wave 40).
 *
 * A radial ownership network: the PARTICIPANT sits at the center; the seven institutions orbit
 * around them, connected by spokes (center → institution) and a continuity ring (institution →
 * institution, the feedback loop that returns to ownership). The ecosystem serves the individual,
 * never the reverse.
 *
 * Dynamic, not gamified: each node reflects what the participant has ACTUALLY established, read from
 * real state (useProofScore / useTrustStatus / useContinuityStatus / useMerchantHealth). Established
 * nodes are solid and connected; not-yet nodes are quiet outlines. The goal is visibility of what
 * exists — not progression, levels, or unlocks.
 *
 * Aesthetic: institutional infrastructure (mission-control / network map), not skill tree / fantasy.
 * Motion is slow, intentional, and meaning-bearing (connections draw in; established nodes breathe).
 *
 * Interactive: select any node to expand its sub-systems with their real states and links.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import {
  Wallet, ShieldCheck, Store, Heart, Landmark, GraduationCap, Lock,
  User, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { useProofScore } from '@/hooks/useProofScore';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';

type NodeState = 'established' | 'forming' | 'open';

interface SubSystem {
  label: string;
  href: string;
  established: boolean;
}

interface NexusNode {
  id: string;
  label: string;
  /** Established-state verb, e.g. "Recovery Ready". */
  establishedLabel: string;
  color: string;
  icon: LucideIcon;
  href: string;
  state: NodeState;
  subsystems: SubSystem[];
}

// Geometry — a 1000×1000 viewBox, center node + ring of institutions.
const VB = 1000;
const C = VB / 2;
const RING_R = 340; // institution orbit radius
const NODE_R = 58; // institution node radius
const CENTER_R = 92; // participant node radius

function polar(i: number, n: number): { x: number; y: number; angle: number } {
  // Start at top (-90°) and go clockwise.
  const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
  return { x: C + RING_R * Math.cos(angle), y: C + RING_R * Math.sin(angle), angle };
}

export function OwnershipNexus() {
  const ps = useProofScore();
  const c = useContinuityStatus();
  const mh = useMerchantHealth();
  const [selected, setSelected] = useState<string | null>(null);

  const nodes: NexusNode[] = useMemo(() => {
    const recoveryReady = c.recoveryConfigured;
    const protectionEstablished = c.recoveryConfigured && c.guardianCount > 0;
    const continuityPlanned = c.inheritanceConfigured;
    const merchantActive = mh.isMerchant;
    const governanceActive = !!ps.canVote;
    const trustForming = !ps.isDisconnected && ps.score != null;
    const ownershipEstablished = !ps.isDisconnected; // vault/identity present once connected

    const mk = (established: boolean, forming = false): NodeState =>
      established ? 'established' : forming ? 'forming' : 'open';

    return [
      {
        id: 'ownership', label: 'Ownership', establishedLabel: 'Vault established',
        color: '#8B5CF6', icon: Wallet, href: '/vault', state: mk(ownershipEstablished),
        subsystems: [
          { label: 'Assets', href: '/wallet', established: ownershipEstablished },
          { label: 'Vaults', href: '/vault', established: ownershipEstablished },
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Inheritance', href: '/inheritance', established: continuityPlanned },
        ],
      },
      {
        id: 'trust', label: 'Trust', establishedLabel: 'Trust record forming',
        color: '#06B6D4', icon: ShieldCheck, href: '/proofscore', state: mk(false, trustForming),
        subsystems: [
          { label: 'Participation', href: '/proofscore', established: trustForming },
          { label: 'Verification', href: '/proofscore', established: merchantActive },
          { label: 'History', href: '/proofscore', established: trustForming },
          { label: 'Opportunity', href: '/headhunter', established: governanceActive },
        ],
      },
      {
        id: 'commerce', label: 'Commerce', establishedLabel: 'Merchant activated',
        color: '#10B981', icon: Store, href: '/merchant', state: mk(merchantActive),
        subsystems: [
          { label: 'Payments', href: '/merchant/payment-links', established: merchantActive },
          { label: 'Customers', href: '/merchant/customers', established: merchantActive },
          { label: 'Invoices', href: '/merchant/invoices', established: merchantActive },
          { label: 'Subscriptions', href: '/merchant/subscriptions', established: false },
        ],
      },
      {
        id: 'continuity', label: 'Continuity', establishedLabel: 'Continuity planned',
        color: '#EC4899', icon: Heart, href: '/continuity', state: mk(continuityPlanned, c.configuredCount > 0),
        subsystems: [
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Contacts', href: '/guardians', established: c.guardianCount > 0 },
          { label: 'Succession', href: '/inheritance', established: continuityPlanned },
          { label: 'Emergency Planning', href: '/security-center', established: protectionEstablished },
        ],
      },
      {
        id: 'governance', label: 'Governance', establishedLabel: 'Eligible to participate',
        color: '#6366F1', icon: Landmark, href: '/governance', state: mk(governanceActive),
        subsystems: [
          { label: 'Proposals', href: '/governance', established: governanceActive },
          { label: 'Council', href: '/governance', established: false },
          { label: 'Voting', href: '/governance', established: governanceActive },
          { label: 'Treasury', href: '/governance', established: governanceActive },
        ],
      },
      {
        id: 'knowledge', label: 'Knowledge', establishedLabel: 'Guidance available',
        color: '#F59E0B', icon: GraduationCap, href: '/seer-academy', state: mk(false, true),
        subsystems: [
          { label: 'In-context guidance', href: '/continuity', established: true },
          { label: 'Knowledge Library', href: '/seer-academy', established: true },
          { label: 'VFIDE Explained', href: '/', established: true },
          { label: 'Reference', href: '/seer-academy', established: true },
        ],
      },
      {
        id: 'protection', label: 'Protection', establishedLabel: 'Protection established',
        color: '#3B82F6', icon: Lock, href: '/security-center', state: mk(protectionEstablished, c.guardianCount > 0),
        subsystems: [
          { label: 'Guardians', href: '/guardians', established: c.guardianCount > 0 },
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Security Center', href: '/security-center', established: protectionEstablished },
          { label: 'Emergency Lock', href: '/security-center', established: protectionEstablished },
        ],
      },
    ];
  }, [ps, c, mh]);

  const positioned = nodes.map((node, i) => ({ node, ...polar(i, nodes.length) }));
  const establishedCount = nodes.filter((n) => n.state === 'established').length;
  const selectedNode = selected ? nodes.find((n) => n.id === selected) ?? null : null;

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full">
        {/* The diagram */}
        <div className="relative mx-auto w-full max-w-3xl">
          <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="The ownership network — the participant at the center of seven connected institutions">
            <defs>
              <radialGradient id="nexus-center-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
              {nodes.map((n) => (
                <radialGradient key={n.id} id={`g-${n.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={n.color} stopOpacity={n.state === 'established' ? 0.28 : 0.1} />
                  <stop offset="100%" stopColor={n.color} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* Continuity ring — the feedback loop connecting institutions (returns to ownership) */}
            <m.circle
              cx={C} cy={C} r={RING_R}
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />

            {/* Spokes: center → each institution */}
            {positioned.map(({ node, x, y }, i) => {
              const active = node.state !== 'open';
              return (
                <m.line
                  key={`spoke-${node.id}`}
                  x1={C} y1={C} x2={x} y2={y}
                  stroke={active ? node.color : 'rgba(255,255,255,0.08)'}
                  strokeOpacity={active ? 0.4 : 1}
                  strokeWidth={active ? 2 : 1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.1, delay: 0.3 + i * 0.12, ease: 'easeOut' }}
                />
              );
            })}

            {/* Center: THE INDIVIDUAL */}
            <circle cx={C} cy={C} r={CENTER_R + 60} fill="url(#nexus-center-glow)" />
            <m.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformOrigin: `${C}px ${C}px` }}
            >
              <circle cx={C} cy={C} r={CENTER_R} fill="#0a0a0b" stroke="rgba(34,211,238,0.5)" strokeWidth={2} />
              <circle cx={C} cy={C} r={CENTER_R} fill="none" stroke="rgba(34,211,238,0.15)" strokeWidth={1} className="nexus-pulse" />
              <foreignObject x={C - CENTER_R} y={C - CENTER_R} width={CENTER_R * 2} height={CENTER_R * 2}>
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <User size={30} className="text-cyan-300" aria-hidden="true" />
                  <span className="mt-1 text-[13px] font-semibold leading-tight text-white">You</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">The individual</span>
                </div>
              </foreignObject>
            </m.g>

            {/* Institution nodes */}
            {positioned.map(({ node, x, y }, i) => {
              const Icon = node.icon;
              const isSel = selected === node.id;
              const established = node.state === 'established';
              const forming = node.state === 'forming';
              return (
                <m.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.12, ease: 'backOut' }}
                  style={{ transformOrigin: `${x}px ${y}px`, cursor: 'pointer' }}
                  onClick={() => setSelected(isSel ? null : node.id)}
                >
                  <circle cx={x} cy={y} r={NODE_R + 26} fill={`url(#g-${node.id})`} />
                  <circle
                    cx={x} cy={y} r={NODE_R}
                    fill="#0c0c0e"
                    stroke={established ? node.color : forming ? `${node.color}99` : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isSel ? 3.5 : established ? 2.5 : 1.5}
                    strokeDasharray={node.state === 'open' ? '4 4' : undefined}
                    className={established ? 'nexus-node-breathe' : ''}
                  />
                  <foreignObject x={x - NODE_R} y={y - NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
                    <div className="flex h-full w-full flex-col items-center justify-center text-center">
                      <Icon size={22} style={{ color: established || forming ? node.color : '#71717a' }} aria-hidden="true" />
                      <span className={`mt-1 text-[12px] font-semibold leading-tight ${established || forming ? 'text-white' : 'text-zinc-500'}`}>
                        {node.label}
                      </span>
                      <span className="mt-0.5 text-[8px] uppercase leading-tight tracking-wide" style={{ color: established ? node.color : '#52525b' }}>
                        {established ? 'Established' : forming ? 'Forming' : 'Open'}
                      </span>
                    </div>
                  </foreignObject>
                </m.g>
              );
            })}
          </svg>
        </div>

        {/* Established summary + selected-node detail */}
        <div className="mx-auto mt-2 max-w-3xl">
          <p className="text-center text-sm text-zinc-500">
            {ps.isDisconnected
              ? 'Connect your wallet to see your network come to life.'
              : `${establishedCount} of ${nodes.length} institutions established. Select any to explore.`}
          </p>

          {selectedNode && (
            <m.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${selectedNode.color}1a`, border: `1px solid ${selectedNode.color}44` }}>
                    <selectedNode.icon size={18} style={{ color: selectedNode.color }} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{selectedNode.label}</h3>
                    <p className="text-xs" style={{ color: selectedNode.color }}>
                      {selectedNode.state === 'established' ? selectedNode.establishedLabel : selectedNode.state === 'forming' ? 'Forming' : 'Not yet established'}
                    </p>
                  </div>
                </div>
                <Link href={selectedNode.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                  Open <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selectedNode.subsystems.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.established ? 'bg-emerald-400' : 'bg-zinc-700'}`} aria-hidden="true" />
                      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{s.established ? 'Established' : 'Open'}</span>
                    </span>
                    <span className="mt-1.5 text-sm font-medium text-zinc-200">{s.label}</span>
                  </Link>
                ))}
              </div>
            </m.div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
