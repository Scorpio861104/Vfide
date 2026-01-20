'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  X,
  Send,
  MoreVertical,
  UserPlus,
  Settings,
  LogOut,
  CheckCheck,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { Group, GroupMessage } from '@/types/groups';
import { Friend } from '@/types/messaging';
import { formatAddress } from '@/lib/messageEncryption';
import { UserDisplay } from '@/components/common/UserDisplay';
import { addNotification } from './SocialNotifications';

export function GroupMessaging() {
  const { address } = useAccount();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle SSR
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load groups
  useEffect(() => {
    if (!address || !isClient || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`vfide_groups_${address}`);
      if (stored) {
        const groupsData: Group[] = JSON.parse(stored);
        setGroups(groupsData.sort((a, b) => b.lastActivity - a.lastActivity));
      }
    } catch (e) {
      console.error('Failed to load groups:', e);
      setGroups([]);
    }
  }, [address, isClient]);

  // Load messages for selected group
  useEffect(() => {
    if (!selectedGroup || !isClient || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`vfide_group_messages_${selectedGroup.id}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to load group messages:', e);
      setMessages([]);
    }
  }, [selectedGroup, isClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedGroup || !address) return;

    const message: GroupMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: selectedGroup.id,
      from: address,
      content: newMessage,
      timestamp: Date.now(),
      encrypted: false,
      readBy: [address],
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    localStorage.setItem(`vfide_group_messages_${selectedGroup.id}`, JSON.stringify(updatedMessages));

    // Update group last activity
    const updatedGroups = groups.map(g =>
      g.id === selectedGroup.id ? { ...g, lastActivity: Date.now() } : g
    );
    setGroups(updatedGroups.sort((a, b) => b.lastActivity - a.lastActivity));
    localStorage.setItem(`vfide_groups_${address}`, JSON.stringify(updatedGroups));

    // Notify group members
    selectedGroup.members.forEach(member => {
      if (member.address !== address) {
        addNotification(member.address, {
          type: 'message',
          from: address,
          title: `New message in ${selectedGroup.name}`,
          message: newMessage.slice(0, 100),
        });
      }
    });

    setNewMessage('');
  };

  const leaveGroup = () => {
    if (!selectedGroup || !address) return;

    const updatedGroups = groups.filter(g => g.id !== selectedGroup.id);
    setGroups(updatedGroups);
    localStorage.setItem(`vfide_groups_${address}`, JSON.stringify(updatedGroups));
    setSelectedGroup(null);
    setShowGroupMenu(false);
  };

  return (
    <div className="h-[calc(100vh-250px)] flex gap-4">
      {/* Groups List */}
      <div className="w-80 bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-zinc-100">Groups</h3>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-zinc-500 mx-auto mb-2 opacity-50" />
              <p className="text-zinc-500 text-sm">No groups yet</p>
              <p className="text-zinc-500 text-xs mt-1">Create one to get started!</p>
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  selectedGroup?.id === group.id
                    ? 'bg-cyan-400/20 border-2 border-cyan-400'
                    : 'bg-zinc-900 border-2 border-transparent hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{
                      backgroundColor: group.color || '#00F0FF20',
                    }}
                  >
                    {group.icon || '👥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-zinc-100 truncate">
                      {group.name}
                    </h4>
                    <p className="text-xs text-zinc-500">
                      {group.members.length} members
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col">
        {selectedGroup ? (
          <>
            {/* Group Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{
                    backgroundColor: selectedGroup.color || '#00F0FF20',
                  }}
                >
                  {selectedGroup.icon || '👥'}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100">{selectedGroup.name}</h3>
                  <p className="text-sm text-zinc-500">
                    {selectedGroup.members.length} members
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors relative"
              >
                <MoreVertical className="w-5 h-5 text-zinc-100" />
                
                {showGroupMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10">
                    <button
                      className="w-full px-4 py-2 text-left text-zinc-100 hover:bg-zinc-800 flex items-center gap-2 rounded-t-lg"
                    >
                      <Settings className="w-4 h-4" />
                      Group Settings
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-zinc-100 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Members
                    </button>
                    <button
                      onClick={leaveGroup}
                      className="w-full px-4 py-2 text-left text-pink-400 hover:bg-zinc-800 flex items-center gap-2 rounded-b-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave Group
                    </button>
                  </div>
                )}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No messages yet</p>
                  <p className="text-zinc-500 text-sm mt-1">Be the first to say something!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.from === address;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isMe && (
                          <p className="text-xs text-zinc-500 mb-1 ml-2">
                            <UserDisplay address={msg.from} />
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-cyan-400 text-zinc-950'
                              : 'bg-zinc-800 text-zinc-100'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-2">
                          <p className="text-xs text-zinc-500">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                          {isMe && msg.readBy.length > 1 && (
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-zinc-500 mx-auto mb-4 opacity-50" />
              <p className="text-zinc-500">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(group) => {
              if (!address) return;
              const updatedGroups = [group, ...groups];
              setGroups(updatedGroups);
              localStorage.setItem(`vfide_groups_${address}`, JSON.stringify(updatedGroups));
              setSelectedGroup(group);
              setShowCreateGroup(false);
            }}
            userAddress={address || ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (group: Group) => void;
  userAddress: string;
}

function CreateGroupModal({ onClose, onCreate, userAddress }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('👥');
  const [color, setColor] = useState('#00F0FF');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    // Load friends
    const stored = localStorage.getItem(`vfide_friends_${userAddress}`);
    if (stored) {
      setFriends(JSON.parse(stored));
    }
  }, [userAddress]);

  const handleCreate = () => {
    if (!name.trim() || selectedFriends.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    const group: Group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      icon,
      color,
      members: [
        { address: userAddress, role: 'admin', joinedAt: Date.now() },
        ...selectedFriends.map(addr => ({
          address: addr,
          role: 'member' as const,
          joinedAt: Date.now(),
        })),
      ],
      createdBy: userAddress,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    onCreate(group);
  };

  const icons = ['👥', '💼', '🎮', '📚', '🏠', '🎨', '⚽', '🍕'];
  const colors = ['#00F0FF', '#A78BFA', '#FFD700', '#50C878', '#FF8C42', '#FF6B9D'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">Create Group</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-100 mb-2">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {icons.map(i => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={`p-3 text-2xl rounded-lg transition-all ${
                      icon === i ? 'bg-cyan-400/20 border-2 border-cyan-400' : 'bg-zinc-950 border-2 border-transparent hover:bg-zinc-800'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-100 mb-2">Color</label>
              <div className="grid grid-cols-3 gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-12 rounded-lg transition-all ${
                      color === c ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-[#1A1A2E]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">Group Name*</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Alpha"
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none resize-none"
            />
          </div>

          {/* Select Members */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">
              Add Members* ({selectedFriends.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {friends.map(friend => (
                <label
                  key={friend.address}
                  className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.address)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFriends([...selectedFriends, friend.address]);
                      } else {
                        setSelectedFriends(selectedFriends.filter(a => a !== friend.address));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                    {(friend.alias || friend.address).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-zinc-100">
                    {friend.alias || formatAddress(friend.address)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreate}
              className="flex-1 py-3 bg-cyan-400 text-zinc-950 rounded-lg font-bold hover:bg-cyan-400 transition-colors"
            >
              Create Group
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-zinc-800 text-zinc-100 rounded-lg font-semibold hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
