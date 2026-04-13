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
      <div className="text-center py-12 text-zinc-500">
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
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <User className="w-6 h-6 text-cyan-400" />
            Account Settings
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Set your username and display name
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg font-semibold hover:bg-cyan-400 transition-colors flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !!usernameError || (usernameAvailable === false)}
              className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-lg font-semibold hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-zinc-800 text-zinc-100 rounded-lg font-semibold hover:bg-zinc-700 transition-colors"
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
          className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center gap-2 text-emerald-500"
        >
          <Check className="w-5 h-5" />
          <span className="font-semibold">Profile saved successfully!</span>
        </motion.div>
      )}

      {/* Profile Form */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 space-y-6">
        {/* Wallet Address (Read-only) */}
        <div>
          <label className="block text-sm font-semibold text-zinc-400 mb-2">
            Wallet Address
          </label>
          <div className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-500 font-mono">
            {address}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Your wallet address cannot be changed
          </p>
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
            <AtSign className="w-4 h-4 text-cyan-400" />
            Username
          </label>
          <div className="relative">
            <input
              type="text"
             
              value={username}
              onChange={(e) =>  setUsername(e.target.value.toLowerCase())}
              disabled={!editing}
              className={`w-full px-4 py-3 bg-zinc-950 border rounded-lg text-zinc-100 focus:outline-none transition-colors ${
                editing
                  ? usernameError
                    ? 'border-pink-400 focus:border-pink-400'
                    : usernameAvailable === true
                    ? 'border-emerald-500 focus:border-emerald-500'
                    : 'border-zinc-700 focus:border-cyan-400'
                  : 'border-zinc-800 cursor-not-allowed'
              }`}
            />
            {editing && username && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameAvailable === true && !usernameError && (
                  <Check className="w-5 h-5 text-emerald-500" />
                )}
                {(usernameAvailable === false || usernameError) && (
                  <X className="w-5 h-5 text-pink-400" />
                )}
              </div>
            )}
          </div>
          {editing && (
            <div className="mt-2 space-y-1">
              {usernameError && (
                <p className="text-xs text-pink-400">{usernameError}</p>
              )}
              {usernameAvailable === true && !usernameError && username !== profile?.username && (
                <p className="text-xs text-emerald-500">✓ Username available!</p>
              )}
              <p className="text-xs text-zinc-500">
                {USERNAME_CONSTRAINTS.MIN_LENGTH}-{USERNAME_CONSTRAINTS.MAX_LENGTH} characters, letters, numbers, underscore, hyphen only
              </p>
            </div>
          )}
          {!editing && profile?.username && (
            <p className="text-xs text-zinc-400 mt-1">
              Your username: <span className="text-cyan-400">@{profile.username}</span>
            </p>
          )}
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
            <Type className="w-4 h-4 text-violet-400" />
            Display Name (Optional)
          </label>
          <input
            type="text"
           
            value={displayName}
            onChange={(e) =>  setDisplayName(e.target.value)}
            disabled={!editing}
            maxLength={50}
            className={`w-full px-4 py-3 bg-zinc-950 border rounded-lg text-zinc-100 focus:outline-none ${
              editing
                ? 'border-zinc-700 focus:border-violet-400'
                : 'border-zinc-800 cursor-not-allowed'
            }`}
          />
          <p className="text-xs text-zinc-500 mt-1">
            A friendly name shown alongside your username (max 50 characters)
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Bio (Optional)
          </label>
          <textarea
           
            value={bio}
            onChange={(e) =>  setBio(e.target.value)}
            disabled={!editing}
            rows={3}
            maxLength={200}
            className={`w-full px-4 py-3 bg-zinc-950 border rounded-lg text-zinc-100 focus:outline-none resize-none ${
              editing
                ? 'border-zinc-700 focus:border-emerald-500'
                : 'border-zinc-800 cursor-not-allowed'
            }`}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-zinc-500">
              A short bio about yourself
            </p>
            <p className="text-xs text-zinc-500">
              {bio.length}/200
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="w-4 h-4" />
            <span>Joined: {new Date(profile?.joinedDate || 0).toLocaleDateString()}</span>
          </div>
          {profile?.proofScore !== undefined && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Shield className="w-4 h-4" />
              <span>ProofScore: {(profile.proofScore / 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
