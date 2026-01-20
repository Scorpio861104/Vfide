// Helper component to display user with username support

import React, { useEffect, useState } from 'react';
import { UserProfileService } from '@/lib/userProfileService';
import { UserProfile } from '@/types/userProfile';

interface UserDisplayProps {
  address: string;
  fallbackAlias?: string;
  showAddress?: boolean;
  className?: string;
}

export function UserDisplay({ address, fallbackAlias, showAddress = false, className = '' }: UserDisplayProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const cached = UserProfileService.getProfile(address);
    setProfile(cached);
  }, [address]);

  const displayName = profile?.username 
    ? `@${profile.username}` 
    : profile?.displayName 
    ? profile.displayName 
    : fallbackAlias 
    ? fallbackAlias 
    : `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className={className}>
      <div className="font-semibold">{displayName}</div>
      {showAddress && profile?.username && (
        <div className="text-xs opacity-60">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      )}
    </div>
  );
}

interface UserAvatarProps {
  address: string;
  username?: string;
  alias?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ address, username, alias, size = 'md', className = '' }: UserAvatarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const cached = UserProfileService.getProfile(address);
    setProfile(cached);
  }, [address]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const displayText = profile?.username || username || alias || address;
  const initials = displayText.slice(0, 2).toUpperCase();

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center font-bold text-zinc-950 ${className}`}>
      {initials}
    </div>
  );
}
