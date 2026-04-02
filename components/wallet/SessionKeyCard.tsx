'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Trash2, Clock, ChevronDown } from 'lucide-react';
import { shortAddress as formatAddress } from '@/lib/format';
import { type SessionKeyCardProps, formatTimeRemaining } from './session-key-types';

export function SessionKeyCard({ session, onRevoke }: SessionKeyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = session.validUntil < now;
  const isActive = session.isActive && !isExpired;

  return (
    <motion.div
      layout
      className={`border rounded-xl overflow-hidden transition-colors ${
        isActive
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      }`}
    >
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <Key className={`w-5 h-5 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium font-mono text-sm">{session.id.slice(0, 12)}...</span>
              {isActive ? (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Active</span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 text-xs rounded-full">{isExpired ? 'Expired' : 'Revoked'}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeRemaining(session.validUntil)}</span>
              <span>{session.callsUsed} calls used</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <button onClick={(e) => { e.stopPropagation(); onRevoke(session.id); }}
              className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Permissions</p>
                {session.permissions.map((permission, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                    <span className="font-mono text-xs">{formatAddress(permission.target)}</span>
                    <span className="text-gray-500">{permission.maxCalls} calls max</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{new Date(session.createdAt * 1000).toLocaleDateString()}</p>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-500">Expires</p>
                  <p className="font-medium">{new Date(session.validUntil * 1000).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
