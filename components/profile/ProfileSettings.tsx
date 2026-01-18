/**
 * Profile Settings Component
 * 
 * Complete profile management including avatar upload, bio, alias, etc.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Mail, MapPin, Link as LinkIcon, Calendar, Shield, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { AvatarUpload } from './AvatarUpload';
import { useUserProfile } from '@/hooks/useAPI';
import { sanitizeInput, sanitizeURL } from '@/lib/sanitize';
import { WalletSettings } from '@/components/wallet/WalletSettings';

export function ProfileSettings() {
  const { address } = useAccount();
  const { profile, updateProfile, uploadAvatar: _uploadAvatar, isLoading, error } = useUserProfile(address);

  const [formData, setFormData] = useState({
    alias: '',
    bio: '',
    email: '',
    location: '',
    website: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        alias: profile.alias || '',
        bio: profile.bio || '',
        email: profile.email || '',
        location: profile.location || '',
        website: profile.website || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!address) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Sanitize inputs
      const sanitizedData = {
        alias: sanitizeInput(formData.alias),
        bio: sanitizeInput(formData.bio),
        email: sanitizeInput(formData.email),
        location: sanitizeInput(formData.location),
        website: sanitizeURL(formData.website),
      };

      await updateProfile(sanitizedData);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (_avatarUrl: string) => {
    // Avatar is already uploaded via API, just update local state
    // Avatar upload processed
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00F0FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#A0A0A5]">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">Profile Settings</h2>
          <p className="text-sm text-[#6B6B78]">Manage your public profile information</p>
        </div>

        {/* Avatar Section */}
        <div className="mb-8 pb-8 border-b border-[#3A3A4F]">
          <h3 className="text-sm font-semibold text-[#F5F3E8] mb-4">Profile Picture</h3>
          <AvatarUpload
            currentAvatar={profile?.avatar}
            onUploadComplete={handleAvatarUpload}
            size="lg"
          />
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Wallet Address (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Wallet Address
            </label>
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg">
              <Shield className="w-4 h-4 text-[#00F0FF]" />
              <span className="text-sm text-[#F5F3E8] font-mono">{address}</span>
            </div>
            <p className="text-xs text-[#6B6B78] mt-1">Your wallet address cannot be changed</p>
          </div>

          {/* Alias */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
              <input
                type="text"
                value={formData.alias}
                onChange={(e) => handleInputChange('alias', e.target.value)}
                placeholder="Enter your display name"
                maxLength={50}
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder:text-[#6B6B78] focus:border-[#00F0FF] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-[#6B6B78] mt-1">
              {formData.alias.length}/50 characters
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={4}
              className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder:text-[#6B6B78] focus:border-[#00F0FF] focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-[#6B6B78] mt-1">
              {formData.bio.length}/200 characters
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Email (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@example.com"
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder:text-[#6B6B78] focus:border-[#00F0FF] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-[#6B6B78] mt-1">
              Your email will not be publicly visible
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Location (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
                maxLength={50}
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder:text-[#6B6B78] focus:border-[#00F0FF] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
              Website (Optional)
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B78]" />
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] placeholder:text-[#6B6B78] focus:border-[#00F0FF] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Joined Date (Read-only) */}
          {profile?.createdAt && (
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-2">
                Member Since
              </label>
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg">
                <Calendar className="w-4 h-4 text-[#6B6B78]" />
                <span className="text-sm text-[#F5F3E8]">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-8 pt-8 border-t border-[#3A3A4F]">
          <div className="flex items-center justify-between">
            <div>
              {saveSuccess && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-green-400"
                >
                  ✓ Profile saved successfully
                </motion.p>
              )}
              {error && (
                <p className="text-sm text-red-400">
                  Failed to save profile. Please try again.
                </p>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg font-semibold hover:bg-[#00D5E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Connection Settings */}
      <div className="mt-6">
        <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F5F3E8]">Wallet Settings</h2>
              <p className="text-sm text-[#6B6B78]">Manage your wallet connection preferences</p>
            </div>
          </div>
          <WalletSettings />
        </div>
      </div>
    </div>
  );
}
