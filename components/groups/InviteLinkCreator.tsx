/**
 * Invite Link Creator Component
 * 
 * UI for creating and managing group invite links.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link as LinkIcon,
  Copy,
  Check,
  X,
  Clock,
  Users,
  Settings,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  InviteLink,
  EXPIRATION_OPTIONS,
  MAX_USES_OPTIONS,
  createInviteLinkUrl,
  formatExpirationTime,
  formatUsageLimit,
  isInviteLinkValid,
} from '@/lib/inviteLinks';
import { useAnnounce } from '@/lib/accessibility';

interface InviteLinkCreatorProps {
  groupId: string;
  groupName: string;
  onLinkCreated?: (link: InviteLink) => void;
}

export function InviteLinkCreator({
  groupId,
  groupName,
  onLinkCreated,
}: InviteLinkCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expiresIn, setExpiresIn] = useState(7 * 24 * 60 * 60 * 1000); // 7 days
  const [maxUses, setMaxUses] = useState(0); // Unlimited
  const [description, setDescription] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const { announce } = useAnnounce();

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const response = await fetch('/api/groups/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          createdBy: '0x...', // In production: get from auth
          expiresIn: expiresIn || undefined,
          maxUses: maxUses || undefined,
          description,
          requireApproval,
        }),
      });

      const data = await response.json();

      if (data.success) {
        announce('Invite link created', 'polite');
        onLinkCreated?.(data.invite);
        setIsOpen(false);
        // Reset form
        setDescription('');
        setExpiresIn(7 * 24 * 60 * 60 * 1000);
        setMaxUses(0);
        setRequireApproval(false);
      } else {
        announce(`Error: ${data.error}`, 'assertive');
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      announce('Failed to create invite link', 'assertive');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        aria-label="Create invite link"
      >
        <LinkIcon className="w-4 h-4" />
        Create Invite Link
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Create Invite Link</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    for {groupName}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Weekly meetup invite"
                    className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Expires after
                  </label>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {EXPIRATION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Uses */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Maximum uses
                  </label>
                  <select
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {MAX_USES_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Require Approval */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    checked={requireApproval}
                    onChange={(e) => setRequireApproval(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#0F0F14] text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="requireApproval" className="text-sm text-gray-300">
                    Require admin approval to join
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Create Link
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Invite Link Card Component
 * Displays an individual invite link with actions
 */
interface InviteLinkCardProps {
  link: InviteLink;
  onRevoke?: (code: string) => void;
  onDelete?: (code: string) => void;
}

export function InviteLinkCard({ link, onRevoke, onDelete }: InviteLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const { announce } = useAnnounce();
  const url = createInviteLinkUrl(link.code);
  const isValid = isInviteLinkValid(link);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      announce('Link copied to clipboard', 'polite');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`bg-[#1A1A1F] border rounded-lg p-4 ${
      isValid ? 'border-[#2A2A2F]' : 'border-red-900/30 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {link.metadata?.description && (
            <p className="text-white font-medium mb-1">{link.metadata.description}</p>
          )}
          <code className="text-xs text-gray-400 bg-[#0F0F14] px-2 py-1 rounded">
            {link.code}
          </code>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
            aria-label="Copy link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {onRevoke && isValid && (
            <button
              onClick={() => onRevoke(link.code)}
              className="p-2 hover:bg-[#2A2A2F] rounded-lg transition-colors"
              aria-label="Revoke link"
              title="Revoke"
            >
              <X className="w-4 h-4 text-yellow-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(link.code)}
              className="p-2 hover:bg-red-900/20 rounded-lg transition-colors"
              aria-label="Delete link"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatExpirationTime(link.expiresAt)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {formatUsageLimit(link)}
        </span>
      </div>

      {/* Status */}
      {!isValid && (
        <div className="mt-3 text-xs text-red-400">
          {!link.isActive && '🔴 Revoked'}
          {link.expiresAt && Date.now() > link.expiresAt && '⏰ Expired'}
          {link.maxUses && link.currentUses >= link.maxUses && '👥 Max uses reached'}
        </div>
      )}
    </div>
  );
}
