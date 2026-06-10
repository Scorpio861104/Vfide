'use client';

/**
 * OwnershipNexus — VFIDE's signature visual (Wave 40, made monumental in Wave 41).
 *
 * A radial ownership network: the PARTICIPANT at the center; the seven institutions orbit, connected
 * by spokes and a continuity ring (the loop that returns to ownership). The ecosystem serves the
 * individual, never the reverse.
 *
 * Wave 41 additions: cinematic staged intro (~3.8s, connections form one at a time in order),
 * living energy pulse on established spokes, a background institutional grid + layered glows for
 * depth, hover/focus glow + connection emphasis, and a `monumental` variant for hero use.
 *
 * Dynamic, not gamified: each node reflects what the participant has ACTUALLY established (real state
 * from useProofScore / useContinuityStatus / useMerchantHealth). Visibility of what exists.
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
interface SubSystem { label: string; href: string; established: boolean; }
interface NexusNode {
  id: string; label: string; establishedLabel: string; color: string;
  icon: LucideIcon; href: string; state: NodeState; introOrder: number; subsystems: SubSystem[];
}

const VB = 1000;
const C = VB / 2;
const RING_R = 340;
const T_RING = 0.6;
const T_CENTER = 0.2;
const T_FIRST = 1.0;
const T_STEP = 0.42;

function polar(i: number, n: number): { x: number; y: number } {
  const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
  return { x: C + RING_R * Math.cos(angle), y: C + RING_R * Math.sin(angle) };
}

export function OwnershipNexus({ variant = 'inline' }: { variant?: 'inline' | 'monumental' }) {
  const ps = useProofScore();
  const c = useContinuityStatus();
  const mh = useMerchantHealth();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const monumental = variant === 'monumental';
  const NODE_R = monumental ? 64 : 58;
  const CENTER_R = monumental ? 104 : 92;

  const nodes: NexusNode[] = useMemo(() => {
    const recoveryReady = c.recoveryConfigured;
    const protectionEstablished = c.recoveryConfigured && c.guardianCount > 0;
    const continuityPlanned = c.inheritanceConfigured;
    const merchantActive = mh.isMerchant;
    const governanceActive = !!ps.canVote;
    const trustForming = !ps.isDisconnected && ps.score != null;
    const ownershipEstablished = !ps.isDisconnected;
    const mk = (e: boolean, f = false): NodeState => (e ? 'established' : f ? 'forming' : 'open');

    return [
      { id: 'ownership', label: 'Ownership', establishedLabel: 'Vault established', introOrder: 0,
        color: '#8B5CF6', icon: Wallet, href: '/vault', state: mk(ownershipEstablished),
        subsystems: [
          { label: 'Assets', href: '/wallet', established: ownershipEstablished },
          { label: 'Vaults', href: '/vault', established: ownershipEstablished },
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Inheritance', href: '/inheritance', established: continuityPlanned },
        ] },
      { id: 'trust', label: 'Trust', establishedLabel: 'Trust record forming', introOrder: 1,
        color: '#06B6D4', icon: ShieldCheck, href: '/proofscore', state: mk(false, trustForming),
        subsystems: [
          { label: 'Participation', href: '/proofscore', established: trustForming },
          { label: 'Verification', href: '/proofscore', established: merchantActive },
          { label: 'History', href: '/proofscore', established: trustForming },
          { label: 'Opportunity', href: '/headhunter', established: governanceActive },
        ] },
      { id: 'commerce', label: 'Commerce', establishedLabel: 'Merchant activated', introOrder: 2,
        color: '#10B981', icon: Store, href: '/merchant', state: mk(merchantActive),
        subsystems: [
          { label: 'Payments', href: '/merchant/payment-links', established: merchantActive },
          { label: 'Customers', href: '/merchant/customers', established: merchantActive },
          { label: 'Invoices', href: '/merchant/invoices', established: merchantActive },
          { label: 'Subscriptions', href: '/merchant/subscriptions', established: false },
        ] },
      { id: 'continuity', label: 'Continuity', establishedLabel: 'Continuity planned', introOrder: 3,
        color: '#EC4899', icon: Heart, href: '/continuity', state: mk(continuityPlanned, c.configuredCount > 0),
        subsystems: [
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Contacts', href: '/guardians', established: c.guardianCount > 0 },
          { label: 'Succession', href: '/inheritance', established: continuityPlanned },
          { label: 'Emergency Planning', href: '/security-center', established: protectionEstablished },
        ] },
      { id: 'governance', label: 'Governance', establishedLabel: 'Eligible to participate', introOrder: 6,
        color: '#6366F1', icon: Landmark, href: '/governance', state: mk(governanceActive),
        subsystems: [
          { label: 'Proposals', href: '/governance', established: governanceActive },
          { label: 'Council', href: '/governance', established: false },
          { label: 'Voting', href: '/governance', established: governanceActive },
          { label: 'Treasury', href: '/governance', established: governanceActive },
        ] },
      { id: 'knowledge', label: 'Knowledge', establishedLabel: 'Guidance available', introOrder: 5,
        color: '#F59E0B', icon: GraduationCap, href: '/seer-academy', state: mk(false, true),
        subsystems: [
          { label: 'In-context guidance', href: '/continuity', established: true },
          { label: 'Knowledge Library', href: '/seer-academy', established: true },
          { label: 'VFIDE Explained', href: '/', established: true },
          { label: 'Reference', href: '/seer-academy', established: true },
        ] },
      { id: 'protection', label: 'Protection', establishedLabel: 'Protection established', introOrder: 4,
        color: '#3B82F6', icon: Lock, href: '/security-center', state: mk(protectionEstablished, c.guardianCount > 0),
        subsystems: [
          { label: 'Guardians', href: '/guardians', established: c.guardianCount > 0 },
          { label: 'Recovery', href: '/vault/recover', established: recoveryReady },
          { label: 'Security Center', href: '/security-center', established: protectionEstablished },
          { label: 'Emergency Lock', href: '/security-center', established: protectionEstablished },
        ] },
    ];
  }, [ps, c, mh]);

  const positioned = nodes.map((node, i) => ({ node, ...polar(i, nodes.length) }));
  const establishedCount = nodes.filter((n) => n.state === 'established').length;
  const selectedNode = selected ? nodes.find((n) => n.id === selected) ?? null : null;
  const delayFor = (introOrder: number) => T_FIRST + introOrder * T_STEP;

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full">
        <div className={`relative mx-auto w-full ${monumental ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full" role="img" aria-label="The ownership network — the participant at the center of seven connected institutions">
            <defs>
              <pattern id="nexus-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M50 0H0V50" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
              </pattern>
              <radialGradient id="nexus-grid-mask" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="62%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <mask id="nexus-grid-fade"><rect x="0" y="0" width={VB} height={VB} fill="url(#nexus-grid-mask)" /></mask>
              <radialGradient id="nexus-center-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
              {nodes.map((n) => (
                <radialGradient key={n.id} id={`g-${n.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={n.color} stopOpacity={n.state === 'established' ? 0.3 : 0.12} />
                  <stop offset="100%" stopColor={n.color} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* Layer 1: depth grid */}
            <m.rect x="0" y="0" width={VB} height={VB} fill="url(#nexus-grid)" mask="url(#nexus-grid-fade)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, ease: 'easeOut' }} />

            {/* Layer 3a: continuity ring */}
            <m.circle cx={C} cy={C} r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5}
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.6, delay: T_RING, ease: 'easeInOut' }} />

            {/* Layer 3b: spokes + living energy */}
            {positioned.map(({ node, x, y }) => {
              const active = node.state !== 'open';
              const emphasized = hovered === node.id || selected === node.id;
              const d = delayFor(node.introOrder);
              return (
                <g key={`spoke-${node.id}`}>
                  <m.line x1={C} y1={C} x2={x} y2={y}
                    stroke={active ? node.color : 'rgba(255,255,255,0.08)'}
                    strokeOpacity={emphasized ? 0.85 : active ? 0.4 : 1}
                    strokeWidth={emphasized ? 3 : active ? 2 : 1}
                    initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.9, delay: d, ease: 'easeOut' }}
                    style={{ transition: 'stroke-width 0.3s, stroke-opacity 0.3s' }} />
                  {active && (
                    <m.line x1={C} y1={C} x2={x} y2={y}
                      stroke={node.color} strokeWidth={emphasized ? 3 : 2} strokeLinecap="round"
                      pathLength={1} strokeDasharray="0.12 0.88" className="nexus-energy"
                      initial={{ opacity: 0 }} animate={{ opacity: emphasized ? 0.9 : 0.5 }}
                      transition={{ delay: d + 0.6, duration: 0.6 }} />
                  )}
                </g>
              );
            })}

            {/* Layer 2: participant at center */}
            <circle cx={C} cy={C} r={CENTER_R + 70} fill="url(#nexus-center-glow)" />
            <m.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: T_CENTER, ease: 'easeOut' }} style={{ transformOrigin: `${C}px ${C}px` }}>
              <circle cx={C} cy={C} r={CENTER_R} fill="#0a0a0b" stroke="rgba(34,211,238,0.5)" strokeWidth={2} />
              <circle cx={C} cy={C} r={CENTER_R} fill="none" stroke="rgba(34,211,238,0.15)" strokeWidth={1} className="nexus-pulse" />
              <foreignObject x={C - CENTER_R} y={C - CENTER_R} width={CENTER_R * 2} height={CENTER_R * 2}>
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <User size={monumental ? 34 : 30} className="text-cyan-300" aria-hidden="true" />
                  <span className={`mt-1 font-semibold leading-tight text-white ${monumental ? 'text-[15px]' : 'text-[13px]'}`}>You</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500">The individual</span>
                </div>
              </foreignObject>
            </m.g>

            {/* Institution nodes */}
            {positioned.map(({ node, x, y }) => {
              const Icon = node.icon;
              const isSel = selected === node.id;
              const isHover = hovered === node.id;
              const established = node.state === 'established';
              const forming = node.state === 'forming';
              const d = delayFor(node.introOrder);
              return (
                <m.g key={node.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: d + 0.15, ease: 'backOut' }}
                  style={{ transformOrigin: `${x}px ${y}px`, cursor: 'pointer' }}
                  onClick={() => setSelected(isSel ? null : node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered((h) => (h === node.id ? null : h))}
                  tabIndex={0}
                  onFocus={() => setHovered(node.id)}
                  onBlur={() => setHovered((h) => (h === node.id ? null : h))}>
                  <circle cx={x} cy={y} r={NODE_R + 26} fill={`url(#g-${node.id})`}
                    style={{ opacity: isHover || isSel ? 1.6 : 1, transition: 'opacity 0.3s' }} />
                  <circle cx={x} cy={y} r={NODE_R} fill="#0c0c0e"
                    stroke={established ? node.color : forming ? `${node.color}99` : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isSel || isHover ? 3.5 : established ? 2.5 : 1.5}
                    strokeDasharray={node.state === 'open' ? '4 4' : undefined}
                    className={established ? 'nexus-node-breathe' : ''}
                    style={{ transition: 'stroke-width 0.3s' }} />
                  <foreignObject x={x - NODE_R} y={y - NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
                    <div className="flex h-full w-full flex-col items-center justify-center text-center">
                      <Icon size={monumental ? 24 : 22} style={{ color: established || forming ? node.color : '#71717a' }} aria-hidden="true" />
                      <span className={`mt-1 font-semibold leading-tight ${monumental ? 'text-[13px]' : 'text-[12px]'} ${established || forming ? 'text-white' : 'text-zinc-500'}`}>
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

        <div className="mx-auto mt-2 max-w-3xl">
          <p className="text-center text-sm text-zinc-500">
            {ps.isDisconnected
              ? 'Connect your wallet to see your network come to life.'
              : `${establishedCount} of ${nodes.length} institutions established. Select any to explore.`}
          </p>

          {selectedNode && (
            <m.div key={selectedNode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }} className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
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
                  <Link key={s.label} href={s.href}
                    className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
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
