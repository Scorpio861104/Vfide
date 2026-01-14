'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Users,
  Star,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Friend } from '@/types/messaging';
import { formatAddress, STORAGE_KEYS } from '@/lib/messageEncryption';
import { PresenceDot } from './PresenceIndicator';
import { useBulkPresence } from '@/lib/presence';

interface FriendsListProps {
  onSelectFriend: (friend: Friend) => void;
  selectedFriend?: Friend;
}

export function FriendsList({ onSelectFriend, selectedFriend }: FriendsListProps) {
  const { address } = useAccount();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendAddress, setNewFriendAddress] = useState('');
  const [newFriendAlias, setNewFriendAlias] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'online'>('all');
  
  // Get presence for all friends
  const friendAddresses = friends.map(f => f.address);
  const presenceMap = useBulkPresence(friendAddresses);

  // Load friends from localStorage
  useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    if (stored) {
      try {
        setFriends(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load friends:', e);
      }
    }
  }, [address]);

  // Save friends to localStorage
  useEffect(() => {
    if (!address || friends.length === 0) return;
    
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_${address}`, JSON.stringify(friends));
  }, [address, friends]);

  const handleAddFriend = () => {
    if (!newFriendAddress || !address) return;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newFriendAddress)) {
      alert('Invalid wallet address');
      return;
    }
    
    // Check if already friends
    if (friends.some(f => f.address.toLowerCase() === newFriendAddress.toLowerCase())) {
      alert('Already in your friends list');
      return;
    }
    
    const newFriend: Friend = {
      address: newFriendAddress,
      alias: newFriendAlias || undefined,
      addedDate: Date.now(),
      isFavorite: false,
    };
    
    setFriends([...friends, newFriend]);
    setNewFriendAddress('');
    setNewFriendAlias('');
    setShowAddFriend(false);
  };

  const handleRemoveFriend = (friendAddress: string) => {
    if (confirm('Remove this friend?')) {
      setFriends(friends.filter(f => f.address !== friendAddress));
    }
  };

  const handleToggleFavorite = (friendAddress: string) => {
    setFriends(friends.map(f => 
      f.address === friendAddress ? { ...f, isFavorite: !f.isFavorite } : f
    ));
  };

  const filteredFriends = friends.filter(friend => {
    // Filter by search query
    const matchesSearch = 
      friend.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.alias?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Filter by type
    if (filter === 'favorites') return friend.isFavorite;
    if (filter === 'online') {
      const presence = presenceMap.get(friend.address);
      return presence?.status === 'online';
    }
    
    return true;
  });

  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#3A3A4F]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#F5F3E8] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00F0FF]" />
            Friends ({friends.length})
          </h2>
          <button
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="p-2 rounded-lg bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#00F0FF] focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'favorites', label: 'Favorites', icon: Star },
            { key: 'online', label: 'Online' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#00F0FF] text-[#0A0A0F]'
                  : 'text-[#A0A0A5] hover:text-[#F5F3E8]'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                {tab.icon && <tab.icon className="w-3 h-3" />}
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add Friend Form */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[#3A3A4F] overflow-hidden"
          >
            <div className="p-4 bg-[#0A0A0F]/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F5F3E8]">Add Friend</h3>
                <button onClick={() => setShowAddFriend(false)} className="text-[#6B6B78] hover:text-[#F5F3E8]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Wallet address (0x...)"
                value={newFriendAddress}
                onChange={(e) => setNewFriendAddress(e.target.value)}
                className="w-full px-3 py-2 mb-2 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#00F0FF] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Nickname (optional)"
                value={newFriendAlias}
                onChange={(e) => setNewFriendAlias(e.target.value)}
                className="w-full px-3 py-2 mb-3 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#00F0FF] focus:outline-none"
              />
              <button
                onClick={handleAddFriend}
                disabled={!newFriendAddress}
                className="w-full py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold text-sm hover:bg-[#00D5E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Friend
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto">
        {filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Users className="w-12 h-12 text-[#3A3A4F] mb-3" />
            <p className="text-[#6B6B78] text-sm">
              {friends.length === 0 ? 'No friends yet' : 'No friends match your search'}
            </p>
            <p className="text-[#6B6B78] text-xs mt-1">
              Add friends to start messaging
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredFriends.map((friend, idx) => (
              <motion.div
                key={friend.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onSelectFriend(friend)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-all group ${
                  selectedFriend?.address === friend.address
                    ? 'bg-[#00F0FF]/20 border border-[#00F0FF]/50'
                    : 'hover:bg-[#2A2A3F] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-[#0A0A0F] font-bold text-sm">
                      {friend.alias ? friend.alias?.[0]?.toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
                    </div>
                    <PresenceDot address={friend.address} position="bottom-right" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#F5F3E8] truncate">
                        {friend.alias || formatAddress(friend.address)}
                      </span>
                      {friend.isFavorite && (
                        <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
                      )}
                      {friend.proofScore && friend.proofScore >= 8000 && (
                        <Shield className="w-3 h-3 text-[#00F0FF]" />
                      )}
                    </div>
                    <span className="text-xs text-[#6B6B78]">
                      {friend.alias ? formatAddress(friend.address) : 'No nickname'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(friend.address);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#3A3A4F] text-[#A0A0A5] hover:text-[#FFD700] transition-colors"
                    >
                      <Star className={`w-4 h-4 ${friend.isFavorite ? 'fill-[#FFD700] text-[#FFD700]' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFriend(friend.address);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#3A3A4F] text-[#A0A0A5] hover:text-[#FF6B9D] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
