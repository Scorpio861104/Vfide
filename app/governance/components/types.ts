import type { ProposalStatus, ProposalType } from '@/hooks/useDAO';

export interface Proposal {
  id: number;
  /** Display label for the proposal type (e.g. "Generic", "Financial"). Derived from ptype. */
  type: string;
  title: string;
  author: string;
  /** Human-readable countdown string ("3d 4h", "Ended"). Pre-computed at fetch time. */
  timeLeft: string;
  /** Voting period end in epoch milliseconds. */
  endTime: number;
  /** Voting period start in epoch milliseconds. Used to determine the withdraw window (only allowed before voting opens). */
  startTime?: number;
  forVotes: number;
  againstVotes: number;
  /** Whether the *current viewer* has voted on this proposal. Set after a hasVoted batch read. */
  voted: boolean;
  description?: string;
  /** On-chain proposal status enum. Drives action button visibility (vote/finalize/execute/withdraw). */
  status?: ProposalStatus;
  /** On-chain proposal type enum. */
  ptype?: ProposalType;
  /** Proposer's full address (not just truncated). Useful for "you proposed this" checks. */
  proposerAddress?: `0x${string}`;
}
