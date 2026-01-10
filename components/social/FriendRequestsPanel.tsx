'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Check,
  X,
  Shield,
  AlertTriangle,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { FriendRequest } from '@/types/friendRequests';
import { formatAddress, STORAGE_KEYS } from '@/lib/messageEncryption';

interface FriendRequestsPanelProps {
  onAccept: (request: FriendRequest) => void;
  onReject: (request: FriendRequest) => void;
}

export function FriendRequestsPanel({ onAccept, onReject }: FriendRequestsPanelProps) {
  const { address } = useAccount();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'history'>('pending');

  // Load requests from localStorage
  useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_requests_${address}`);
    if (stored) {
      try {
        const allRequests: FriendRequest[] = JSON.parse(stored);
        // Remove expired requests
        const now = Date.now();
        const validRequests = allRequests.filter(r => 
          !r.expiresAt || r.expiresAt > now
        );
        setRequests(validRequests);
      } catch (e) {
        console.error('Failed to load friend requests:', e);
      }
    }
  }, [address]);

  // Save requests to localStorage
  useEffect(() => {
    if (!address || requests.length === 0) return;
    
    localStorage.setItem(
      `${STORAGE_KEYS.FRIENDS}_requests_${address}`,
      JSON.stringify(requests)
    );
  }, [address, requests]);

  const handleAccept = (request: FriendRequest) => {
    // Update request status
    setRequests(requests.map(r => 
      r.id === request.id ? { ...r, status: 'accepted' } : r
    ));
    onAccept(request);
  };

  const handleReject = (request: FriendRequest) => {
    setRequests(requests.map(r => 
      r.id === request.id ? { ...r, status: 'rejected' } : r
    ));
    onReject(request);
  };

  const getTrustLevel = (proofScore?: number) => {
    if (!proofScore) return { label: 'Unknown', color: 'text-[#6B6B78]' };
    if (proofScore >= 8000) return { label: 'Elite', color: 'text-[#00F0FF]' };
    if (proofScore >= 5400) return { label: 'Trusted', color: 'text-[#50C878]' };
    if (proofScore >= 4000) return { label: 'Standard', color: 'text-[#FFD700]' };
    return { label: 'Low Trust', color: 'text-[#FF6B9D]' };
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'history') return r.status !== 'pending';
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#F5F3E8] flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#00F0FF]" />
          Friend Requests
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] rounded-full text-xs font-bold">
              {pendingCount}
            </span>
          )}
        </h3>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { key: 'pending', label: 'Pending' },
            { key: 'history', label: 'History' },
            { key: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#00F0FF] text-[#0A0A0F]'
                  : 'text-[#A0A0A5] hover:text-[#F5F3E8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-[#6B6B78] text-sm">
              {filter === 'pending' ? 'No pending requests' : 'No requests'}
            </div>
          ) : (
            filteredRequests.map((request, idx) => {
              const trustLevel = getTrustLevel(request.fromProofScore);
              const isPending = request.status === 'pending';

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border transition-all ${
                    isPending
                      ? 'bg-[#2A2A3F] border-[#3A3A4F] hover:border-[#00F0FF]/50'
                      : 'bg-[#0A0A0F] border-[#2A2A2F] opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-[#0A0A0F] font-bold shrink-0">
                      {request.fromAlias
                        ? request.fromAlias[0].toUpperCase()
                        : request.from.slice(2, 4).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#F5F3E8]">
                          {request.fromAlias || formatAddress(request.from)}
                        </span>
                        {request.fromProofScore !== undefined && (
                          <span className={`text-xs font-medium ${trustLevel.color}`}>
                            {trustLevel.label}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#6B6B78] mb-2">
                        {formatAddress(request.from)}
                      </p>

                      {request.message && (
                        <div className="mb-3 p-2 bg-[#1A1A2E] rounded-lg border border-[#3A3A4F]">
                          <p className="text-sm text-[#A0A0A5]">{request.message}</p>
                        </div>
                      )}

                      {/* Trust Warning */}
                      {request.fromProofScore !== undefined && request.fromProofScore < 4000 && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-[#FF6B9D]">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low trust score - Be cautious</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-[#6B6B78]">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(request.timestamp).toLocaleDateString()}</span>
                        {request.status !== 'pending' && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-[#3A3A4F] text-[#A0A0A5]">
                            {request.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {isPending && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAccept(request)}
                          className="p-2 rounded-lg bg-[#50C878]/20 text-[#50C878] hover:bg-[#50C878]/30 transition-colors"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          className="p-2 rounded-lg bg-[#FF6B9D]/20 text-[#FF6B9D] hover:bg-[#FF6B9D]/30 transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
