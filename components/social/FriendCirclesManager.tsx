'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trash2,
  Heart,
  Home,
  Briefcase,
  Star,
  Check,
  UserPlus,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { FriendCircle, CircleMember, DEFAULT_CIRCLES } from '@/types/friendCircles';
import { Friend } from '@/types/messaging';
import { STORAGE_KEYS, formatAddress } from '@/lib/messageEncryption';

interface FriendCirclesManagerProps {
  friends: Friend[];
}

const ICON_MAP: Record<string, any> = {
  heart: Heart,
  home: Home,
  briefcase: Briefcase,
  users: Users,
  star: Star,
};

export function FriendCirclesManager({ friends }: FriendCirclesManagerProps) {
  const { address } = useAccount();
  const [circles, setCircles] = useState<FriendCircle[]>([]);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<FriendCircle | null>(null);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [_editingCircle, _setEditingCircle] = useState<FriendCircle | null>(null);
  
  // Form states
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [circleColor, setCircleColor] = useState('#00F0FF');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [memberNicknames, setMemberNicknames] = useState<Record<string, string>>({});

  // Load circles and members
  useEffect(() => {
    if (!address) return;
    
    const storedCircles = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_circles_${address}`);
    if (storedCircles) {
      try {
        setCircles(JSON.parse(storedCircles));
      } catch (e) {
        console.error('Failed to load circles:', e);
        initializeDefaultCircles();
      }
    } else {
      initializeDefaultCircles();
    }

    const storedMembers = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_circle_members_${address}`);
    if (storedMembers) {
      try {
        setCircleMembers(JSON.parse(storedMembers));
      } catch (e) {
        console.error('Failed to load circle members:', e);
      }
    }
  }, [address]);

  // Save circles
  useEffect(() => {
    if (!address || circles.length === 0) return;
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_circles_${address}`, JSON.stringify(circles));
  }, [address, circles]);

  // Save members
  useEffect(() => {
    if (!address || circleMembers.length === 0) return;
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_circle_members_${address}`, JSON.stringify(circleMembers));
  }, [address, circleMembers]);

  const initializeDefaultCircles = () => {
    const newCircles = DEFAULT_CIRCLES.map((template, idx) => ({
      ...template,
      id: `circle_${Date.now()}_${idx}`,
      members: [],
      createdAt: Date.now(),
    }));
    setCircles(newCircles);
  };

  const handleCreateCircle = () => {
    if (!circleName || !address) return;

    const newCircle: FriendCircle = {
      id: `circle_${Date.now()}`,
      name: circleName,
      description: circleDescription,
      color: circleColor,
      members: [],
      createdAt: Date.now(),
    };

    setCircles([...circles, newCircle]);
    setCircleName('');
    setCircleDescription('');
    setCircleColor('#00F0FF');
    setShowCreateCircle(false);
  };

  const handleAddMembers = () => {
    if (!selectedCircle || !address) return;

    const newMembers: CircleMember[] = selectedFriends.map(friendAddress => ({
      friendAddress,
      circleId: selectedCircle.id,
      nickname: memberNicknames[friendAddress],
      addedAt: Date.now(),
    }));

    setCircleMembers([...circleMembers, ...newMembers]);
    
    // Update circle members list
    const updatedCircles = circles.map(c =>
      c.id === selectedCircle.id
        ? { ...c, members: [...c.members, ...selectedFriends] }
        : c
    );
    setCircles(updatedCircles);
    setSelectedCircle(updatedCircles.find(c => c.id === selectedCircle.id) || null);

    setSelectedFriends([]);
    setMemberNicknames({});
    setShowAddMembers(false);
  };

  const handleRemoveMember = (friendAddress: string) => {
    if (!selectedCircle) return;

    setCircleMembers(circleMembers.filter(
      m => !(m.circleId === selectedCircle.id && m.friendAddress === friendAddress)
    ));

    const updatedCircles = circles.map(c =>
      c.id === selectedCircle.id
        ? { ...c, members: c.members.filter(addr => addr !== friendAddress) }
        : c
    );
    setCircles(updatedCircles);
    setSelectedCircle(updatedCircles.find(c => c.id === selectedCircle.id) || null);
  };

  const handleDeleteCircle = (circleId: string) => {
    if (!confirm('Delete this circle? Members will not be unfriended.')) return;
    
    setCircles(circles.filter(c => c.id !== circleId));
    setCircleMembers(circleMembers.filter(m => m.circleId !== circleId));
    if (selectedCircle?.id === circleId) {
      setSelectedCircle(null);
    }
  };

  const getCircleMembers = (circleId: string) => {
    return circleMembers.filter(m => m.circleId === circleId);
  };

  const getFriendDetails = (address: string) => {
    return friends.find(f => f.address.toLowerCase() === address.toLowerCase());
  };

  const _getMemberNickname = (friendAddress: string, circleId: string) => {
    const member = circleMembers.find(
      m => m.friendAddress === friendAddress && m.circleId === circleId
    );
    return member?.nickname;
  };

  const availableFriendsToAdd = friends.filter(
    f => selectedCircle && !selectedCircle.members.includes(f.address)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F5F3E8] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00F0FF]" />
            Friend Circles
          </h2>
          <p className="text-sm text-[#A0A0A5] mt-1">
            Organize friends into groups with custom nicknames
          </p>
        </div>
        <button
          onClick={() => setShowCreateCircle(true)}
          className="px-4 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D5E0] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Circle
        </button>
      </div>

      {/* Circles Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {circles.map((circle) => {
          const IconComponent = ICON_MAP[circle.icon || 'users'] || Users;
          const memberCount = circle.members.length;

          return (
            <motion.button
              key={circle.id}
              onClick={() => setSelectedCircle(circle)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border transition-all text-left ${
                selectedCircle?.id === circle.id
                  ? 'bg-[#1A1A2E] border-2'
                  : 'bg-[#0A0A0F] border-[#2A2A2F] hover:border-[#3A3A4F]'
              }`}
              style={
                selectedCircle?.id === circle.id
                  ? { borderColor: circle.color }
                  : {}
              }
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${circle.color}20` }}
                >
                  <IconComponent
                    className="w-5 h-5"
                    style={{ color: circle.color }}
                  />
                </div>
                {!circle.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCircle(circle.id);
                    }}
                    className="p-1 hover:bg-[#FF6B9D]/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-[#FF6B9D]" />
                  </button>
                )}
              </div>
              <h3 className="font-bold text-[#F5F3E8] mb-1">{circle.name}</h3>
              {circle.description && (
                <p className="text-xs text-[#6B6B78] mb-3">{circle.description}</p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {circle.members.slice(0, 3).map((addr, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded-full border-2 border-[#0A0A0F] flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${circle.color}, ${circle.color}80)`,
                      }}
                    >
                      {addr.slice(2, 4).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-[#A0A0A5]">
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Circle Details */}
      {selectedCircle && (
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${selectedCircle.color}20` }}
              >
                {React.createElement(
                  ICON_MAP[selectedCircle.icon || 'users'] || Users,
                  {
                    className: 'w-6 h-6',
                    style: { color: selectedCircle.color },
                  }
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#F5F3E8]">
                  {selectedCircle.name}
                </h3>
                {selectedCircle.description && (
                  <p className="text-sm text-[#6B6B78]">
                    {selectedCircle.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddMembers(true)}
              className="px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              style={{
                backgroundColor: `${selectedCircle.color}20`,
                color: selectedCircle.color,
              }}
            >
              <UserPlus className="w-4 h-4" />
              Add Members
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            {getCircleMembers(selectedCircle.id).length === 0 ? (
              <div className="text-center py-8 text-[#6B6B78]">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="mt-3 text-sm text-[#00F0FF] hover:underline"
                >
                  Add your first member
                </button>
              </div>
            ) : (
              getCircleMembers(selectedCircle.id).map((member) => {
                const friend = getFriendDetails(member.friendAddress);
                const circleNickname = member.nickname;
                const friendNickname = friend?.alias;

                return (
                  <div
                    key={`${member.circleId}_${member.friendAddress}`}
                    className="flex items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#2A2A2F]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${selectedCircle.color}, ${selectedCircle.color}80)`,
                        }}
                      >
                        {(circleNickname || friendNickname || member.friendAddress)
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#F5F3E8] flex items-center gap-2">
                          {circleNickname && (
                            <>
                              <span>{circleNickname}</span>
                              <span className="text-xs text-[#6B6B78]">
                                (in this circle)
                              </span>
                            </>
                          )}
                          {!circleNickname && friendNickname && (
                            <span>{friendNickname}</span>
                          )}
                          {!circleNickname && !friendNickname && (
                            <span>{formatAddress(member.friendAddress)}</span>
                          )}
                        </div>
                        <div className="text-xs text-[#6B6B78]">
                          {formatAddress(member.friendAddress)}
                          {friend?.proofScore !== undefined && (
                            <span className="ml-2">
                              • {(friend.proofScore / 100).toFixed(0)}% ProofScore
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.friendAddress)}
                      className="p-2 hover:bg-[#FF6B9D]/20 rounded-lg transition-colors"
                      title="Remove from circle"
                    >
                      <Trash2 className="w-4 h-4 text-[#FF6B9D]" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create Circle Modal */}
      <AnimatePresence>
        {showCreateCircle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateCircle(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">
                Create New Circle
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#A0A0A5] mb-2">
                    Circle Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., College Friends, Trading Group"
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#A0A0A5] mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    placeholder="What's this circle for?"
                    value={circleDescription}
                    onChange={(e) => setCircleDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#A0A0A5] mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {['#00F0FF', '#A78BFA', '#FF6B9D', '#50C878', '#FFD700', '#FF8C42'].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() => setCircleColor(color)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            circleColor === color
                              ? 'ring-2 ring-white scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCircle}
                    disabled={!circleName}
                    className="flex-1 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D5E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Circle
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateCircle(false);
                      setCircleName('');
                      setCircleDescription('');
                    }}
                    className="flex-1 py-2 bg-[#2A2A3F] text-[#F5F3E8] rounded-lg font-semibold hover:bg-[#3A3A4F] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Members Modal */}
      <AnimatePresence>
        {showAddMembers && selectedCircle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddMembers(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">
                Add Members to {selectedCircle.name}
              </h3>
              {availableFriendsToAdd.length === 0 ? (
                <p className="text-center text-[#6B6B78] py-8">
                  All friends are already in this circle
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  {availableFriendsToAdd.map((friend) => {
                    const isSelected = selectedFriends.includes(friend.address);
                    return (
                      <div
                        key={friend.address}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-[#00F0FF]/10 border-[#00F0FF]/50'
                            : 'bg-[#0A0A0F] border-[#2A2A2F] hover:border-[#3A3A4F]'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedFriends(selectedFriends.filter(a => a !== friend.address));
                                const newNicknames = { ...memberNicknames };
                                delete newNicknames[friend.address];
                                setMemberNicknames(newNicknames);
                              } else {
                                setSelectedFriends([...selectedFriends, friend.address]);
                              }
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#00F0FF] border-[#00F0FF]'
                                : 'border-[#3A3A4F]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#0A0A0F]" />}
                          </button>
                          <div className="flex-1">
                            <div className="font-semibold text-[#F5F3E8]">
                              {friend.alias || formatAddress(friend.address)}
                            </div>
                            <div className="text-xs text-[#6B6B78]">
                              {formatAddress(friend.address)}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <input
                            type="text"
                            placeholder={`Nickname in ${selectedCircle.name} (optional)`}
                            value={memberNicknames[friend.address] || ''}
                            onChange={(e) =>
                              setMemberNicknames({
                                ...memberNicknames,
                                [friend.address]: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#00F0FF] focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAddMembers}
                  disabled={selectedFriends.length === 0}
                  className="flex-1 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D5E0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {selectedFriends.length} Member{selectedFriends.length !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => {
                    setShowAddMembers(false);
                    setSelectedFriends([]);
                    setMemberNicknames({});
                  }}
                  className="flex-1 py-2 bg-[#2A2A3F] text-[#F5F3E8] rounded-lg font-semibold hover:bg-[#3A3A4F] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
