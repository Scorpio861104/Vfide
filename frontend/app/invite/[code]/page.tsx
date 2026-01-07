/**
 * Invite Page - Join Group via Invite Link
 * 
 * Landing page for users clicking on invite links.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatExpirationTime, formatUsageLimit } from '@/lib/inviteLinks';
import { useAnnounce } from '@/lib/accessibility';

interface InviteData {
  invite: {
    id: string;
    groupId: string;
    code: string;
    createdAt: number;
    expiresAt?: number;
    maxUses?: number;
    currentUses: number;
    metadata?: {
      description?: string;
      requireApproval?: boolean;
    };
  };
  valid: boolean;
  group?: {
    name: string;
    avatar?: string;
    description?: string;
    memberCount?: number;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { announce } = useAnnounce();
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const code = params?.code as string;

  // Load invite data
  useEffect(() => {
    if (!code) return;

    const loadInvite = async () => {
      try {
        const response = await fetch(`/api/groups/invites?code=${code}`);
        const data = await response.json();

        if (data.success) {
          setInviteData(data);
          
          if (!data.valid) {
            setError('This invite link is no longer valid');
            announce('Invite link is invalid', 'assertive');
          }
        } else {
          setError(data.error || 'Invalid invite link');
          announce('Invalid invite link', 'assertive');
        }
      } catch (err) {
        setError('Failed to load invite');
        announce('Failed to load invite', 'assertive');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [code, announce]);

  const handleJoin = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!inviteData?.valid) {
      setError('This invite link is no longer valid');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        if (data.status === 'pending') {
          announce('Join request sent for approval', 'polite');
        } else {
          announce('Successfully joined group', 'polite');
        }

        // Redirect after success
        setTimeout(() => {
          router.push(`/groups/${data.groupId}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to join group');
        announce(`Error: ${data.error}`, 'assertive');
      }
    } catch (err) {
      setError('Failed to join group');
      announce('Failed to join group', 'assertive');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1F] border border-red-900/30 rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A1F] border border-green-900/30 rounded-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome!</h1>
          <p className="text-gray-400 mb-4">
            {inviteData?.invite.metadata?.requireApproval
              ? 'Your request to join has been sent to the group admins'
              : 'Successfully joined the group'}
          </p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-8 max-w-md w-full"
      >
        {/* Group Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            You've been invited!
          </h1>
          <p className="text-gray-400">
            {inviteData?.invite.metadata?.description || 'Join this group on VFIDE'}
          </p>
        </div>

        {/* Invite Details */}
        <div className="bg-[#0F0F14] rounded-lg p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Expires
            </span>
            <span className="text-white">
              {formatExpirationTime(inviteData?.invite.expiresAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Uses
            </span>
            <span className="text-white">
              {inviteData && formatUsageLimit(inviteData.invite)}
            </span>
          </div>
          {inviteData?.invite.metadata?.requireApproval && (
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <Shield className="w-4 h-4" />
              Requires admin approval
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!isConnected ? (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                Connect your wallet to join this group
              </p>
              {/* Web3 connect button would go here */}
              <button className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Connect Wallet
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleJoin}
                disabled={joining || !inviteData?.valid}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Join Group
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Maybe Later
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-6">
          By joining, you agree to the group's rules and VFIDE's terms of service
        </p>
      </motion.div>
    </div>
  );
}
