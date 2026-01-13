/**
 * Advanced Governance Interface Component
 * Proposal explorer, voting interface, and delegation management
 * 
 * Features:
 * - Proposal explorer with filtering and sorting
 * - Real-time voting with countdown timers
 * - Delegation management
 * - Vote history and analytics
 * - Governance statistics dashboard
 * - Mobile-responsive design
 * - Dark mode support
 */

'use client';

import React, { useState } from 'react';
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// ==================== TYPES ====================

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  startDate: number;
  endDate: number;
  status: 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotes: number;
  votesRequired: number;
  category: 'governance' | 'treasury' | 'technical' | 'parameter';
  details: string;
  actions: ProposalAction[];
}

interface ProposalAction {
  target: string;
  functionSig: string;
  calldataParams: string[];
  eta: number;
}

interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  direction: 'for' | 'against' | 'abstain';
  weight: number;
  timestamp: number;
}

interface Delegation {
  delegator: string;
  delegatee: string;
  votes: number;
  timestamp: number;
  active: boolean;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  participationRate: number;
  averageTurnout: number;
  totalVotesCast: number;
  delegatedVotes: number;
}

// ==================== MOCK DATA ====================

function generateMockProposals(): Proposal[] {
  const now = Date.now();
  return [
    {
      id: 'prop-001',
      title: 'Increase ProofScore Emissions by 10%',
      description: 'Proposal to increase the monthly ProofScore token emissions from 100M to 110M tokens to incentivize greater network participation.',
      proposer: '0x1234...5678',
      startDate: now - 3 * 24 * 60 * 60 * 1000,
      endDate: now + 2 * 24 * 60 * 60 * 1000,
      status: 'active',
      forVotes: 850000,
      againstVotes: 120000,
      abstainVotes: 30000,
      totalVotes: 1000000,
      votesRequired: 600000,
      category: 'parameter',
      details: 'This proposal aims to boost network activity by increasing token emissions. The increase will be gradual over 6 months.',
      actions: [
        {
          target: '0xProofScoreToken',
          functionSig: 'setEmissionRate(uint256)',
          calldataParams: ['110000000000000000000000000'],
          eta: now + 3 * 24 * 60 * 60 * 1000,
        },
      ],
    },
    {
      id: 'prop-002',
      title: 'Add Uniswap V4 Integration',
      description: 'Proposal to add support for Uniswap V4 in the VFIDE trading interface for improved liquidity management.',
      proposer: '0x9876...5432',
      startDate: now - 7 * 24 * 60 * 60 * 1000,
      endDate: now - 1 * 24 * 60 * 60 * 1000,
      status: 'passed',
      forVotes: 920000,
      againstVotes: 45000,
      abstainVotes: 35000,
      totalVotes: 1000000,
      votesRequired: 600000,
      category: 'technical',
      details: 'Integration with Uniswap V4 will enable advanced liquidity pool management and improved trading efficiency.',
      actions: [
        {
          target: '0xVFIDESwapRouter',
          functionSig: 'addProtocol(address,string)',
          calldataParams: ['0xUniswapV4Router', 'uniswapv4'],
          eta: now + 5 * 24 * 60 * 60 * 1000,
        },
      ],
    },
    {
      id: 'prop-003',
      title: 'Treasury Allocation: Community Grants',
      description: 'Allocate 5% of treasury funds to community developer grants and ecosystem development programs.',
      proposer: '0xabcd...ef01',
      startDate: now + 1 * 24 * 60 * 60 * 1000,
      endDate: now + 8 * 24 * 60 * 60 * 1000,
      status: 'active',
      forVotes: 650000,
      againstVotes: 200000,
      abstainVotes: 150000,
      totalVotes: 1000000,
      votesRequired: 600000,
      category: 'treasury',
      details: 'This initiative will distribute grants to qualified community members to accelerate ecosystem development.',
      actions: [
        {
          target: '0xDAOTreasury',
          functionSig: 'allocateFunds(uint256,address)',
          calldataParams: ['5000000000000000000000000', '0xGrantPool'],
          eta: now + 9 * 24 * 60 * 60 * 1000,
        },
      ],
    },
    {
      id: 'prop-004',
      title: 'Governance Framework Update',
      description: 'Update governance framework to include quadratic voting for better representation of minority stakeholders.',
      proposer: '0xfedc...ba98',
      startDate: now - 14 * 24 * 60 * 60 * 1000,
      endDate: now - 8 * 24 * 60 * 60 * 1000,
      status: 'failed',
      forVotes: 400000,
      againstVotes: 550000,
      abstainVotes: 50000,
      totalVotes: 1000000,
      votesRequired: 600000,
      category: 'governance',
      details: 'Implementation of quadratic voting would provide fairer representation but requires careful mechanism design.',
      actions: [],
    },
  ];
}

function generateMockVotes(): Vote[] {
  const votes: Vote[] = [];
  const proposals = generateMockProposals();
  const addresses = ['0x1111...1111', '0x2222...2222', '0x3333...3333', '0x4444...4444', '0x5555...5555'];
  const directions: ('for' | 'against' | 'abstain')[] = ['for', 'against', 'abstain'];
  
  proposals.forEach((prop) => {
    for (let i = 0; i < 15; i++) {
      votes.push({
        id: `vote-${prop.id}-${i}`,
        proposalId: prop.id,
        voter: addresses[i % addresses.length],
        direction: directions[i % directions.length],
        weight: Math.floor(Math.random() * 100000) + 10000,
        timestamp: prop.startDate + Math.random() * (prop.endDate - prop.startDate),
      });
    }
  });
  
  return votes;
}

function generateMockDelegations(): Delegation[] {
  return [
    {
      delegator: '0xuser123',
      delegatee: '0xdeleg001',
      votes: 150000,
      timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
      active: true,
    },
    {
      delegator: '0xuser456',
      delegatee: '0xdeleg002',
      votes: 275000,
      timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
      active: true,
    },
    {
      delegator: '0xuser789',
      delegatee: '0xdeleg001',
      votes: 95000,
      timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000,
      active: true,
    },
    {
      delegator: '0xuserabc',
      delegatee: '0xdeleg003',
      votes: 180000,
      timestamp: Date.now() - 90 * 24 * 60 * 60 * 1000,
      active: false,
    },
  ];
}

function generateGovernanceStats(): GovernanceStats {
  return {
    totalProposals: 47,
    activeProposals: 2,
    participationRate: 68.5,
    averageTurnout: 75.2,
    totalVotesCast: 15234000,
    delegatedVotes: 5423000,
  };
}

// ==================== HELPER FUNCTIONS ====================

function getTimeRemaining(endDate: number): string {
  const now = Date.now();
  const diff = endDate - now;
  
  if (diff < 0) return 'Ended';
  
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'passed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'executed':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'governance':
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200';
    case 'treasury':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200';
    case 'technical':
      return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200';
    case 'parameter':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200';
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
  }
}

function getVotePercentage(votes: number, total: number): number {
  if (total === 0) return 0;
  return (votes / total) * 100;
}

// ==================== COMPONENTS ====================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <span className="text-2xl md:text-3xl">{icon}</span>
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (proposalId: string, direction: 'for' | 'against' | 'abstain') => void;
}

function ProposalCard({ proposal, onVote }: ProposalCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercent = getVotePercentage(proposal.forVotes, totalVotes);
  const againstPercent = getVotePercentage(proposal.againstVotes, totalVotes);
  const timeRemaining = getTimeRemaining(proposal.endDate);
  const isActive = proposal.status === 'active';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex-1">
              {proposal.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(proposal.status)}`}>
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(proposal.category)}`}>
              {proposal.category}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {proposal.description}
          </p>
        </div>
      </div>

      {/* Voting Progress Bars */}
      {isActive && (
        <div className="mb-4 space-y-2">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                For ({(proposal.forVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {forPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(forPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Against ({(proposal.againstVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {againstPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(againstPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                Abstain ({(proposal.abstainVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {getVotePercentage(proposal.abstainVotes, totalVotes).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    getVotePercentage(proposal.abstainVotes, totalVotes),
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Total Votes</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {(totalVotes / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Required</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {(proposal.votesRequired / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Proposer</p>
          <p className="font-mono text-gray-900 dark:text-white truncate">
            {proposal.proposer}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Voting Time</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {timeRemaining}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {isActive && (
        <div className="flex gap-2">
          <MobileButton
            onClick={() => onVote(proposal.id, 'for')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
          >
            Vote For
          </MobileButton>
          <MobileButton
            onClick={() => onVote(proposal.id, 'against')}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
          >
            Vote Against
          </MobileButton>
          <MobileButton
            onClick={() => onVote(proposal.id, 'abstain')}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors"
          >
            Abstain
          </MobileButton>
        </div>
      )}
    </div>
  );
}

interface DelegationItemProps {
  delegation: Delegation;
  onRevoke: (delegator: string) => void;
}

function DelegationItem({ delegation, onRevoke }: DelegationItemProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">From</p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegator}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">To</p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegatee}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Votes</p>
            <p className="font-bold text-sm text-gray-900 dark:text-white">
              {(delegation.votes / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {delegation.active ? '✓ Active' : '✗ Revoked'} •
          {' '}
          {new Date(delegation.timestamp).toLocaleDateString()}
        </p>
      </div>
      {delegation.active && (
        <MobileButton
          onClick={() => onRevoke(delegation.delegator)}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors w-full md:w-auto"
        >
          Revoke Delegation
        </MobileButton>
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function GovernanceUI() {
  const [activeTab, setActiveTab] = useState<'proposals' | 'voting' | 'delegation' | 'history'>(
    'proposals'
  );
  const [proposals, setProposals] = useState(generateMockProposals());
  const [votes, setVotes] = useState(generateMockVotes());
  const [delegations, setDelegations] = useState(generateMockDelegations());
  const [stats] = useState(generateGovernanceStats());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [votesAmount, setVotesAmount] = useState('');

  const filteredProposals = proposals.filter((p) => {
    const statusMatch = filterStatus === 'all' || p.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const handleVote = (proposalId: string, direction: 'for' | 'against' | 'abstain') => {
    const weight = 100000; // Mock vote weight
    const newVote: Vote = {
      id: `vote-${Date.now()}`,
      proposalId,
      voter: '0xuser...',
      direction,
      weight,
      timestamp: Date.now(),
    };
    setVotes([...votes, newVote]);

    // Update proposal votes
    setProposals(
      proposals.map((p) => {
        if (p.id === proposalId) {
          const updated = { ...p };
          if (direction === 'for') updated.forVotes += weight;
          else if (direction === 'against') updated.againstVotes += weight;
          else updated.abstainVotes += weight;
          updated.totalVotes += weight;
          return updated;
        }
        return p;
      })
    );
  };

  // TODO: Delegation requires a contract upgrade to add delegate() function to DAO.sol
  // The VoteDelegated event exists but the delegate function is not yet implemented.
  // For now, delegation is tracked locally in the UI state only.
  // Future implementation: DAO.sol should add:
  //   function delegate(address delegatee, uint256 amount) external
  //   function undelegate(address delegatee) external
  const handleDelegate = () => {
    if (!delegateeAddress || !votesAmount) return;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      alert('Invalid address format');
      return;
    }

    const newDelegation: Delegation = {
      delegator: '0xuser...',
      delegatee: delegateeAddress,
      votes: parseInt(votesAmount) * 1000000,
      timestamp: Date.now(),
      active: true,
    };
    setDelegations([...delegations, newDelegation]);
    setDelegateeAddress('');
    setVotesAmount('');
    
    // Note: This is currently a local UI feature only
    // Delegation will be persisted to blockchain in a future update
  };

  const handleRevokeDelegation = (delegator: string) => {
    setDelegations(
      delegations.map((d) => (d.delegator === delegator ? { ...d, active: false } : d))
    );
  };

  // Proposals Tab
  const renderProposalsTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
          Filter Proposals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <MobileSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'passed', label: 'Passed' },
                { value: 'failed', label: 'Failed' },
                { value: 'executed', label: 'Executed' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <MobileSelect
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full"
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'governance', label: 'Governance' },
                { value: 'treasury', label: 'Treasury' },
                { value: 'technical', label: 'Technical' },
                { value: 'parameter', label: 'Parameter' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
          {filteredProposals.length} Proposal{filteredProposals.length !== 1 ? 's' : ''}
        </h3>
        {filteredProposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );

  // Delegation Tab
  const renderDelegationTab = () => (
    <div className="space-y-6">
      {/* Delegate Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">
          Delegate Your Votes
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Delegatee Address
            </label>
            <MobileInput
              type="text"
              placeholder="0x1234...5678"
              value={delegateeAddress}
              onChange={(e) => setDelegateeAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Votes to Delegate (millions)
            </label>
            <MobileInput
              type="number"
              placeholder="e.g., 100"
              value={votesAmount}
              onChange={(e) => setVotesAmount(e.target.value)}
            />
          </div>
          <MobileButton
            onClick={handleDelegate}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Delegate Votes
          </MobileButton>
        </div>
      </div>

      {/* Active Delegations */}
      <div className="space-y-4">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
          Your Delegations ({delegations.filter((d) => d.active).length})
        </h3>
        <div className="space-y-3">
          {delegations.map((delegation, idx) => (
            <DelegationItem
              key={idx}
              delegation={delegation}
              onRevoke={handleRevokeDelegation}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Voting History Tab
  const renderHistoryTab = () => {
    const userVotes = votes.slice(0, 10);
    return (
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Your Recent Votes
        </h3>
        <div className="space-y-3">
          {userVotes.map((vote) => (
            <div
              key={vote.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Proposal {vote.proposalId}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        vote.direction === 'for'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : vote.direction === 'against'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {vote.direction.charAt(0).toUpperCase() + vote.direction.slice(1)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Weight: {(vote.weight / 1000000).toFixed(2)}M
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(vote.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <ResponsiveContainer>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Governance
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            Participate in DAO decisions and shape the future of VFIDE
          </p>
        </div>

        {/* Statistics */}
        <div className={`grid ${responsiveGrids.auto} gap-4 mb-8`}>
          <StatCard
            label="Total Proposals"
            value={stats.totalProposals}
            icon="📋"
          />
          <StatCard
            label="Active Now"
            value={stats.activeProposals}
            icon="🔴"
          />
          <StatCard
            label="Participation Rate"
            value={`${stats.participationRate.toFixed(1)}%`}
            icon="📊"
          />
          <StatCard
            label="Total Votes Cast"
            value={`${(stats.totalVotesCast / 1000000).toFixed(1)}M`}
            icon="🗳️"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 dark:border-gray-700">
            {(['proposals', 'voting', 'delegation', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-center transition-colors text-sm md:text-base ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'proposals' && 'Proposals'}
                {tab === 'voting' && 'Vote'}
                {tab === 'delegation' && 'Delegate'}
                {tab === 'history' && 'History'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-8">
            {activeTab === 'proposals' && renderProposalsTab()}
            {activeTab === 'voting' && renderProposalsTab()}
            {activeTab === 'delegation' && renderDelegationTab()}
            {activeTab === 'history' && renderHistoryTab()}
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
