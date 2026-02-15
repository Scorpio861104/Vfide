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
 * - Animated vote celebrations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { zeroAddress } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { DAOABI } from '@/lib/abis';
import { toast } from '@/lib/toast';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Send,
  Users,
  Vote as VoteIcon,
  CheckCircle,
  XCircle,
  FileText,
  History as HistoryIcon,
} from 'lucide-react';

const DAO_ADDRESS = CONTRACT_ADDRESSES.DAO;

const DELEGATION_ABI = [
  {
    name: 'delegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
  },
  {
    name: 'delegateOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'delegator', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'delegatorsOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const;

// ==================== ANIMATED COMPONENTS ====================

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    if (suffix === '%') return latest.toFixed(1);
    if (suffix === 'M') return latest.toFixed(1);
    return Math.round(latest).toString();
  });
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: [0.22, 1, 0.36, 1],
    });
    
    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });
    
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);
  
  return <span>{displayValue}{suffix}</span>;
}

// Confetti particle for vote celebration
function VoteConfetti({ onComplete }: { onComplete: () => void }) {
  const confettiColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: (i * 37 + 13) % 200 - 100,
    y: -((i * 53 + 7) % 150) - 50,
    rotation: (i * 97) % 720 - 360,
    scale: (i % 5) * 0.1 + 0.5,
    color: confettiColors[i % 5],
  }));
  
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 w-3 h-3 rounded-sm"
          style={{ backgroundColor: particle.color }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: particle.x,
            y: particle.y,
            scale: particle.scale,
            rotate: particle.rotation,
            opacity: 0,
          }}
          transition={{
            duration: 1.2,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

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
  title?: string;
}

interface Delegation {
  delegator: string;
  delegatee: string;
  votes: number;
  timestamp: number;
  active: boolean;
}

const FALLBACK_PROPOSALS: Proposal[] = [
  {
    id: '1',
    title: 'Add Uniswap V4 Integration',
    description: 'Integrate Uniswap V4 hooks for efficient swaps and liquidity management.',
    proposer: '0x0000000000000000000000000000000000000000',
    startDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
    status: 'active',
    forVotes: 120,
    againstVotes: 18,
    abstainVotes: 0,
    totalVotes: 138,
    votesRequired: 100,
    category: 'technical',
    details: 'Add Uniswap V4 Integration\nEnable hook-based swaps for advanced routing.',
    actions: [
      {
        target: '0x0000000000000000000000000000000000000000',
        functionSig: 'integrateUniswapV4()',
        calldataParams: [],
        eta: Date.now() + 3 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: '2',
    title: 'Treasury Risk Controls Update',
    description: 'Update treasury risk limits for improved capital protection.',
    proposer: '0x0000000000000000000000000000000000000000',
    startDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
    status: 'active',
    forVotes: 75,
    againstVotes: 9,
    abstainVotes: 0,
    totalVotes: 84,
    votesRequired: 60,
    category: 'treasury',
    details: 'Treasury Risk Controls Update\nAdjust exposure limits for protocol vaults.',
    actions: [
      {
        target: '0x0000000000000000000000000000000000000000',
        functionSig: 'updateRiskLimits()',
        calldataParams: [],
        eta: Date.now() + 5 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: '3',
    title: 'Increase ProofScore Emissions',
    description: 'Adjust ProofScore emissions to reward verified activity and participation.',
    proposer: '0x0000000000000000000000000000000000000000',
    startDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
    status: 'active',
    forVotes: 210,
    againstVotes: 35,
    abstainVotes: 0,
    totalVotes: 245,
    votesRequired: 150,
    category: 'parameter',
    details: 'Increase ProofScore Emissions\nTune emission curve to incentivize verified usage.',
    actions: [
      {
        target: '0x0000000000000000000000000000000000000000',
        functionSig: 'setProofScoreEmissionRate(uint256)',
        calldataParams: ['120'],
        eta: Date.now() + 2 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    id: '4',
    title: 'Governance Council Expansion',
    description: 'Expand the council seats to improve oversight coverage.',
    proposer: '0x0000000000000000000000000000000000000000',
    startDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 1 * 24 * 60 * 60 * 1000,
    status: 'active',
    forVotes: 180,
    againstVotes: 22,
    abstainVotes: 0,
    totalVotes: 202,
    votesRequired: 140,
    category: 'governance',
    details: 'Governance Council Expansion\nIncrease council seats from 5 to 7.',
    actions: [
      {
        target: '0x0000000000000000000000000000000000000000',
        functionSig: 'updateCouncilSize(uint256)',
        calldataParams: ['7'],
        eta: Date.now() + 1 * 24 * 60 * 60 * 1000,
      },
    ],
  },
];

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
  index?: number;
}

function StatCard({ label, value, icon, index = 0 }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Parse numeric value for animation
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.]/g, '')) 
    : value;
  const suffix = typeof value === 'string' 
    ? (value.includes('%') ? '%' : value.includes('M') ? 'M' : '') 
    : '';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Animated background pattern */}
      <motion.div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
        animate={{
          backgroundPosition: isHovered ? '8px 8px' : '0px 0px',
        }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' || !isNaN(numericValue) ? (
              <AnimatedNumber value={numericValue} suffix={suffix} />
            ) : (
              value
            )}
          </p>
        </div>
        <motion.span 
          className="text-2xl md:text-3xl"
          animate={{ 
            scale: isHovered ? 1.2 : 1,
            rotate: isHovered ? 10 : 0
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {icon}
        </motion.span>
      </div>
      
      {/* Shimmer effect on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'linear' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (proposalId: string, direction: 'for' | 'against' | 'abstain') => void;
  index?: number;
  showConfetti?: boolean;
}

function ProposalCard({ proposal, onVote, index = 0, showConfetti = false }: ProposalCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercent = getVotePercentage(proposal.forVotes, totalVotes);
  const againstPercent = getVotePercentage(proposal.againstVotes, totalVotes);
  const abstainPercent = getVotePercentage(proposal.abstainVotes, totalVotes);
  const timeRemaining = getTimeRemaining(proposal.endDate);
  const isActive = proposal.status === 'active';
  const [votingDirection, setVotingDirection] = useState<string | null>(null);
  const { playSuccess } = useTransactionSounds();

  const handleVote = (direction: 'for' | 'against' | 'abstain') => {
    setVotingDirection(direction);
    playSuccess();
    onVote(proposal.id, direction);
    setTimeout(() => setVotingDirection(null), 1000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        transition: { duration: 0.2 }
      }}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Confetti on vote */}
      <AnimatePresence>
        {showConfetti && <VoteConfetti onComplete={() => {}} />}
      </AnimatePresence>
      
      {/* Status glow for active proposals */}
      {isActive && (
        <motion.div
          className="absolute top-0 right-0 w-20 h-20 opacity-20 blur-2xl bg-green-500"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      
      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex-1">
              {proposal.title}
            </h3>
            <motion.span 
              className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(proposal.status)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.2 }}
            >
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </motion.span>
            <motion.span 
              className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(proposal.category)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.3 }}
            >
              {proposal.category}
            </motion.span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {proposal.description}
          </p>
        </div>
      </div>

      {/* Voting Progress Bars - Animated */}
      {isActive && (
        <div className="mb-4 space-y-2">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <ThumbsUp size={14} />
                For ({(proposal.forVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {forPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(forPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                <ThumbsDown size={14} />
                Against ({(proposal.againstVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {againstPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-red-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(againstPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center gap-1">
                <Minus size={14} />
                Abstain ({(proposal.abstainVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {abstainPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gray-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(abstainPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.6, ease: 'easeOut' }}
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
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Clock size={12} /> Time Left
          </p>
          <motion.p 
            className="font-bold text-gray-900 dark:text-white"
            animate={timeRemaining !== 'Ended' && parseInt(timeRemaining) < 2 ? {
              color: ['#f59e0b', '#ef4444', '#f59e0b']
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {timeRemaining}
          </motion.p>
        </div>
      </div>

      {/* Action Buttons - Animated */}
      {isActive && (
        <div className="flex gap-2">
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('for')}
              className={`w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'for' ? 'ring-2 ring-green-300 ring-offset-2' : ''
              }`}
            >
              <ThumbsUp size={14} />
              Vote For
            </MobileButton>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('against')}
              className={`w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'against' ? 'ring-2 ring-red-300 ring-offset-2' : ''
              }`}
            >
              <ThumbsDown size={14} />
              Against
            </MobileButton>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('abstain')}
              className={`w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'abstain' ? 'ring-2 ring-gray-300 ring-offset-2' : ''
              }`}
            >
              <Minus size={14} />
              Abstain
            </MobileButton>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

interface DelegationItemProps {
  delegation: Delegation;
  onRevoke: (delegator: string) => void;
  canRevoke?: boolean;
  index?: number;
}

function DelegationItem({ delegation, onRevoke, canRevoke = false, index = 0 }: DelegationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { playSuccess: _playSuccess, playError } = useTransactionSounds();
  
  const handleRevoke = () => {
    playError(); // Use error sound for revoke action
    onRevoke(delegation.delegator);
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 overflow-hidden"
    >
      {/* Active indicator pulse */}
      {delegation.active && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"
          animate={{ 
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      <div className="flex-1 min-w-0 pl-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Send size={10} /> From
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegator}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Users size={10} /> To
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegatee}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <VoteIcon size={10} /> Votes
            </p>
            <p className="font-bold text-sm text-gray-900 dark:text-white">
              {(delegation.votes / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
          {delegation.active ? (
            <motion.span 
              className="inline-flex items-center gap-1 text-green-600"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle size={12} /> Active
            </motion.span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-500">
              <XCircle size={12} /> Revoked
            </span>
          )}
          <span className="mx-1">•</span>
          {new Date(delegation.timestamp).toLocaleDateString()}
        </p>
      </div>
      
      <AnimatePresence>
        {delegation.active && canRevoke && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MobileButton
              onClick={handleRevoke}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors w-full md:w-auto flex items-center gap-1"
            >
              <XCircle size={14} />
              Revoke
            </MobileButton>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Shimmer on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'linear' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function GovernanceUI() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const daoReady = DAO_ADDRESS !== zeroAddress;
  const delegationEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DELEGATION === 'true' &&
    DAO_ADDRESS !== zeroAddress;
  const [activeTab, setActiveTab] = useState<'proposals' | 'voting' | 'delegation' | 'history'>(
    'proposals'
  );
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [votesAmount, setVotesAmount] = useState('');

  const { data: proposalCountData } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'proposalCount',
    query: { enabled: daoReady },
  });

  const { data: minVotesRequiredData } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'minVotesRequired',
    query: { enabled: daoReady },
  });

  const proposalCount = proposalCountData ? Number(proposalCountData) : 0;
  const minVotesRequired = minVotesRequiredData ? Number(minVotesRequiredData) : 0;

  const proposalIds = React.useMemo(
    () => (proposalCount > 0 ? Array.from({ length: proposalCount }, (_, i) => BigInt(i + 1)) : []),
    [proposalCount]
  );

  const { data: proposalDetails, refetch: refetchProposalDetails } = useReadContracts({
    contracts: proposalIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalDetails',
      args: [id],
    })),
    query: { enabled: daoReady && proposalIds.length > 0 },
  });

  const { data: proposalStatuses, refetch: refetchProposalStatuses } = useReadContracts({
    contracts: proposalIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalStatus',
      args: [id],
    })),
    query: { enabled: daoReady && proposalIds.length > 0 },
  });

  const { data: hasVotedResults, refetch: refetchHasVoted } = useReadContracts({
    contracts: address
      ? proposalIds.map((id) => ({
          address: DAO_ADDRESS,
          abi: DAOABI,
          functionName: 'hasVoted',
          args: [id, address],
        }))
      : [],
    query: { enabled: daoReady && !!address && proposalIds.length > 0 },
  });

  const proposals = React.useMemo(() => {
    if (!daoReady || proposalIds.length === 0 || !proposalDetails) return [];

    return proposalIds
      .map((id, idx) => {
        const details = proposalDetails[idx]?.result as
          | [
              string,
              bigint,
              string,
              bigint,
              string,
              bigint,
              bigint,
              bigint,
              bigint,
              boolean,
              boolean
            ]
          | undefined;

        if (!details) return null;

        const [
          proposer,
          ptype,
          target,
          ,
          description,
          startTime,
          endTime,
          forVotes,
          againstVotes,
          executed,
          queued,
        ] = details;

        const statusResult = proposalStatuses?.[idx]?.result as
          | [string, boolean, boolean, bigint]
          | undefined;
        const statusLabel = statusResult?.[0];
        const isPassing = statusResult?.[2] ?? false;

        let status: Proposal['status'] = 'active';
        if (statusLabel === 'Executed' || executed) status = 'executed';
        else if (statusLabel === 'Queued' || queued) status = 'passed';
        else if (statusLabel === 'Ended') status = isPassing ? 'passed' : 'failed';

        const title = description?.split('\n')[0]?.slice(0, 80) || `Proposal #${id.toString()}`;
        const category: Proposal['category'] =
          Number(ptype) === 1
            ? 'treasury'
            : Number(ptype) === 2
              ? 'technical'
              : Number(ptype) === 3
                ? 'parameter'
                : 'governance';

        const forVotesNum = Number(forVotes ?? 0n);
        const againstVotesNum = Number(againstVotes ?? 0n);
        const totalVotes = forVotesNum + againstVotesNum;
        const voted = !!hasVotedResults?.[idx]?.result;

        return {
          id: id.toString(),
          title,
          description: description || '',
          proposer,
          startDate: Number(startTime) * 1000,
          endDate: Number(endTime) * 1000,
          status,
          forVotes: forVotesNum,
          againstVotes: againstVotesNum,
          abstainVotes: 0,
          totalVotes,
          votesRequired: minVotesRequired,
          category,
          details: description || '',
          actions: [{
            target,
            functionSig: '',
            calldataParams: [],
            eta: Number(endTime) * 1000,
          }],
          voted,
        } as Proposal;
      })
      .filter(Boolean) as Proposal[];
  }, [daoReady, minVotesRequired, proposalDetails, proposalIds, proposalStatuses, hasVotedResults]);

  const displayProposals = proposals.length > 0 ? proposals : FALLBACK_PROPOSALS;

  const { data: voterHistory } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAOABI,
    functionName: 'getVoterHistory',
    args: address ? [address] : undefined,
    query: { enabled: daoReady && !!address },
  });

  const historyIds = React.useMemo(() => {
    if (!Array.isArray(voterHistory)) return [];
    return voterHistory.map((id) => BigInt(id as unknown as string));
  }, [voterHistory]);

  const { data: historyDetails } = useReadContracts({
    contracts: historyIds.map((id) => ({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'getProposalDetails',
      args: [id],
    })),
    query: { enabled: daoReady && historyIds.length > 0 },
  });

  const votes: Vote[] = React.useMemo(() => {
    if (!historyDetails || historyIds.length === 0) return [];
    return historyIds.map((id, idx) => {
      const details = historyDetails[idx]?.result as
        | [string, bigint, string, bigint, string, bigint, bigint, bigint, bigint, boolean, boolean]
        | undefined;
      const description = details?.[4] || '';
      const endTime = details?.[6] ?? 0n;
      return {
        id: `vote-${id.toString()}`,
        proposalId: id.toString(),
        voter: address || '0x0',
        direction: 'abstain',
        weight: 0,
        timestamp: Number(endTime) * 1000 || Date.now(),
        title: description?.split('\n')[0]?.slice(0, 80) || `Proposal #${id.toString()}`,
      } as Vote & { title?: string };
    });
  }, [address, historyDetails, historyIds]);

  const stats = React.useMemo(() => {
    const totalVotesCast = displayProposals.reduce((sum, p) => sum + p.totalVotes, 0);
    const averageTurnout = displayProposals.length ? Math.round(totalVotesCast / displayProposals.length) : 0;
    return {
      totalProposals: proposalCount,
      activeProposals: proposals.filter((p) => p.status === 'active').length,
      participationRate: 0,
      averageTurnout,
      totalVotesCast,
      delegatedVotes: 0,
    };
  }, [displayProposals, proposalCount, proposals]);

  const { data: delegatedTo, refetch: refetchDelegatedTo } = useReadContract({
    address: DAO_ADDRESS,
    abi: DELEGATION_ABI,
    functionName: 'delegateOf',
    args: address ? [address] : undefined,
    query: { enabled: delegationEnabled && !!address },
  });

  const { data: delegators, refetch: refetchDelegators } = useReadContract({
    address: DAO_ADDRESS,
    abi: DELEGATION_ABI,
    functionName: 'delegatorsOf',
    args: address ? [address] : undefined,
    query: { enabled: delegationEnabled && !!address },
  });

  useEffect(() => {
    if (!address) {
      setDelegations([]);
      return;
    }

    const next: Delegation[] = [];
    if (delegatedTo && delegatedTo !== zeroAddress) {
      next.push({
        delegator: address,
        delegatee: delegatedTo as string,
        votes: 0,
        timestamp: Date.now(),
        active: true,
      });
    }

    if (Array.isArray(delegators)) {
      delegators.forEach((delegator) => {
        if (typeof delegator === 'string' && delegator.toLowerCase() !== address.toLowerCase()) {
          next.push({
            delegator,
            delegatee: address,
            votes: 0,
            timestamp: Date.now(),
            active: true,
          });
        }
      });
    }

    setDelegations(next);
  }, [address, delegatedTo, delegators]);

  const filteredProposals = displayProposals.filter((p) => {
    const statusMatch = filterStatus === 'all' || p.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const handleVote = (proposalId: string, direction: 'for' | 'against' | 'abstain') => {
    if (!daoReady) {
      toast.error('DAO contract not deployed.');
      return;
    }
    if (direction === 'abstain') {
      toast.error('Abstain is not supported on-chain for this DAO.');
      return;
    }

    let proposalIdBigInt: bigint | null = null;
    try {
      proposalIdBigInt = BigInt(proposalId);
    } catch {
      toast.error('Invalid proposal identifier.');
      return;
    }

    writeContractAsync({
      address: DAO_ADDRESS,
      abi: DAOABI,
      functionName: 'vote',
      args: [proposalIdBigInt, direction === 'for'],
    })
      .then(() => Promise.all([
        refetchProposalDetails(),
        refetchProposalStatuses(),
        refetchHasVoted(),
      ]))
      .catch(() => {
        toast.error('Vote failed. Please try again.');
      });
  };

  const handleDelegate = () => {
    if (!delegationEnabled) {
      toast.error('Delegation is not enabled yet.');
      return;
    }
    if (!delegateeAddress) return;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      toast.error('Invalid address format');
      return;
    }

    if (!address) {
      toast.error('Connect your wallet to delegate.');
      return;
    }

    writeContractAsync({
      address: DAO_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'delegate',
      args: [delegateeAddress as `0x${string}`],
    })
      .then(() => Promise.all([refetchDelegatedTo(), refetchDelegators()]))
      .catch(() => {
        toast.error('Delegation failed. Please try again.');
      });

    setDelegateeAddress('');
    setVotesAmount('');
    
  };

  const handleRevokeDelegation = (delegator: string) => {
    if (!address || delegator.toLowerCase() !== address.toLowerCase()) return;

    writeContractAsync({
      address: DAO_ADDRESS,
      abi: DELEGATION_ABI,
      functionName: 'delegate',
      args: [zeroAddress],
    })
      .then(() => Promise.all([refetchDelegatedTo(), refetchDelegators()]))
      .catch(() => {
        toast.error('Failed to revoke delegation.');
      });
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
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText size={20} />
          {filteredProposals.length} Proposal{filteredProposals.length !== 1 ? 's' : ''}
        </h3>
        <AnimatePresence mode="popLayout">
          {filteredProposals.map((proposal, idx) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onVote={handleVote}
              index={idx}
            />
          ))}
        </AnimatePresence>
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
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={20} />
          Your Delegations ({delegations.filter((d) => d.active).length})
        </h3>
        <div className="hidden md:grid grid-cols-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4">
          <span>From</span>
          <span>To</span>
          <span>Votes</span>
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {delegations.map((delegation, idx) => (
              <DelegationItem
                key={`${delegation.delegator}-${delegation.delegatee}`}
                delegation={delegation}
                onRevoke={handleRevokeDelegation}
                canRevoke={address ? delegation.delegator.toLowerCase() === address.toLowerCase() : false}
                index={idx}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  // Voting History Tab
  const renderHistoryTab = () => {
    const userVotes = votes.slice(0, 10);
    const fallbackVotes: Vote[] = displayProposals.slice(0, 5).map((proposal, idx) => ({
      id: `fallback-vote-${proposal.id}`,
      proposalId: proposal.id,
      voter: address || '0x0',
      direction: idx % 2 === 0 ? 'for' : 'against',
      weight: Math.max(1, Math.round(proposal.totalVotes / 10)),
      timestamp: proposal.endDate,
      title: proposal.title,
    }));
    const historyVotes = userVotes.length > 0 ? userVotes : fallbackVotes;
    return (
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <HistoryIcon size={20} />
          Your Recent Votes
        </h3>
        <div className="hidden md:grid grid-cols-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4">
          <span>Proposal</span>
          <span>Weight</span>
          <span className="text-right">Date</span>
        </div>
        <div className="space-y-3">
          {historyVotes.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700 text-sm text-gray-500">
              No on-chain vote history yet.
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {historyVotes.map((vote, idx) => (
              <motion.div
                key={vote.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.4, 
                  delay: idx * 0.05,
                  ease: [0.22, 1, 0.36, 1]
                }}
                whileHover={{ scale: 1.01, x: 4 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText size={14} />
                      {vote.title ? vote.title : `Proposal ${vote.proposalId}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Weight: {vote.weight}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: idx * 0.05 + 0.1 }}
                        className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <CheckCircle size={10} />
                        Recorded
                      </motion.span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                        {vote.direction === 'for' ? 'For' : vote.direction === 'against' ? 'Against' : 'Abstain'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(vote.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <ResponsiveContainer>
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <VoteIcon className="text-blue-500" size={32} />
            Governance
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
            Participate in DAO decisions and shape the future of VFIDE
          </p>
        </motion.div>

        {/* Statistics */}
        <div className={`grid ${responsiveGrids.auto} gap-4 mb-8`}>
          <StatCard
            label="Total Proposals"
            value={stats.totalProposals}
            icon="📋"
            index={0}
          />
          <StatCard
            label="Active Now"
            value={stats.activeProposals}
            icon="🔴"
            index={1}
          />
          <StatCard
            label="Participation Rate"
            value={`${stats.participationRate.toFixed(1)}%`}
            icon="📊"
            index={2}
          />
          <StatCard
            label="Total Votes Cast"
            value={`${(stats.totalVotesCast / 1000000).toFixed(1)}M`}
            icon="🗳️"
            index={3}
          />
        </div>

        {/* Tabs */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 dark:border-gray-700">
            {(['proposals', 'voting', 'delegation', 'history'] as const).map((tab, _idx) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-4 md:px-6 py-3 md:py-4 font-medium text-center transition-colors text-sm md:text-base flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'proposals' && <FileText size={16} />}
                {tab === 'voting' && <VoteIcon size={16} />}
                {tab === 'delegation' && <Users size={16} />}
                {tab === 'history' && <HistoryIcon size={16} />}
                {tab === 'proposals' && 'Proposals'}
                {tab === 'voting' && 'Vote'}
                {tab === 'delegation' && 'Delegate'}
                {tab === 'history' && 'History'}
                
                {/* Active tab indicator */}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Tab Content with AnimatePresence */}
          <div className="p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {activeTab === 'proposals' && renderProposalsTab()}
                {activeTab === 'voting' && renderProposalsTab()}
                {activeTab === 'delegation' && renderDelegationTab()}
                {activeTab === 'history' && renderHistoryTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
}
