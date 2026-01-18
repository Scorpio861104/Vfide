/**
 * Simple Escrow Card Component
 * 
 * Simplified UI for escrow transactions:
 * - Clear status indicator (green/amber/red)
 * - Single suggested action button
 * - Progressive disclosure for details
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronDown,
  ChevronUp,
  MessageCircle
} from 'lucide-react';
import type { SimplifiedEscrow } from '@/lib/simplified/simple-escrow';
import { getSuggestedAction, getProtectionTimeRemaining } from '@/lib/simplified/simple-escrow';

interface SimpleEscrowCardProps {
  escrow: SimplifiedEscrow;
  userAddress: string;
  onConfirmDelivery?: (escrowId: string) => void;
  onReportIssue?: (escrowId: string) => void;
  onMarkDelivered?: (escrowId: string) => void;
  onViewMediation?: (escrowId: string) => void;
  loading?: boolean;
}

export function SimpleEscrowCard({
  escrow,
  userAddress,
  onConfirmDelivery,
  onReportIssue,
  onMarkDelivered,
  onViewMediation,
  loading = false,
}: SimpleEscrowCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const suggestedAction = getSuggestedAction(escrow, userAddress);
  const timeRemaining = getProtectionTimeRemaining(escrow.createdAt, 14);
  
  // State-based styling
  const stateConfig = {
    pending: {
      icon: Clock,
      color: 'amber',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    completed: {
      icon: CheckCircle2,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
    },
    needs_attention: {
      icon: AlertCircle,
      color: 'red',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
    },
  };
  
  const config = stateConfig[escrow.state];
  const StateIcon = config.icon;
  
  const handlePrimaryAction = () => {
    if (loading) return;
    
    switch (suggestedAction.action) {
      case 'confirm_delivery':
        onConfirmDelivery?.(escrow.id);
        break;
      case 'mark_delivered':
        onMarkDelivered?.(escrow.id);
        break;
      case 'view_mediation':
        onViewMediation?.(escrow.id);
        break;
      default:
        break;
    }
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm`}
    >
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Status & Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StateIcon className={`w-5 h-5 ${config.text}`} />
              <span className={`font-medium ${config.text}`}>
                {escrow.state === 'pending' && 'In Progress'}
                {escrow.state === 'completed' && 'Completed'}
                {escrow.state === 'needs_attention' && 'Needs Attention'}
              </span>
            </div>
            
            <p className="text-sm text-gray-400 mb-3">{escrow.status}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">Order:</span>
                <span className="ml-1 text-white font-mono">#{escrow.orderId}</span>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className="ml-1 text-white font-medium">{escrow.amount} {escrow.token}</span>
              </div>
            </div>
          </div>
          
          {/* Right: Action Button */}
          <div className="flex flex-col items-end gap-2">
            {suggestedAction.action && suggestedAction.action !== 'wait' && (
              <button
                onClick={handlePrimaryAction}
                disabled={loading}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${suggestedAction.action === 'confirm_delivery' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : suggestedAction.action === 'view_mediation'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {suggestedAction.action === 'view_mediation' && <MessageCircle className="w-4 h-4" />}
                    {suggestedAction.action === 'confirm_delivery' && <CheckCircle2 className="w-4 h-4" />}
                    {suggestedAction.action === 'mark_delivered' && <Package className="w-4 h-4" />}
                    <span>{suggestedAction.label}</span>
                  </>
                )}
              </button>
            )}
            
            {/* Time Remaining Indicator */}
            {escrow.state === 'pending' && !timeRemaining.expired && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining.days}d {timeRemaining.hours}h protection
              </div>
            )}
            
            {/* Secondary Action: Report Issue (for buyers) */}
            {suggestedAction.action === 'confirm_delivery' && !loading && (
              <button
                onClick={() => onReportIssue?.(escrow.id)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors underline"
              >
                Report an Issue
              </button>
            )}
          </div>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{expanded ? 'Hide' : 'Show'} Details</span>
        </button>
      </div>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 px-4 py-3 bg-black/20"
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Merchant</p>
                <p className="text-white font-mono text-xs truncate">{escrow.merchant}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Created</p>
                <p className="text-white text-xs">{escrow.createdAt.toLocaleDateString()}</p>
              </div>
              {escrow.autoReleaseDate && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Auto-Release Date</p>
                  <p className="text-white text-xs">
                    {escrow.autoReleaseDate.toLocaleString()}
                    <span className="text-gray-500 ml-2">(if no issues reported)</span>
                  </p>
                </div>
              )}
            </div>
            
            {/* Action Description */}
            <div className="mt-3 p-2 rounded bg-white/5 text-xs text-gray-400">
              💡 {suggestedAction.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Empty State Component
 */
export function EmptyEscrowState({ userRole }: { userRole: 'buyer' | 'merchant' }) {
  return (
    <div className="text-center py-12">
      <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-medium text-white mb-2">
        No {userRole === 'buyer' ? 'Purchases' : 'Sales'} Yet
      </h3>
      <p className="text-gray-400 max-w-md mx-auto">
        {userRole === 'buyer' 
          ? 'Your purchases will appear here. Escrow protects your payments until you confirm delivery.'
          : 'Your sales will appear here. Payments are held safely until buyer confirms delivery.'
        }
      </p>
    </div>
  );
}
