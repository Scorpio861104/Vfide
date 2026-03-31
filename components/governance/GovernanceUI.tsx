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
import { safeParseInt } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { 
  Vote as VoteIcon, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Send,
  History,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';

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
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 200 - 100,
    y: Math.random() * -150 - 50,
    rotation: Math.random() * 720 - 360,
    scale: Math.random() * 0.5 + 0.5,
    color: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
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

// ==================== INITIAL STATE (replace with on-chain reads when DAO delegation is enabled) ====================

function getInitialProposals(): Proposal[] {
  return [];
}

function getInitialVotes(): Vote[] {
  return [];
}

function getInitialDelegations(): Delegation[] {
  return [];
}

function getInitialGovernanceStats(): GovernanceStats {
  return {
    totalProposals: 0,
    activeProposals: 0,
    participationRate: 0,
    averageTurnout: 0,
    totalVotesCast: 0,
    delegatedVotes: 0,
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
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
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
  index?: number;
}

function DelegationItem({ delegation, onRevoke, index = 0 }: DelegationItemProps) {
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
        {delegation.active && (
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
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
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
  const [activeTab, setActiveTab] = useState<'proposals' | 'voting' | 'delegation' | 'history'>(
    'proposals'
  );
  const [proposals, setProposals] = useState(getInitialProposals());
  const [votes, setVotes] = useState(getInitialVotes());
  const [delegations, setDelegations] = useState(getInitialDelegations());
  const [stats] = useState(getInitialGovernanceStats());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [votesAmount, setVotesAmount] = useState('');
  const [delegateError, setDelegateError] = useState('');

  const filteredProposals = proposals.filter((p) => {
    const statusMatch = filterStatus === 'all' || p.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const handleVote = (proposalId: string, direction: 'for' | 'against' | 'abstain') => {
    const weight = 0;
    if (weight <= 0) {
      setDelegateError('Vote weight data is unavailable in this UI preview.');
      return;
    }
    const newVote: Vote = {
      id: `vote-${Date.now()}`,
      proposalId,
      voter: 'unknown',
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

  // DAO v1 intentionally does not expose on-chain delegation calls.
  // Keep this tab as a read-only preview until a timelocked DAO upgrade adds delegate/undelegate functions.
  const handleDelegate = () => {
    if (!delegateeAddress || !votesAmount) return;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      setDelegateError('Invalid address format');
      return;
    }

    const parsedVotes = safeParseInt(votesAmount, 0);
    if (parsedVotes <= 0) {
      setDelegateError('Delegation is unavailable in DAO v1. Entered amount is ignored.');
      return;
    }

    setDelegateError('Delegation actions are disabled until DAO delegation is activated on-chain.');
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
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        Delegation is read-only in DAO v1. The contract emits delegation events but does not yet expose delegation transactions.
      </div>

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
              onChange={(e) => { setDelegateeAddress(e.target.value); setDelegateError(''); }}
            />
            {delegateError && (
              <p className="mt-1 text-sm text-red-500">{delegateError}</p>
            )}
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
            Delegation Unavailable
          </MobileButton>
        </div>
      </div>

      {/* Active Delegations */}
      <div className="space-y-4">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={20} />
          Your Delegations ({delegations.filter((d) => d.active).length})
        </h3>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {delegations.map((delegation, idx) => (
              <DelegationItem
                key={`${delegation.delegator}-${delegation.delegatee}`}
                delegation={delegation}
                onRevoke={handleRevokeDelegation}
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
    return (
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History size={20} />
          Your Recent Votes
        </h3>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {userVotes.map((vote, idx) => (
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
                      Proposal {vote.proposalId}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: idx * 0.05 + 0.1 }}
                        className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                          vote.direction === 'for'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : vote.direction === 'against'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {vote.direction === 'for' && <ThumbsUp size={10} />}
                        {vote.direction === 'against' && <ThumbsDown size={10} />}
                        {vote.direction === 'abstain' && <Minus size={10} />}
                        {vote.direction.charAt(0).toUpperCase() + vote.direction.slice(1)}
                      </motion.span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <TrendingUp size={10} />
                        Weight: {(vote.weight / 1000000).toFixed(2)}M
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
                {tab === 'history' && <History size={16} />}
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
