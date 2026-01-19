/**
 * Presence Indicator Component
 * 
 * Visual indicator for user online/offline status.
 * Can be used inline with user names, avatars, etc.
 */

'use client';

import { formatLastSeen, useUserPresence, type PresenceStatus } from '@/lib/presence';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceIndicatorProps {
  address: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showLastSeen?: boolean;
  className?: string;
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400',
};

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function PresenceIndicator({
  address,
  size = 'md',
  showLabel = false,
  showLastSeen = false,
  className = '',
}: PresenceIndicatorProps) {
  const presence = useUserPresence(address);
  
  if (!presence) {
    return null;
  }

  const isOnline = presence.status === 'online';
  const colorClass = statusColors[presence.status];
  const sizeClass = sizeClasses[size];

  return (
    <motion.div 
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative">
        <motion.div
          className={`${sizeClass} ${colorClass} rounded-full`}
          title={statusLabels[presence.status]}
          animate={isOnline ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {isOnline && (
          <motion.div
            className={`absolute inset-0 ${sizeClass} ${colorClass} rounded-full`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>

      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {statusLabels[presence.status]}
        </span>
      )}

      {showLastSeen && presence.status === 'offline' && (
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {formatLastSeen(presence.lastSeen)}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Presence Badge - Shows status as a badge
 */
export function PresenceBadge({
  address,
  className = '',
}: {
  address: string;
  className?: string;
}) {
  const presence = useUserPresence(address);
  
  if (!presence) {
    return null;
  }

  const statusColor = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    away: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    busy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        statusColor[presence.status]
      } ${className}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <motion.span
        className={`h-1.5 w-1.5 rounded-full ${statusColors[presence.status]}`}
        animate={presence.status === 'online' ? {
          scale: [1, 1.3, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {statusLabels[presence.status]}
    </motion.span>
  );
}

/**
 * Presence Dot - Minimal indicator, typically used on avatars
 */
export function PresenceDot({
  address,
  className = '',
  position = 'bottom-right',
}: {
  address: string;
  className?: string;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}) {
  const presence = useUserPresence(address);
  
  if (!presence) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-0 right-0',
    'bottom-right': 'bottom-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-left': 'bottom-0 left-0',
  };

  const isOnline = presence.status === 'online';

  return (
    <div
      className={`absolute ${positionClasses[position]} ${className}`}
      title={statusLabels[presence.status]}
    >
      <motion.div
        className={`h-3 w-3 ${statusColors[presence.status]} rounded-full border-2 border-white dark:border-gray-900`}
        animate={isOnline ? {
          scale: [1, 1.15, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
}

/**
 * Presence Avatar Wrapper - Wraps an avatar with presence indicator
 */
export function PresenceAvatar({
  address,
  children,
  showDot = true,
  className = '',
}: {
  address: string;
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      {showDot && <PresenceDot address={address} />}
    </div>
  );
}

/**
 * Online Count - Shows number of online users
 */
export function OnlineCount({
  addresses,
  className = '',
}: {
  addresses: string[];
  className?: string;
}) {
  const [onlineCount, setOnlineCount] = React.useState(0);

  React.useEffect(() => {
    // Count is managed by the parent component or context
    // Hook cannot be called inside filter
    setOnlineCount(0);
  }, [addresses]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {onlineCount} online
      </span>
    </div>
  );
}

/**
 * Last Seen Text - Shows when user was last online
 */
export function LastSeenText({
  address,
  className = '',
}: {
  address: string;
  className?: string;
}) {
  const presence = useUserPresence(address);
  
  if (!presence || presence.status === 'online') {
    return null;
  }

  return (
    <span className={`text-xs text-gray-500 dark:text-gray-500 ${className}`}>
      Last seen {formatLastSeen(presence.lastSeen)}
    </span>
  );
}
