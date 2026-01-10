'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, User, Share2 } from 'lucide-react';
import { Friend } from '@/types/messaging';
import { formatAddress } from '@/lib/messageEncryption';
import { UserDisplay } from '@/components/common/UserDisplay';

interface MutualFriendsProps {
  userAddress: string;
  currentUserAddress: string;
}

export function MutualFriends({ userAddress, currentUserAddress }: MutualFriendsProps) {
  const [mutualFriends, setMutualFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const findMutualFriends = () => {
      try {
        // Load current user's friends
        const myFriendsData = localStorage.getItem(`vfide_friends_${currentUserAddress}`);
        const myFriends: Friend[] = myFriendsData ? JSON.parse(myFriendsData) : [];

        // Load other user's friends
        const theirFriendsData = localStorage.getItem(`vfide_friends_${userAddress}`);
        const theirFriends: Friend[] = theirFriendsData ? JSON.parse(theirFriendsData) : [];

        // Find mutual friends
        const mutual = myFriends.filter(myFriend =>
          theirFriends.some(theirFriend => 
            theirFriend.address.toLowerCase() === myFriend.address.toLowerCase()
          )
        );

        setMutualFriends(mutual);
      } catch (error) {
        console.error('Failed to find mutual friends:', error);
        setMutualFriends([]);
      } finally {
        setLoading(false);
      }
    };

    findMutualFriends();
  }, [userAddress, currentUserAddress, isClient]);

  if (loading) {
    return (
      <div className="p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-[#2A2A2F] rounded w-32" />
          <div className="h-3 bg-[#2A2A2F] rounded w-24" />
        </div>
      </div>
    );
  }

  if (mutualFriends.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl"
    >
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-[#00F0FF]" />
        <h4 className="font-semibold text-[#F5F3E8]">
          Mutual Friends ({mutualFriends.length})
        </h4>
      </div>

      {mutualFriends.length <= 3 ? (
        <div className="space-y-2">
          {mutualFriends.map((friend) => (
            <div
              key={friend.address}
              className="flex items-center gap-2 p-2 bg-[#1A1A2E] rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-xs font-bold text-[#F5F3E8]">
                {(friend.alias || friend.address).slice(0, 2).toUpperCase()}
              </div>
              <UserDisplay address={friend.address} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex -space-x-2 mb-2">
            {mutualFriends.slice(0, 5).map((friend, index) => (
              <div
                key={friend.address}
                className="w-8 h-8 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-xs font-bold text-[#F5F3E8] border-2 border-[#0A0A0F]"
                style={{ zIndex: 5 - index }}
                title={friend.alias || formatAddress(friend.address)}
              >
                {(friend.alias || friend.address).slice(0, 2).toUpperCase()}
              </div>
            ))}
            {mutualFriends.length > 5 && (
              <div
                className="w-8 h-8 rounded-full bg-[#2A2A3F] flex items-center justify-center text-xs font-bold text-[#F5F3E8] border-2 border-[#0A0A0F]"
                style={{ zIndex: 0 }}
              >
                +{mutualFriends.length - 5}
              </div>
            )}
          </div>
          <p className="text-xs text-[#A0A0A5]">
            Including {mutualFriends.slice(0, 2).map(f => f.alias || formatAddress(f.address)).join(', ')}
            {mutualFriends.length > 2 && ` and ${mutualFriends.length - 2} more`}
          </p>
        </div>
      )}
    </motion.div>
  );
}
