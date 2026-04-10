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
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Group, Friend } from '@/types/messaging';
import { formatAddress, STORAGE_KEYS } from '@/lib/messageEncryption';
import { safeLocalStorage } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface GroupsManagerProps {
  friends: Friend[];
  onSelectGroup: (group: Group) => void;
  selectedGroup?: Group;
}

export function GroupsManager({ friends, onSelectGroup, selectedGroup }: GroupsManagerProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingLeaveGroupId, setPendingLeaveGroupId] = useState<string | null>(null);
  const [settingsGroupId, setSettingsGroupId] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load groups from localStorage
  useEffect(() => {
    if (!address) return;
    
    const stored = safeLocalStorage.getItem(`${STORAGE_KEYS.GROUPS}_${address}`);
    if (stored) {
      try {
        setGroups(JSON.parse(stored));
      } catch {
        // groups stay empty on parse failure
      }
    }
  }, [address]);

  // Save groups to localStorage
  useEffect(() => {
    if (!address || groups.length === 0) return;
    
    safeLocalStorage.setItem(`${STORAGE_KEYS.GROUPS}_${address}`, JSON.stringify(groups));
  }, [address, groups]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !address) return;
    
    if (selectedMembers.length < 2) {
      toast({
        title: 'Need More Members',
        description: 'Groups need at least 2 other members.',
      });
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
    setPendingLeaveGroupId(groupId);
  };

  const confirmLeaveGroup = () => {
    if (!pendingLeaveGroupId) return;
    setGroups(groups.filter((g) => g.id !== pendingLeaveGroupId));
    setPendingLeaveGroupId(null);
  };

  const handleOpenSettings = (group: Group) => {
    setSettingsGroupId(group.id);
    setSettingsName(group.name);
    setSettingsDescription(group.description ?? '');
  };

  const handleSaveSettings = () => {
    if (!settingsGroupId || !settingsName.trim()) return;
    setGroups(prev => prev.map(g =>
      g.id === settingsGroupId
        ? { ...g, name: settingsName.trim(), description: settingsDescription.trim() || undefined }
        : g
    ));
    toast({ title: 'Group updated', description: `"${settingsName.trim()}" saved.` });
    setSettingsGroupId(null);
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
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 h-full flex flex-col relative">
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            Groups ({groups.length})
          </h2>
          <button
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="p-2 rounded-lg bg-violet-400/10 text-violet-400 hover:bg-violet-400/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) =>  setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:border-violet-400 focus:outline-none"
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
            className="border-b border-zinc-700 overflow-hidden"
          >
            <div className="p-4 bg-zinc-950/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-100">Create Group</h3>
                <button onClick={() => setShowCreateGroup(false)} className="text-zinc-500 hover:text-zinc-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) =>  setNewGroupName(e.target.value)}
                className="w-full px-3 py-2 mb-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:border-violet-400 focus:outline-none"
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={newGroupDescription}
                onChange={(e) =>  setNewGroupDescription(e.target.value)}
                className="w-full px-3 py-2 mb-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:border-violet-400 focus:outline-none"
              />

              <div className="mb-3">
                <label className="text-xs text-zinc-400 mb-2 block">Select Members (min 2):</label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2">
                  {friends.length === 0 ? (
                    <p className="text-xs text-zinc-500 p-2">No friends to add</p>
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.address}
                        onClick={() => toggleMemberSelection(friend.address)}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.includes(friend.address)
                            ? 'bg-violet-400/20 border border-violet-400/50'
                            : 'hover:bg-zinc-800'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-zinc-100 text-xs font-bold">
                          {friend.alias ? friend.alias?.[0]?.toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
                        </div>
                        <span className="text-xs text-zinc-100 flex-1">
                          {friend.alias || formatAddress(friend.address)}
                        </span>
                        {selectedMembers.includes(friend.address) && (
                          <Shield className="w-3 h-3 text-violet-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName || selectedMembers.length < 2}
                className="w-full py-2 bg-violet-400 text-zinc-950 rounded-lg font-semibold text-sm hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <Users className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">
              {groups.length === 0 ? 'No groups yet' : 'No groups match your search'}
            </p>
            <p className="text-zinc-500 text-xs mt-1">
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
                      ? 'bg-violet-400/20 border border-violet-400/50'
                      : 'hover:bg-zinc-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-zinc-100 font-bold text-sm shrink-0">
                      {group.name?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-100 truncate">
                          {group.name}
                        </span>
                        {isCreator && <Crown className="w-3 h-3 text-amber-400" />}
                        {group.isPrivate && <Lock className="w-3 h-3 text-zinc-400" />}
                      </div>
                      <p className="text-xs text-zinc-500 mb-1 truncate">
                        {group.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
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
                            handleOpenSettings(group);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveGroup(group.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-pink-400 transition-colors"
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

      <AnimatePresence>
        {pendingLeaveGroupId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPendingLeaveGroupId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-semibold text-zinc-100 mb-2">Leave Group</h4>
              <p className="text-xs text-zinc-400 mb-4">You will lose access to all messages in this group.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingLeaveGroupId(null)}
                  className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveGroup}
                  className="flex-1 rounded-lg bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition-colors"
                >
                  Leave Group
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Settings Modal */}
      <AnimatePresence>
        {settingsGroupId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSettingsGroupId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-400" />
                Group Settings
              </h4>
              <label className="text-xs text-zinc-400 mb-1 block">Name</label>
              <input
                type="text"
                value={settingsName}
                onChange={(e) =>  setSettingsName(e.target.value)}
                maxLength={80}
                className="w-full px-3 py-2 mb-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:border-violet-400 focus:outline-none"
              />
              <label className="text-xs text-zinc-400 mb-1 block">Description</label>
              <input
                type="text"
                value={settingsDescription}
                onChange={(e) =>  setSettingsDescription(e.target.value)}
                maxLength={200}
                placeholder="Optional"
                className="w-full px-3 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:border-violet-400 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setSettingsGroupId(null)}
                  className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={!settingsName.trim()}
                  className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
