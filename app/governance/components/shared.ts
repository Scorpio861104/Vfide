/**
 * Shared types, constants, and utilities for Governance components
 */

import { DAOABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

export const DAO_ABI = DAOABI;

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
