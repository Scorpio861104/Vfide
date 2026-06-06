'use client';

/**
 * useAdminMultiSig — reads the live AdminMultiSig protocol-governance multisig.
 *
 * AdminMultiSig is deployed at V1 (contracts/AdminMultiSig.sol) and is the M-of-N council
 * approval layer for CONFIG / CRITICAL / EMERGENCY protocol actions. This hook surfaces its
 * REAL on-chain state — config thresholds/delays + the actual proposal list — for a read-only
 * governance console. It does NOT invent council members or proposals; when the contract address
 * isn't configured, `configured` is false and the UI shows a "not configured" state.
 *
 * This is distinct from:
 *   - the DAO proposal flow (useProposals → DAO contract), which is ProofScore-weighted voting
 *   - the deferred CouncilElection layer (elected representatives), still coming-soon
 */

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { AdminMultiSigABI } from '@/lib/abis';

export type MultiSigProposalType = 'CONFIG' | 'CRITICAL' | 'EMERGENCY';
export type MultiSigProposalStatus = 'Pending' | 'Approved' | 'Executed' | 'Vetoed' | 'Expired';

const PROPOSAL_TYPE: MultiSigProposalType[] = ['CONFIG', 'CRITICAL', 'EMERGENCY'];
const PROPOSAL_STATUS: MultiSigProposalStatus[] = [
  'Pending',
  'Approved',
  'Executed',
  'Vetoed',
  'Expired',
];

export interface MultiSigProposal {
  id: number;
  proposer: `0x${string}`;
  type: MultiSigProposalType;
  status: MultiSigProposalStatus;
  createdAt: number;
  executionTime: number;
  approvalCount: number;
  vetoCount: number;
  target: `0x${string}`;
  description: string;
}

export interface MultiSigConfig {
  requiredApprovals: number;
  emergencyApprovals: number;
  councilSize: number;
  configDelaySec: number;
  criticalDelaySec: number;
  emergencyDelaySec: number;
  vetoWindowSec: number;
  proposalExpirySec: number;
  vetoThreshold: number;
}

interface UseAdminMultiSigResult {
  configured: boolean;
  config: MultiSigConfig | null;
  proposalCount: number;
  /** Most-recent proposals first (capped — see `recentLimit`). */
  proposals: MultiSigProposal[];
  isLoading: boolean;
  refetch: () => void;
}

/**
 * @param recentLimit how many most-recent proposals to fetch (default 10).
 */
export function useAdminMultiSig(recentLimit = 10): UseAdminMultiSigResult {
  const address = CONTRACT_ADDRESSES.AdminMultiSig as `0x${string}` | undefined;
  const configured = !!address;
  const base = { address, abi: AdminMultiSigABI as unknown as readonly unknown[] } as const;

  // ── Config reads (multicall) ──────────────────────────────────────────────
  const { data: cfgData, isLoading: cfgLoading } = useReadContracts({
    contracts: configured
      ? [
          { ...base, functionName: 'REQUIRED_APPROVALS' },
          { ...base, functionName: 'EMERGENCY_APPROVALS' },
          { ...base, functionName: 'COUNCIL_SIZE' },
          { ...base, functionName: 'CONFIG_DELAY' },
          { ...base, functionName: 'CRITICAL_DELAY' },
          { ...base, functionName: 'EMERGENCY_DELAY' },
          { ...base, functionName: 'VETO_WINDOW' },
          { ...base, functionName: 'PROPOSAL_EXPIRY' },
          { ...base, functionName: 'vetoThreshold' },
          { ...base, functionName: 'proposalCount' },
        ]
      : [],
    query: { enabled: configured },
  });

  const num = (i: number): number => {
    const r = cfgData?.[i];
    if (!r || r.status !== 'success' || r.result === undefined || r.result === null) return 0;
    return Number(r.result as bigint);
  };

  const proposalCount = num(9);

  const config: MultiSigConfig | null = useMemo(() => {
    if (!configured || !cfgData) return null;
    return {
      requiredApprovals: num(0),
      emergencyApprovals: num(1),
      councilSize: num(2),
      configDelaySec: num(3),
      criticalDelaySec: num(4),
      emergencyDelaySec: num(5),
      vetoWindowSec: num(6),
      proposalExpirySec: num(7),
      vetoThreshold: num(8),
    };
  }, [configured, cfgData]);

  // ── Recent proposals (most-recent first) ──────────────────────────────────
  const ids = useMemo(() => {
    if (proposalCount <= 0) return [] as number[];
    const start = Math.max(0, proposalCount - recentLimit);
    const out: number[] = [];
    // getProposal is 0-indexed up to proposalCount-1; show newest first.
    for (let i = proposalCount - 1; i >= start; i--) out.push(i);
    return out;
  }, [proposalCount, recentLimit]);

  const { data: propData, isLoading: propLoading, refetch } = useReadContracts({
    contracts: ids.map((id) => ({
      address,
      abi: AdminMultiSigABI,
      functionName: 'getProposal',
      args: [BigInt(id)],
    })) as any,
    query: { enabled: configured && ids.length > 0 },
  });

  const proposals: MultiSigProposal[] = useMemo(() => {
    if (!propData) return [];
    return ids
      .map((id, idx) => {
        const r = propData[idx];
        if (!r || r.status !== 'success' || !r.result) return null;
        // getProposal → [proposer, proposalType, status, createdAt, executionTime,
        //                 approvalCount, vetoCount, target, description]
        const t = r.result as readonly [
          `0x${string}`, number, number, bigint, bigint, bigint, bigint, `0x${string}`, string
        ];
        return {
          id,
          proposer: t[0],
          type: PROPOSAL_TYPE[Number(t[1])] ?? 'CONFIG',
          status: PROPOSAL_STATUS[Number(t[2])] ?? 'Pending',
          createdAt: Number(t[3]),
          executionTime: Number(t[4]),
          approvalCount: Number(t[5]),
          vetoCount: Number(t[6]),
          target: t[7],
          description: t[8],
        } as MultiSigProposal;
      })
      .filter((p): p is MultiSigProposal => p !== null);
  }, [propData, ids]);

  // Fallback single read for proposalCount if multicall config failed but we still want a count.
  const { data: countOnly } = useReadContract({
    ...base,
    functionName: 'proposalCount',
    query: { enabled: configured && !cfgData },
  });
  const effectiveCount = proposalCount || (countOnly ? Number(countOnly as bigint) : 0);

  return {
    configured,
    config,
    proposalCount: effectiveCount,
    proposals,
    isLoading: cfgLoading || propLoading,
    refetch,
  };
}
