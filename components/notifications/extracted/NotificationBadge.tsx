'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function NotificationBadge({ 
  count, 
  onClick, 
  size = 'md',
  pulse = true 
}: NotificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const badgeSizeClasses = {
    sm: 'w-4 h-4 text-[9px] -top-1 -right-1',
    md: 'w-5 h-5 text-[10px] -top-1 -right-1',
    lg: 'w-6 h-6 text-xs -top-1.5 -right-1.5',
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative ${sizeClasses[size]} rounded-xl 
        bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
        flex items-center justify-center transition-all
        focus:outline-none focus:ring-2 focus:ring-cyan-500/50
      `}
    >
      <Bell size={size === 'sm' ? 16 : size === 'md' ? 18 : 20} className="text-gray-400" />
      
      {count > 0 && (
        <>
          <span className={`
            absolute ${badgeSizeClasses[size]} rounded-full 
            bg-gradient-to-r from-cyan-500 to-blue-500 
            flex items-center justify-center font-bold text-white
          `}>
            {count > 99 ? '99+' : count}
          </span>
          
          {/* Pulse animation */}
          {pulse && (
            <span className={`
              absolute ${badgeSizeClasses[size]} rounded-full 
              bg-cyan-500 animate-ping opacity-50
            `} />
          )}
        </>
      )}
    </button>
  );
}
