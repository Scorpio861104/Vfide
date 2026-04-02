'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Key, Plus, RefreshCcw, Zap, Shield } from 'lucide-react';
import { useSessionKeys, type CreateSessionParams } from '@/lib/sessionKeys/sessionKeyService';
import { type SessionKeyManagerProps } from './session-key-types';
import { SessionKeyCard } from './SessionKeyCard';
import { CreateSessionDialog } from './CreateSessionDialog';

export function SessionKeyManager({ targetContracts = [], className = '' }: SessionKeyManagerProps) {
  const { sessions, activeSessions, createSession, revokeSession, revokeAll, hasActiveSessions, refresh } = useSessionKeys();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className={className}>
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
          <button onClick={refresh} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <RefreshCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors">
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
        <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-700 dark:text-blue-300">Faster Transactions</p>
          <p className="text-blue-600 dark:text-blue-400">
            Session keys let you pre-approve actions for seamless interactions without signing each time.
          </p>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionKeyCard key={session.id} session={session} onRevoke={revokeSession} />
          ))}
          {hasActiveSessions && (
            <button onClick={() => { if (confirm('Are you sure you want to revoke all active sessions?')) revokeAll(); }}
              className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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

      <AnimatePresence>
        {showCreateDialog && (
          <CreateSessionDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSubmit={async (params: CreateSessionParams) => {
              await createSession(params);
            }}
            targetContracts={targetContracts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default SessionKeyManager;
