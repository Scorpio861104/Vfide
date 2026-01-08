import React, { useState } from 'react';
import { Community, Channel, hasPermission, CommunityMember } from '@/lib/communitiesSystem';

interface CommunityLayoutProps {
  community: Community;
  userMember: CommunityMember;
  onChannelSelect: (channel: Channel) => void;
  onLeave: () => void;
}

export default function CommunityLayout({
  community,
  userMember,
  onChannelSelect,
  onLeave,
}: CommunityLayoutProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(
    community.channels[0] || null
  );
  const [showMemberList, setShowMemberList] = useState(true);

  const handleChannelClick = (channel: Channel) => {
    // Check if user has permission to read this channel
    const canRead = hasPermission(userMember, 'read_messages', community);
    if (!canRead) {
      alert("You don't have permission to view this channel");
      return;
    }

    setSelectedChannel(channel);
    onChannelSelect(channel);
  };

  const userRole = community.roles.find((role) => userMember.roles.includes(role.id));

  return (
    <div className="h-screen flex bg-[#0A0A0F]">
      {/* Left Sidebar - Channels */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Community Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{community.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-white font-bold truncate">{community.name}</h2>
                {community.verified && <span className="text-[#00F0FF]">✓</span>}
              </div>
              <p className="text-xs text-gray-400">{community.memberCount} members</p>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs text-gray-400 uppercase font-semibold">Text Channels</h3>
              {hasPermission(userMember, 'manage_channels', community) && (
                <button className="text-gray-400 hover:text-white text-lg">+</button>
              )}
            </div>
            {community.channels
              .filter((ch) => ch.type === 'text')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {channel.type === 'text'
                        ? '#'
                        : channel.type === 'voice'
                        ? '🔊'
                        : '📢'}
                    </span>
                    <span className="flex-1 truncate">{channel.name}</span>
                    {channel.readOnly && <span className="text-xs">🔒</span>}
                  </div>
                </button>
              ))}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h3 className="text-xs text-gray-400 uppercase font-semibold">Voice Channels</h3>
            </div>
            {community.channels
              .filter((ch) => ch.type === 'voice')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔊</span>
                    <span className="flex-1 truncate">{channel.name}</span>
                  </div>
                </button>
              ))}
          </div>

          <div>
            <h3 className="text-xs text-gray-400 uppercase font-semibold px-2 mb-2">
              Announcements
            </h3>
            {community.channels
              .filter((ch) => ch.type === 'announcement')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    selectedChannel?.id === channel.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <span className="flex-1 truncate">{channel.name}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* User Section */}
        <div className="p-3 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
              <span>👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {userMember.nickname || 'You'}
              </p>
              {userRole && (
                <p className="text-xs truncate" style={{ color: userRole.color }}>
                  {userRole.name}
                </p>
              )}
            </div>
            <button
              onClick={onLeave}
              className="text-red-400 hover:text-red-300 text-sm"
              title="Leave Community"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        {selectedChannel && (
          <div className="h-14 border-b border-gray-800 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {selectedChannel.type === 'text'
                  ? '#'
                  : selectedChannel.type === 'voice'
                  ? '🔊'
                  : '📢'}
              </span>
              <div>
                <h3 className="text-white font-semibold">{selectedChannel.name}</h3>
                {selectedChannel.description && (
                  <p className="text-xs text-gray-400">{selectedChannel.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              👥
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-black">
          {selectedChannel ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-4">{selectedChannel.icon || '💬'}</p>
              <h3 className="text-xl text-white mb-2">Welcome to #{selectedChannel.name}</h3>
              <p>{selectedChannel.description || 'Start chatting!'}</p>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-4">{community.icon}</p>
              <h3 className="text-xl text-white mb-2">Welcome to {community.name}</h3>
              <p>Select a channel to start</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedChannel && hasPermission(userMember, 'send_messages', community) && (
          <div className="p-4 border-t border-gray-800">
            <input
              type="text"
              placeholder={`Message #${selectedChannel.name}`}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Right Sidebar - Members */}
      {showMemberList && (
        <div className="w-60 bg-gray-900 border-l border-gray-800 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4">
              Members ({community.memberCount})
            </h3>

            {/* Role-based member list */}
            {community.roles
              .sort((a, b) => b.position - a.position)
              .map((role) => (
                <div key={role.id} className="mb-4">
                  <h4
                    className="text-xs uppercase font-semibold mb-2"
                    style={{ color: role.color }}
                  >
                    {role.name} — {role.memberCount}
                  </h4>
                  {/* In a real app, you'd fetch and display actual members here */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800 cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                        <span>👤</span>
                      </div>
                      <span className="text-gray-300 text-sm">Member</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
