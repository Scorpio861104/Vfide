'use client';

/**
 * Empty States
 * 
 * Beautiful, helpful empty state components that guide users
 * when there's no data to display.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

// ==================== TYPES ====================

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: 'inbox' | 'search' | 'wallet' | 'messages' | 'notifications' | 'activity' | 'custom';
  className?: string;
}

// ==================== ILLUSTRATIONS ====================

function InboxIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.rect
        x="20"
        y="30"
        width="80"
        height="60"
        rx="8"
        fill="#1F2937"
        stroke="#374151"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M20 50L60 75L100 50"
        stroke="#00FFB2"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.circle
        cx="60"
        cy="55"
        r="8"
        fill="#00FFB2"
        fillOpacity="0.2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
    </motion.svg>
  );
}

function SearchIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.circle
        cx="50"
        cy="50"
        r="30"
        stroke="#374151"
        strokeWidth="4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.line
        x1="72"
        y1="72"
        x2="95"
        y2="95"
        stroke="#00FFB2"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      />
      <motion.path
        d="M40 45C42 40 48 35 55 40"
        stroke="#374151"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
    </motion.svg>
  );
}

function WalletIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.rect
        x="15"
        y="35"
        width="90"
        height="55"
        rx="8"
        fill="#1F2937"
        stroke="#374151"
        strokeWidth="2"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5 }}
      />
      <motion.rect
        x="70"
        y="50"
        width="30"
        height="25"
        rx="4"
        fill="#00FFB2"
        fillOpacity="0.2"
        stroke="#00FFB2"
        strokeWidth="2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />
      <motion.circle
        cx="85"
        cy="62"
        r="5"
        fill="#00FFB2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
    </motion.svg>
  );
}

function MessagesIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.rect
        x="20"
        y="25"
        width="60"
        height="40"
        rx="8"
        fill="#1F2937"
        stroke="#374151"
        strokeWidth="2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.rect
        x="40"
        y="55"
        width="60"
        height="40"
        rx="8"
        fill="#00FFB2"
        fillOpacity="0.1"
        stroke="#00FFB2"
        strokeWidth="2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      <motion.line
        x1="30"
        y1="38"
        x2="70"
        y2="38"
        stroke="#374151"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      <motion.line
        x1="30"
        y1="48"
        x2="55"
        y2="48"
        stroke="#374151"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
    </motion.svg>
  );
}

function NotificationsIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.path
        d="M60 25C45 25 35 35 35 50V70L25 80H95L85 70V50C85 35 75 25 60 25Z"
        fill="#1F2937"
        stroke="#374151"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.circle
        cx="60"
        cy="90"
        r="8"
        fill="#00FFB2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
      <motion.path
        d="M60 25V18"
        stroke="#00FFB2"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      />
    </motion.svg>
  );
}

function ActivityIllustration() {
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.path
        d="M20 60H35L45 30L55 80L65 50L75 65L85 40L100 60"
        stroke="#00FFB2"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.line
        x1="20"
        y1="90"
        x2="100"
        y2="90"
        stroke="#374151"
        strokeWidth="2"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
    </motion.svg>
  );
}

const illustrations = {
  inbox: InboxIllustration,
  search: SearchIllustration,
  wallet: WalletIllustration,
  messages: MessagesIllustration,
  notifications: NotificationsIllustration,
  activity: ActivityIllustration,
  custom: () => null,
};

// ==================== MAIN COMPONENT ====================

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration = 'inbox',
  className = '',
}: EmptyStateProps) {
  const Illustration = illustrations[illustration];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      {/* Illustration or Icon */}
      <div className="mb-6">
        {illustration !== 'custom' ? (
          <Illustration />
        ) : Icon ? (
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <Icon className="w-10 h-10 text-gray-500" />
          </div>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-200 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-gray-400 max-w-sm mb-6">{description}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-colors"
          >
            {action.label}
          </motion.button>
        )}
        {secondaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={secondaryAction.onClick}
            className="px-6 py-2.5 border border-gray-600 hover:border-gray-500 text-gray-300 font-medium rounded-xl transition-colors"
          >
            {secondaryAction.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ==================== PRESET EMPTY STATES ====================

export function NoTransactions({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      illustration="activity"
      title="No transactions yet"
      description="Your transaction history will appear here once you start making transfers."
      action={onAction ? { label: 'Make a Transfer', onClick: onAction } : undefined}
    />
  );
}

export function NoMessages({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      illustration="messages"
      title="No messages yet"
      description="Start a conversation with friends or colleagues."
      action={onAction ? { label: 'New Message', onClick: onAction } : undefined}
    />
  );
}

export function NoNotifications() {
  return (
    <EmptyState
      illustration="notifications"
      title="All caught up!"
      description="You have no new notifications. We'll let you know when something important happens."
    />
  );
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      illustration="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

export function NoWalletConnected({ onConnect }: { onConnect: () => void }) {
  return (
    <EmptyState
      illustration="wallet"
      title="Connect your wallet"
      description="Connect a wallet to view your balances, transactions, and more."
      action={{ label: 'Connect Wallet', onClick: onConnect }}
    />
  );
}

export function NoFriends({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No friends added yet"
      description="Add friends to send payments and split bills easily."
      action={onAction ? { label: 'Find Friends', onClick: onAction } : undefined}
      illustration="custom"
    />
  );
}

export function NoAchievements({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={Trophy}
      title="No achievements yet"
      description="Complete actions to earn badges and achievements."
      action={onAction ? { label: 'Explore Challenges', onClick: onAction } : undefined}
      illustration="custom"
    />
  );
}

export default EmptyState;
