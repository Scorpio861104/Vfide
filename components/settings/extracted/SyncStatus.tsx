'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SyncStatus({ status, lastSaved }: SyncStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'synced':
        return <Cloud className="w-4 h-4" />;
      case 'error':
        return <CloudOff className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'syncing':
        return 'text-yellow-500';
      case 'synced':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return lastSaved ? `Last saved ${formatTimeAgo(lastSaved)}` : 'Not saved';
    }
  };

  return (
    <motion.div 
      className={`flex items-center gap-2 text-sm ${getColor()}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={status}
    >
      {getIcon()}
      <span>{getMessage()}</span>
    </motion.div>
  );
}
