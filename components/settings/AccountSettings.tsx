'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Edit2,
  Check,
  X,
  AtSign,
  Type,
  FileText,
  Calendar,
  Shield,
  Save,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { UserProfile, validateUsername, USERNAME_CONSTRAINTS } from '@/types/userProfile';
import { UserProfileService } from '@/lib/userProfileService';

export function AccountSettings() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Load profile
  useEffect(() => {
    if (!address) return;
    
    let existing = UserProfileService.getMyProfile(address);
    if (!existing) {
      // Create default profile
      existing = {
        address,
        joinedDate: Date.now(),
        lastUpdated: Date.now(),
      };
      UserProfileService.saveMyProfile(existing);
    }
    setProfile(existing);
    setUsername(existing.username || '');
    setDisplayName(existing.displayName || '');
    setBio(existing.bio || '');
  }, [address]);

  // Check username availability
  useEffect(() => {
    if (!username || !address || username === profile?.username) {
      setUsernameAvailable(null);
      setUsernameError('');
      return;
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameError(validation.error || '');
      setUsernameAvailable(false);
      return;
    }

    const available = UserProfileService.isUsernameAvailable(username, address);
    setUsernameAvailable(available);
    setUsernameError(available ? '' : 'Username already taken');
  }, [username, address, profile?.username]);

  const handleSave = () => {
    if (!address || !profile) return;
    
    setSaving(true);

    const updatedProfile: UserProfile = {
      ...profile,
      username: username || undefined,
      displayName: displayName || undefined,
      bio: bio || undefined,
      lastUpdated: Date.now(),
    };

    const success = UserProfileService.saveMyProfile(updatedProfile);
    
    if (success) {
      setProfile(updatedProfile);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    setUsername(profile?.username || '');
    setDisplayName(profile?.displayName || '');
    setBio(profile?.bio || '');
    setUsernameError('');
    setUsernameAvailable(null);
    setEditing(false);
  };

  if (!address) {
    return (
      <div className="text-center py-12 text-[#6B6B78]">
        <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Connect your wallet to manage your account</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F5F3E8] flex items-center gap-2">
            <User className="w-6 h-6 text-[#00F0FF]" />
            Account Settings
          </h2>
          <p className="text-sm text-[#A0A0A5] mt-1">
            Set your username and display name
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D5E0] transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !!usernameError || (usernameAvailable === false)}
              className="px-4 py-2 bg-[#50C878] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#45B369] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-[#2A2A3F] text-[#F5F3E8] rounded-lg font-semibold hover:bg-[#3A3A4F] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-4 bg-[#50C878]/20 border border-[#50C878]/50 rounded-lg flex items-center gap-2 text-[#50C878]"
        >
          <Check className="w-5 h-5" />
          <span className="font-semibold">Profile saved successfully!</span>
        </motion.div>
      )}

      {/* Profile Form */}
      <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-6 space-y-6">
        {/* Wallet Address (Read-only) */}
        <div>
          <label className="block text-sm font-semibold text-[#A0A0A5] mb-2">
            Wallet Address
          </label>
          <div className="px-4 py-3 bg-[#0A0A0F] border border-[#2A2A2F] rounded-lg text-[#6B6B78] font-mono">
            {address}
          </div>
          <p className="text-xs text-[#6B6B78] mt-1">
            Your wallet address cannot be changed
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-[#F5F3E8] mb-2 flex items-center gap-2">
            <AtSign className="w-4 h-4 text-[#00F0FF]" />
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              disabled={!editing}
              className={`w-full px-4 py-3 bg-[#0A0A0F] border rounded-lg text-[#F5F3E8] focus:outline-none transition-colors ${
                editing
                  ? usernameError
                    ? 'border-[#FF6B9D] focus:border-[#FF6B9D]'
                    : usernameAvailable === true
                    ? 'border-[#50C878] focus:border-[#50C878]'
                    : 'border-[#3A3A4F] focus:border-[#00F0FF]'
                  : 'border-[#2A2A2F] cursor-not-allowed'
              }`}
            />
            {editing && username && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameAvailable === true && !usernameError && (
                  <Check className="w-5 h-5 text-[#50C878]" />
                )}
                {(usernameAvailable === false || usernameError) && (
                  <X className="w-5 h-5 text-[#FF6B9D]" />
                )}
              </div>
            )}
          </div>
          {editing && (
            <div className="mt-2 space-y-1">
              {usernameError && (
                <p className="text-xs text-[#FF6B9D]">{usernameError}</p>
              )}
              {usernameAvailable === true && !usernameError && username !== profile?.username && (
                <p className="text-xs text-[#50C878]">✓ Username available!</p>
              )}
              <p className="text-xs text-[#6B6B78]">
                {USERNAME_CONSTRAINTS.MIN_LENGTH}-{USERNAME_CONSTRAINTS.MAX_LENGTH} characters, letters, numbers, underscore, hyphen only
              </p>
            </div>
          )}
          {!editing && profile?.username && (
            <p className="text-xs text-[#A0A0A5] mt-1">
              Your username: <span className="text-[#00F0FF]">@{profile.username}</span>
            </p>
          )}
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold text-[#F5F3E8] mb-2 flex items-center gap-2">
            <Type className="w-4 h-4 text-[#A78BFA]" />
            Display Name (Optional)
          </label>
          <input
            type="text"
            placeholder="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!editing}
            maxLength={50}
            className={`w-full px-4 py-3 bg-[#0A0A0F] border rounded-lg text-[#F5F3E8] focus:outline-none ${
              editing
                ? 'border-[#3A3A4F] focus:border-[#A78BFA]'
                : 'border-[#2A2A2F] cursor-not-allowed'
            }`}
          />
          <p className="text-xs text-[#6B6B78] mt-1">
            A friendly name shown alongside your username (max 50 characters)
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-[#F5F3E8] mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#50C878]" />
            Bio (Optional)
          </label>
          <textarea
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!editing}
            rows={3}
            maxLength={200}
            className={`w-full px-4 py-3 bg-[#0A0A0F] border rounded-lg text-[#F5F3E8] focus:outline-none resize-none ${
              editing
                ? 'border-[#3A3A4F] focus:border-[#50C878]'
                : 'border-[#2A2A2F] cursor-not-allowed'
            }`}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-[#6B6B78]">
              A short bio about yourself
            </p>
            <p className="text-xs text-[#6B6B78]">
              {bio.length}/200
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-[#2A2A2F] space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#6B6B78]">
            <Calendar className="w-4 h-4" />
            <span>Joined: {new Date(profile?.joinedDate || 0).toLocaleDateString()}</span>
          </div>
          {profile?.proofScore !== undefined && (
            <div className="flex items-center gap-2 text-sm text-[#6B6B78]">
              <Shield className="w-4 h-4" />
              <span>ProofScore: {(profile.proofScore / 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
