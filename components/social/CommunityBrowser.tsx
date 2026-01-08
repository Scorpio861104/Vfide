import React, { useState } from 'react';
import { useCommunities, Community } from '@/lib/communitiesSystem';

interface CommunityBrowserProps {
  userAddress: string;
  onCommunitySelect: (community: Community) => void;
}

export default function CommunityBrowser({ userAddress, onCommunitySelect }: CommunityBrowserProps) {
  const { communities, userCommunities, createCommunity, joinCommunity } = useCommunities(userAddress);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = ['all', 'crypto', 'gaming', 'tech', 'business', 'art', 'music', 'education', 'lifestyle'];

  const filteredCommunities = communities.filter((community) => {
    const matchesCategory = selectedCategory === 'all' || community.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase());
    const isPublic = community.visibility === 'public';
    return matchesCategory && matchesSearch && isPublic;
  });

  const handleJoin = async (community: Community) => {
    try {
      await joinCommunity(community);
      onCommunitySelect(community);
    } catch (error) {
      console.error('Failed to join community:', error);
    }
  };

  const isJoined = (communityId: string) => {
    return userCommunities.some((c) => c.id === communityId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[#00F0FF]">Discover Communities</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
          >
            + Create
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
        />
      </div>

      {/* Category Filters */}
      <div className="px-6 py-4 border-b border-gray-700 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-[#00F0FF] text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No communities found</p>
            <p className="text-gray-500 text-sm mt-2">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunities.map((community) => {
              const joined = isJoined(community.id);

              return (
                <div
                  key={community.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-[#00F0FF] transition-colors group cursor-pointer"
                >
                  {/* Banner */}
                  <div
                    className="h-24 bg-gradient-to-r from-[#00F0FF]/20 to-[#FF6B9D]/20 flex items-center justify-center text-4xl"
                    style={
                      community.banner
                        ? { backgroundImage: `url(${community.banner})`, backgroundSize: 'cover' }
                        : {}
                    }
                  >
                    {community.icon}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-bold">{community.name}</h3>
                          {community.verified && (
                            <span className="text-[#00F0FF]" title="Verified">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{community.category}</p>
                      </div>
                    </div>

                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {community.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      <span>👥 {community.memberCount} members</span>
                      <span>📝 {community.channels.length} channels</span>
                    </div>

                    {/* Tags */}
                    {community.tags && community.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {community.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Button */}
                    {joined ? (
                      <button
                        onClick={() => onCommunitySelect(community)}
                        className="w-full py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Open
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(community)}
                        className="w-full py-2 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Communities Section */}
      {userCommunities.length > 0 && (
        <div className="border-t border-gray-700 p-6">
          <h3 className="text-white font-bold mb-4">My Communities ({userCommunities.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {userCommunities.slice(0, 8).map((community) => (
              <button
                key={community.id}
                onClick={() => onCommunitySelect(community)}
                className="flex flex-col items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="text-3xl">{community.icon}</span>
                <span className="text-white text-sm text-center truncate w-full">
                  {community.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, description, category, icon, visibility) => {
            createCommunity(name, description, category, icon, visibility);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Create Community Modal Component
interface CreateCommunityModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string, category: string, icon: string, visibility: 'public' | 'private' | 'invite-only') => void;
}

function CreateCommunityModal({ onClose, onCreate }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('crypto');
  const [icon, setIcon] = useState('🏛️');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'invite-only'>('public');

  const icons = ['🏛️', '💎', '🎮', '💻', '🎨', '🎵', '📚', '🌍', '🚀', '⚡', '🔥', '💰'];

  const handleCreate = () => {
    if (!name.trim() || !description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    onCreate(name, description, category, icon, visibility);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0F] border-2 border-[#00F0FF] rounded-lg max-w-lg w-full">
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-[#00F0FF]">Create Community</h2>

          {/* Icon Selector */}
          <div>
            <label className="block text-white mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {icons.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={`text-3xl p-2 rounded-lg transition-all ${
                    icon === i ? 'bg-[#00F0FF]/20 scale-110' : 'bg-gray-800 hover:scale-105'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-white mb-2">Community Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VFIDE Builders"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00F0FF]"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-white mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A community for VFIDE developers..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00F0FF] resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-white mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00F0FF]"
            >
              <option value="crypto">Crypto</option>
              <option value="gaming">Gaming</option>
              <option value="tech">Tech</option>
              <option value="business">Business</option>
              <option value="art">Art</option>
              <option value="music">Music</option>
              <option value="education">Education</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-white mb-2">Visibility</label>
            <div className="space-y-2">
              {(['public', 'private', 'invite-only'] as const).map((v) => (
                <label key={v} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <span className="text-white capitalize">{v.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
