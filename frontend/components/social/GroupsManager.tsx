'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  X,
  Shield,
  Lock,
  Crown,
  Settings,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Group, Friend } from '@/types/messaging';
import { formatAddress, STORAGE_KEYS } from '@/lib/messageEncryption';

interface GroupsManagerProps {
  friends: Friend[];
  onSelectGroup: (group: Group) => void;
  selectedGroup?: Group;
}

export function GroupsManager({ friends, onSelectGroup, selectedGroup }: GroupsManagerProps) {
  const { address } = useAccount();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load groups from localStorage
  useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEYS.GROUPS}_${address}`);
    if (stored) {
      try {
        setGroups(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load groups:', e);
      }
    }
  }, [address]);

  // Save groups to localStorage
  useEffect(() => {
    if (!address || groups.length === 0) return;
    
    localStorage.setItem(`${STORAGE_KEYS.GROUPS}_${address}`, JSON.stringify(groups));
  }, [address, groups]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !address) return;
    
    if (selectedMembers.length < 2) {
      alert('Groups need at least 2 other members');
      return;
    }
    
    const newGroup: Group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newGroupName,
      description: newGroupDescription || undefined,
      members: [address, ...selectedMembers],
      admins: [address],
      creator: address,
      createdAt: Date.now(),
      isPrivate: true,
    };
    
    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedMembers([]);
    setShowCreateGroup(false);
  };

  const handleLeaveGroup = (groupId: string) => {
    if (confirm('Leave this group? You will lose access to all messages.')) {
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const toggleMemberSelection = (memberAddress: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberAddress)
        ? prev.filter(a => a !== memberAddress)
        : [...prev, memberAddress]
    );
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#3A3A4F]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#F5F3E8] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#A78BFA]" />
            Groups ({groups.length})
          </h2>
          <button
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="p-2 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] hover:bg-[#A78BFA]/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#A78BFA] focus:outline-none"
          />
        </div>
      </div>

      {/* Create Group Form */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[#3A3A4F] overflow-hidden"
          >
            <div className="p-4 bg-[#0A0A0F]/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#F5F3E8]">Create Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="text-[#6B6B78] hover:text-[#F5F3E8]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 mb-2 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#A78BFA] focus:outline-none"
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="w-full px-3 py-2 mb-3 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#A78BFA] focus:outline-none"
              />

              <div className="mb-3">
                <label className="text-xs text-[#A0A0A5] mb-2 block">Select Members (min 2):</label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-2">
                  {friends.length === 0 ? (
                    <p className="text-xs text-[#6B6B78] p-2">No friends to add</p>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.address}
                        onClick={() => toggleMemberSelection(friend.address)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.includes(friend.address)
                            ? 'bg-[#A78BFA]/20 border border-[#A78BFA]/50'
                            : 'hover:bg-[#2A2A3F]'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center text-[#F5F3E8] text-xs font-bold">
                          {friend.alias ? friend.alias[0].toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
                        </div>
                        <span className="text-xs text-[#F5F3E8] flex-1">
                          {friend.alias || formatAddress(friend.address)}
                        </span>
                        {selectedMembers.includes(friend.address) && (
                          <Shield className="w-3 h-3 text-[#A78BFA]" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName || selectedMembers.length < 2}
                className="w-full py-2 bg-[#A78BFA] text-[#0A0A0F] rounded-lg font-semibold text-sm hover:bg-[#9370DB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Group ({selectedMembers.length} members)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Users className="w-12 h-12 text-[#3A3A4F] mb-3" />
            <p className="text-[#6B6B78] text-sm">
              {groups.length === 0 ? 'No groups yet' : 'No groups match your search'}
            </p>
            <p className="text-[#6B6B78] text-xs mt-1">
              Create a group to chat with multiple friends
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredGroups.map((group, idx) => {
              const isAdmin = group.admins.includes(address || '');
              const isCreator = group.creator === address;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelectGroup(group)}
                  className={`p-3 mb-2 rounded-lg cursor-pointer transition-all group ${
                    selectedGroup?.id === group.id
                      ? 'bg-[#A78BFA]/20 border border-[#A78BFA]/50'
                      : 'hover:bg-[#2A2A3F] border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center text-[#F5F3E8] font-bold text-sm flex-shrink-0">
                      {group.name[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-[#F5F3E8] truncate">
                          {group.name}
                        </span>
                        {isCreator && <Crown className="w-3 h-3 text-[#FFD700]" />}
                        {group.isPrivate && <Lock className="w-3 h-3 text-[#A0A0A5]" />}
                      </div>
                      <p className="text-xs text-[#6B6B78] mb-1 truncate">
                        {group.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[#A0A0A5]">
                        <Users className="w-3 h-3" />
                        <span>{group.members.length} members</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Group settings - Coming soon!');
                          }}
                          className="p-1.5 rounded-lg hover:bg-[#3A3A4F] text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveGroup(group.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#3A3A4F] text-[#A0A0A5] hover:text-[#FF6B9D] transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
