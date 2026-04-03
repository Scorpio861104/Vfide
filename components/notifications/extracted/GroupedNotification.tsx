'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function GroupedNotification({
  group,
  onExpand,
  onReadAll,
  onArchiveAll,
}: GroupedNotificationProps) {
  const first = group.notifications[0];
  
  // Early return if no notifications
  if (!first || group.count === 1) {
    return null; // Use NotificationItem for single items
  }
  
  const colors = TYPE_COLORS[first.type];
  const unreadCount = group.notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        ${colors.bg} border ${colors.border} rounded-xl overflow-hidden
        hover:bg-white/5 transition-colors cursor-pointer
      `}
      onClick={onExpand}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Stacked icons */}
          <div className="relative shrink-0 w-12 h-12">
            {group.notifications.slice(0, 3).map((n, i) => (
              <div
                key={n.id}
                className={`
                  absolute w-8 h-8 rounded-lg ${colors.icon} 
                  flex items-center justify-center text-sm
                  border-2 border-zinc-950
                `}
                style={{
                  top: i * 4,
                  left: i * 4,
                  zIndex: 3 - i,
                }}
              >
                {n.icon}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-white text-sm">
                {group.count} {first.category} notifications
              </h4>
              {unreadCount > 0 && (
                <span className="shrink-0 px-2 py-0.5 bg-cyan-500 rounded-full text-xs font-medium text-white">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {first.title} and {group.count - 1} more
            </p>
            <span className="text-xs text-gray-500 mt-1">
              {formatTimeAgo(group.latestTimestamp)}
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors"
          >
            View All
            <ChevronRight size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReadAll(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Mark all as read"
          >
            <CheckCheck size={14} className="text-gray-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onArchiveAll(); }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Archive all"
          >
            <Archive size={14} className="text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
