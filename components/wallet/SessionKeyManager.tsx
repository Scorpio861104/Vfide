'use client';

/**
 * Session Keys UI Component
 * 
 * Manage pre-approved transaction sessions for seamless UX.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Address } from 'viem';
import {
  Key,
  Plus,
  Trash2,
  Clock,
  Shield,
  AlertTriangle,
  ChevronDown,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import {
  useSessionKeys,
  type SessionKey,
  type CreateSessionParams,
  createContractPermission,
} from '@/lib/sessionKeys/sessionKeyService';

// ==================== TYPES ====================

export interface SessionKeyManagerProps {
  /** Target contracts to show presets for */
  targetContracts?: { address: Address; name: string }[];
  /** Custom class name */
  className?: string;
}

export interface SessionKeyCardProps {
  session: SessionKey;
  onRevoke: (id: string) => void;
}

export interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateSessionParams) => Promise<void>;
  targetContracts?: { address: Address; name: string }[];
}

// ==================== UTILITY FUNCTIONS ====================

function formatTimeRemaining(validUntil: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = validUntil - now;

  if (remaining <= 0) return 'Expired';
  if (remaining < 60) return `${remaining}s`;
  if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
  if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
  return `${Math.floor(remaining / 86400)}d`;
}

function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ==================== SESSION KEY CARD ====================

function SessionKeyCard({ session, onRevoke }: SessionKeyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = session.validUntil < now;
  const isActive = session.isActive && !isExpired;

  return (
    <motion.div
      layout
      className={`
        border rounded-xl overflow-hidden transition-colors
        ${isActive
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
        }
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <Key className={`w-5 h-5 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium font-mono text-sm">
                {session.id.slice(0, 12)}...
              </span>
              {isActive ? (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                  {isExpired ? 'Expired' : 'Revoked'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(session.validUntil)}
              </span>
              <span>{session.callsUsed} calls used</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRevoke(session.id);
              }}
              className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Permissions */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Permissions
                </p>
                {session.permissions.map((permission, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg text-sm"
                  >
                    <span className="font-mono text-xs">
                      {formatAddress(permission.target)}
                    </span>
                    <span className="text-gray-500">
                      {permission.maxCalls} calls max
                    </span>
                  </div>
                ))}
              </div>

              {/* Session Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">
                    {new Date(session.createdAt * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500">Expires</p>
                  <p className="font-medium">
                    {new Date(session.validUntil * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== CREATE SESSION DIALOG ====================

function CreateSessionDialog({
  isOpen,
  onClose,
  onSubmit,
  targetContracts = [],
}: CreateSessionDialogProps) {
  const [duration, setDuration] = useState(3600); // 1 hour
  const [selectedContract, setSelectedContract] = useState<Address | ''>('');
  const [maxCalls, setMaxCalls] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        permissions: [
          createContractPermission(selectedContract, BigInt(0.1 * 1e18), BigInt(1 * 1e18), maxCalls),
        ],
        duration,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Create Session Key</h2>
        <p className="text-sm text-gray-500 mb-6">
          Pre-approve transactions for a specific contract. This allows faster interactions without signing each time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contract Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Target Contract</label>
            {targetContracts.length > 0 ? (
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value as Address)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                required
              >
                <option value="">Select a contract</option>
                {targetContracts.map((contract) => (
                  <option key={contract.address} value={contract.address}>
                    {contract.name} ({formatAddress(contract.address)})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value as Address)}
                placeholder="0x..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono"
                required
              />
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1">Session Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '1h', value: 3600 },
                { label: '6h', value: 21600 },
                { label: '24h', value: 86400 },
                { label: '7d', value: 604800 },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDuration(value)}
                  className={`
                    py-2 rounded-lg text-sm font-medium transition-colors
                    ${duration === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Calls */}
          <div>
            <label className="block text-sm font-medium mb-1">Max Transactions</label>
            <input
              type="number"
              value={maxCalls}
              onChange={(e) => setMaxCalls(parseInt(e.target.value) || 1)}
              min={1}
              max={1000}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              Session keys allow transactions without your explicit approval. Only create sessions for trusted contracts.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedContract || isSubmitting}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export function SessionKeyManager({ targetContracts = [], className = '' }: SessionKeyManagerProps) {
  const {
    sessions,
    activeSessions,
    createSession,
    revokeSession,
    revokeAll,
    hasActiveSessions,
    refresh,
  } = useSessionKeys();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleCreateSession = async (params: CreateSessionParams) => {
    await createSession(params);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold">Session Keys</h2>
          {hasActiveSessions && (
            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
              {activeSessions.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
        <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300">
            Faster Transactions
          </p>
          <p className="text-blue-600 dark:text-blue-400">
            Session keys let you pre-approve actions for seamless interactions without signing each time.
          </p>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionKeyCard
              key={session.id}
              session={session}
              onRevoke={revokeSession}
            />
          ))}

          {hasActiveSessions && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to revoke all active sessions?')) {
                  revokeAll();
                }
              }}
              className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Revoke All Sessions
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium">No session keys</p>
          <p className="text-sm mt-1">Create a session to enable faster transactions</p>
        </div>
      )}

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <CreateSessionDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSubmit={handleCreateSession}
            targetContracts={targetContracts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default SessionKeyManager;
