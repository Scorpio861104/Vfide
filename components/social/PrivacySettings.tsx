'use client';

import React, { useState, useEffect } from 'react';
import { motion as _motion } from 'framer-motion';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Users,
  MessageCircle,
  UserX,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { PrivacySettings as PrivacySettingsType, DEFAULT_PRIVACY_SETTINGS, BlockedUser } from '@/types/friendRequests';
import { STORAGE_KEYS, formatAddress } from '@/lib/messageEncryption';

export function PrivacySettings() {
  const { address } = useAccount();
  const [settings, setSettings] = useState<PrivacySettingsType>(DEFAULT_PRIVACY_SETTINGS);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockAddress, setBlockAddress] = useState('');
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (!address) return;
    
    const storedSettings = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_privacy_${address}`);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        console.error('Failed to load privacy settings:', e);
      }
    }

    const storedBlocked = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_blocked_${address}`);
    if (storedBlocked) {
      try {
        setBlockedUsers(JSON.parse(storedBlocked));
      } catch (e) {
        console.error('Failed to load blocked users:', e);
      }
    }
  }, [address]);

  // Save settings
  const saveSettings = () => {
    if (!address) return;
    
    localStorage.setItem(
      `${STORAGE_KEYS.FRIENDS}_privacy_${address}`,
      JSON.stringify(settings)
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Block user
  const handleBlockUser = () => {
    if (!blockAddress || !address) return;
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(blockAddress)) {
      alert('Invalid wallet address');
      return;
    }

    if (blockedUsers.some(u => u.address.toLowerCase() === blockAddress.toLowerCase())) {
      alert('User already blocked');
      return;
    }

    const newBlocked: BlockedUser = {
      address: blockAddress,
      blockedAt: Date.now(),
    };

    const updated = [...blockedUsers, newBlocked];
    setBlockedUsers(updated);
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_blocked_${address}`, JSON.stringify(updated));
    setBlockAddress('');
  };

  // Unblock user
  const handleUnblock = (userAddress: string) => {
    if (!address) return;
    
    const updated = blockedUsers.filter(u => u.address !== userAddress);
    setBlockedUsers(updated);
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_blocked_${address}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F5F3E8] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#00F0FF]" />
            Privacy & Safety
          </h2>
          <p className="text-sm text-[#A0A0A5] mt-1">
            Control who can contact you and see your activity
          </p>
        </div>
        <button
          onClick={saveSettings}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            saved
              ? 'bg-[#50C878] text-[#0A0A0F]'
              : 'bg-[#00F0FF] text-[#0A0A0F] hover:bg-[#00D5E0]'
          }`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Message Privacy */}
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
          <h3 className="text-lg font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#00F0FF]" />
            Who Can Message You
          </h3>

          <div className="space-y-3">
            {[
              { value: 'friends', label: 'Friends Only', desc: 'Only accepted friends', icon: Users },
              { value: 'trusted', label: 'Trusted Users', desc: 'ProofScore ≥54% + friends', icon: Shield },
              { value: 'everyone', label: 'Everyone', desc: 'Anyone can message (not recommended)', icon: AlertTriangle },
            ].map((option) => (
              <label
                key={option.value}
                className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                  settings.allowMessagesFrom === option.value
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF]/50'
                    : 'bg-[#0A0A0F] border-[#2A2A2F] hover:border-[#3A3A4F]'
                }`}
              >
                <input
                  type="radio"
                  name="allowMessagesFrom"
                  value={option.value}
                  checked={settings.allowMessagesFrom === option.value}
                  onChange={(e) => setSettings({ ...settings, allowMessagesFrom: e.target.value as any })}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <option.icon className={`w-5 h-5 mt-0.5 ${
                    settings.allowMessagesFrom === option.value ? 'text-[#00F0FF]' : 'text-[#6B6B78]'
                  }`} />
                  <div className="flex-1">
                    <div className="font-semibold text-[#F5F3E8] text-sm">{option.label}</div>
                    <div className="text-xs text-[#6B6B78]">{option.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Friend Request Privacy */}
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
          <h3 className="text-lg font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#A78BFA]" />
            Who Can Send Friend Requests
          </h3>

          <div className="space-y-3">
            {[
              { value: 'trusted', label: 'Trusted Users', desc: 'ProofScore ≥40%', icon: Shield },
              { value: 'everyone', label: 'Everyone', desc: 'Anyone can send requests', icon: Users },
              { value: 'none', label: 'No One', desc: 'Block all friend requests', icon: Lock },
            ].map((option) => (
              <label
                key={option.value}
                className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                  settings.allowFriendRequestsFrom === option.value
                    ? 'bg-[#A78BFA]/10 border-[#A78BFA]/50'
                    : 'bg-[#0A0A0F] border-[#2A2A2F] hover:border-[#3A3A4F]'
                }`}
              >
                <input
                  type="radio"
                  name="allowFriendRequestsFrom"
                  value={option.value}
                  checked={settings.allowFriendRequestsFrom === option.value}
                  onChange={(e) => setSettings({ ...settings, allowFriendRequestsFrom: e.target.value as any })}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <option.icon className={`w-5 h-5 mt-0.5 ${
                    settings.allowFriendRequestsFrom === option.value ? 'text-[#A78BFA]' : 'text-[#6B6B78]'
                  }`} />
                  <div className="flex-1">
                    <div className="font-semibold text-[#F5F3E8] text-sm">{option.label}</div>
                    <div className="text-xs text-[#6B6B78]">{option.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Online Status */}
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
          <h3 className="text-lg font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#50C878]" />
            Online Status Visibility
          </h3>

          <div className="space-y-3">
            {[
              { value: 'friends', label: 'Friends Only', icon: Users },
              { value: 'everyone', label: 'Everyone', icon: Eye },
              { value: 'none', label: 'No One (Invisible)', icon: EyeOff },
            ].map((option) => (
              <label
                key={option.value}
                className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                  settings.showOnlineStatus === option.value
                    ? 'bg-[#50C878]/10 border-[#50C878]/50'
                    : 'bg-[#0A0A0F] border-[#2A2A2F] hover:border-[#3A3A4F]'
                }`}
              >
                <input
                  type="radio"
                  name="showOnlineStatus"
                  value={option.value}
                  checked={settings.showOnlineStatus === option.value}
                  onChange={(e) => setSettings({ ...settings, showOnlineStatus: e.target.value as any })}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <option.icon className={`w-5 h-5 ${
                    settings.showOnlineStatus === option.value ? 'text-[#50C878]' : 'text-[#6B6B78]'
                  }`} />
                  <div className="font-semibold text-[#F5F3E8] text-sm">{option.label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ProofScore Requirements */}
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
          <h3 className="text-lg font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FFD700]" />
            Trust Requirements
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireProofScoreForRequests}
                onChange={(e) => setSettings({ ...settings, requireProofScoreForRequests: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-[#3A3A4F] bg-[#0A0A0F] text-[#00F0FF] focus:ring-[#00F0FF] focus:ring-offset-0"
              />
              <div>
                <div className="text-sm font-semibold text-[#F5F3E8]">
                  Require Minimum ProofScore
                </div>
                <div className="text-xs text-[#6B6B78]">
                  Only allow requests from users with sufficient trust
                </div>
              </div>
            </label>

            <div>
              <label className="text-sm text-[#A0A0A5] mb-2 block">
                Minimum ProofScore: {(settings.minimumProofScoreForRequests / 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={settings.minimumProofScoreForRequests}
                onChange={(e) => setSettings({ ...settings, minimumProofScoreForRequests: parseInt(e.target.value) })}
                disabled={!settings.requireProofScoreForRequests}
                className="w-full"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRejectLowTrust}
                onChange={(e) => setSettings({ ...settings, autoRejectLowTrust: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-[#3A3A4F] bg-[#0A0A0F] text-[#00F0FF] focus:ring-[#00F0FF] focus:ring-offset-0"
              />
              <div>
                <div className="text-sm font-semibold text-[#F5F3E8]">
                  Auto-Reject Low Trust
                </div>
                <div className="text-xs text-[#6B6B78]">
                  Automatically reject requests below threshold
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6">
        <h3 className="text-lg font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
          <UserX className="w-5 h-5 text-[#FF6B9D]" />
          Blocked Users ({blockedUsers.length})
        </h3>

        <div className="space-y-4">
          {/* Add blocked user */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Wallet address to block (0x...)"
              value={blockAddress}
              onChange={(e) => setBlockAddress(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm focus:border-[#FF6B9D] focus:outline-none"
            />
            <button
              onClick={handleBlockUser}
              disabled={!blockAddress}
              className="px-4 py-2 bg-[#FF6B9D] text-[#0A0A0F] rounded-lg font-semibold text-sm hover:bg-[#FF5A8D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Block
            </button>
          </div>

          {/* Blocked list */}
          {blockedUsers.length === 0 ? (
            <p className="text-sm text-[#6B6B78] text-center py-4">
              No blocked users
            </p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((user) => (
                <div
                  key={user.address}
                  className="flex items-center justify-between p-3 bg-[#0A0A0F] rounded-lg border border-[#2A2A2F]"
                >
                  <div>
                    <div className="text-sm font-medium text-[#F5F3E8]">
                      {formatAddress(user.address)}
                    </div>
                    <div className="text-xs text-[#6B6B78]">
                      Blocked {new Date(user.blockedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.address)}
                    className="px-3 py-1 text-sm text-[#00F0FF] hover:text-[#00D5E0] transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
