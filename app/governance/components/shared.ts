/**
 * Shared types, constants, and utilities for Governance components
 */

import { CONTRACT_ADDRESSES } from '@/lib/contracts';

// DAO Contract ABI
export const DAO_ABI = [
  { name: 'propose', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'ptype', type: 'uint8' }, { name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'description', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { name: 'vote', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }, { name: 'support', type: 'bool' }], outputs: [] },
  { name: 'finalize', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'withdrawProposal', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'getActiveProposals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[]' }] },
  { name: 'getProposalDetails', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'ptype', type: 'uint8' }, { name: 'proposer', type: 'address' }, { name: 'target', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }, { name: 'description', type: 'string' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'endsAt', type: 'uint256' }, { name: 'finalized', type: 'bool' }, { name: 'passed', type: 'bool' }] },
  { name: 'hasVoted', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }, { name: 'voter', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getVotingPower', type: 'function', stateMutability: 'view', inputs: [{ name: 'voter', type: 'address' }], outputs: [{ name: 'basePower', type: 'uint256' }, { name: 'multiplier', type: 'uint256' }, { name: 'effectivePower', type: 'uint256' }, { name: 'fatiguePenalty', type: 'uint256' }] },
  { name: 'isEligible', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getVoterStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'voter', type: 'address' }], outputs: [{ name: 'totalVotes', type: 'uint256' }, { name: 'forVotes', type: 'uint256' }, { name: 'againstVotes', type: 'uint256' }, { name: 'lastVoteTime', type: 'uint256' }] },
] as const;

// Contract address from centralized registry
export const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;

// Constants
export const PROMOTION_THRESHOLD = 50;

// Types
export type TabType = 'overview' | 'proposals' | 'create' | 'council' | 'suggestions' | 'discussions' | 'members' | 'history' | 'stats';

export interface Proposal {
  id: number;
  type: string;
  title: string;
  author: string;
  timeLeft: string;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  voted: boolean;
  description?: string;
}
