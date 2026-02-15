'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Users,
  Star,
  Search,
  Shield,
  Trash2,
  X,
  MessageCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Friend } from '@/types/messaging';
import { formatAddress, STORAGE_KEYS } from '@/lib/messageEncryption';
import { PresenceDot } from './PresenceIndicator';
import { useBulkPresence } from '@/lib/presence';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface FriendsListProps {
  onSelectFriend: (friend: Friend) => void;
  selectedFriend?: Friend;
}

export function FriendsList({ onSelectFriend, selectedFriend }: FriendsListProps) {
  const { address } = useAccount();
  const [friendsByAddress, setFriendsByAddress] = useState<Record<string, Friend[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendAddress, setNewFriendAddress] = useState('');
  const [newFriendAlias, setNewFriendAlias] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'online'>('all');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const { playSuccess, playNotification, playError } = useTransactionSounds();
  
  const friends = useMemo(() => {
    if (!address) return [];
    const inMemory = friendsByAddress[address];
    if (inMemory) return inMemory;
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    if (!stored) return [];

    try {
      return JSON.parse(stored) as Friend[];
    } catch (e) {
      console.error('Failed to load friends:', e);
      return [];
    }
  }, [address, friendsByAddress]);

  const setFriends = (nextFriends: Friend[]) => {
    if (!address) return;
    setFriendsByAddress((prev) => ({ ...prev, [address]: nextFriends }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_${address}`, JSON.stringify(nextFriends));
    }
  };

  // Get presence for all friends
  const friendAddresses = friends.map(f => f.address);
  const presenceMap = useBulkPresence(friendAddresses);
  
  // Count online friends
  const onlineCount = friends.filter(f => presenceMap.get(f.address)?.status === 'online').length;

  const handleAddFriend = () => {
    if (!newFriendAddress || !address) return;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newFriendAddress)) {
      playError();
      alert('Invalid wallet address');
      return;
    }
    
    // Check if already friends
    if (friends.some(f => f.address.toLowerCase() === newFriendAddress.toLowerCase())) {
      playError();
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
    setJustAdded(newFriendAddress);
    setTimeout(() => setJustAdded(null), 2000);
    setNewFriendAddress('');
    setNewFriendAlias('');
    setShowAddFriend(false);
    playSuccess();
  };

  const handleRemoveFriend = (friendAddress: string) => {
    if (confirm('Remove this friend?')) {
      setFriends(friends.filter(f => f.address !== friendAddress));
      playNotification();
    }
  };

  const handleToggleFavorite = (friendAddress: string) => {
    setFriends(friends.map(f => 
      f.address === friendAddress ? { ...f, isFavorite: !f.isFavorite } : f
    ));
    playNotification();
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
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Users className="w-5 h-5 text-cyan-400" />
            </motion.div>
            Friends
            <span className="text-sm font-normal text-zinc-500">({friends.length})</span>
            {onlineCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full"
              >
                {onlineCount} online
              </motion.span>
            )}
          </h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setShowAddFriend(!showAddFriend);
              playNotification();
            }}
            className={`p-2 rounded-lg transition-colors ${
              showAddFriend 
                ? 'bg-cyan-400 text-zinc-950' 
                : 'bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20'
            }`}
          >
            {showAddFriend ? <X className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-950 rounded-xl">
          {[
            { key: 'all', label: 'All' },
            { key: 'favorites', label: 'Favorites', icon: Star },
            { key: 'online', label: 'Online' },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key as 'all' | 'favorites' | 'online');
                playNotification();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {filter === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-cyan-400 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1">
                {tab.icon && <tab.icon className="w-3 h-3" />}
                {tab.label}
              </span>
            </motion.button>
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-b border-zinc-700 overflow-hidden"
          >
            <div className="p-4 bg-linear-to-b from-cyan-400/5 to-transparent">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Add New Friend
                </h3>
              </div>
              <input
                type="text"
                placeholder="Wallet address (0x...)"
                value={newFriendAddress}
                onChange={(e) => setNewFriendAddress(e.target.value)}
                className="w-full px-3 py-2.5 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
              />
              <input
                type="text"
                placeholder="Nickname (optional)"
                value={newFriendAlias}
                onChange={(e) => setNewFriendAlias(e.target.value)}
                className="w-full px-3 py-2.5 mb-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:border-cyan-400 focus:outline-none transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddFriend}
                disabled={!newFriendAddress}
                className="w-full py-2.5 bg-linear-to-r from-cyan-400 to-[#00D5E0] text-zinc-950 rounded-xl font-semibold text-sm hover:from-[#00D5E0] hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Friend
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredFriends.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full p-8 text-center"
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Users className="w-14 h-14 text-zinc-700 mb-3" />
              </motion.div>
              <p className="text-zinc-500 text-sm">
                {friends.length === 0 ? 'No friends yet' : 'No friends match your search'}
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                Add friends to start messaging
              </p>
            </motion.div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredFriends.map((friend, idx) => {
                const presence = presenceMap.get(friend.address);
                const isOnline = presence?.status === 'online';
                const isJustAdded = justAdded === friend.address;
                
                return (
                  <motion.div
                    key={friend.address}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      scale: 1,
                      boxShadow: isJustAdded ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none'
                    }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => {
                      onSelectFriend(friend);
                      playNotification();
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all group relative overflow-hidden ${
                      selectedFriend?.address === friend.address
                        ? 'bg-cyan-400/20 border border-cyan-400/50'
                        : 'hover:bg-zinc-800 border border-transparent'
                    }`}
                  >
                    {/* Online glow effect */}
                    {isOnline && (
                      <motion.div
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-linear-to-r from-green-500/10 to-transparent pointer-events-none"
                      />
                    )}
                    
                    {/* Just added celebration */}
                    {isJustAdded && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 0] }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-2 right-2"
                      >
                        <Check className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                    
                    <div className="relative flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          className="w-11 h-11 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-lg"
                        >
                          {friend.alias ? friend.alias?.[0]?.toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
                        </motion.div>
                        <PresenceDot address={friend.address} position="bottom-right" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-zinc-100 truncate">
                            {friend.alias || formatAddress(friend.address)}
                          </span>
                          {friend.isFavorite && (
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                            >
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            </motion.div>
                          )}
                          {friend.proofScore && friend.proofScore >= 8000 && (
                            <Shield className="w-3 h-3 text-cyan-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500">
                            {friend.alias ? formatAddress(friend.address) : 'No nickname'}
                          </span>
                          {isOnline && (
                            <span className="text-xs text-green-400">• Online</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(friend.address);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors"
                        >
                          <Star className={`w-4 h-4 ${friend.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFriend(friend);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.address);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-pink-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
