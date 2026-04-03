'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function NotificationItem({
  notification,
  onRead,
  onArchive,
  onSnooze,
  onAction,
  compact = false,
}: NotificationItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const colors = TYPE_COLORS[notification.type];

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      onArchive();
    } else if (info.offset.x > 80) {
      onRead();
    }
    setSwipeX(0);
  }, [onArchive, onRead]);

  return (
    <motion.div
      className="relative overflow-hidden"
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.3}
      onDrag={(_, info) => setSwipeX(info.offset.x)}
      onDragEnd={handleDragEnd}
    >
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        <div className={`flex-1 flex items-center justify-start pl-4 ${swipeX > 0 ? 'bg-emerald-500/30' : ''}`}>
          {swipeX > 30 && <Check className="text-emerald-400" size={20} />}
        </div>
        <div className={`flex-1 flex items-center justify-end pr-4 ${swipeX < 0 ? 'bg-orange-500/30' : ''}`}>
          {swipeX < -30 && <Archive className="text-orange-400" size={20} />}
        </div>
      </div>

      {/* Content */}
      <motion.div
        style={{ x: swipeX }}
        className={`
          relative ${colors.bg} border-b border-white/5
          ${!notification.read ? 'bg-white/5' : ''}
          hover:bg-white/5 transition-colors cursor-pointer
        `}
        onClick={() => {
          if (!notification.read) onRead();
          onAction?.();
        }}
      >
        <div className={`p-${compact ? '3' : '4'}`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`
              shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg ${colors.icon} 
              flex items-center justify-center ${compact ? 'text-base' : 'text-lg'}
            `}>
              {notification.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`
                    font-medium text-white ${compact ? 'text-xs' : 'text-sm'} leading-tight
                    ${!notification.read ? 'font-semibold' : ''}
                  `}>
                    {notification.title}
                  </h4>
                  <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400 mt-0.5 line-clamp-1`}>
                    {notification.message}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="shrink-0 w-2 h-2 rounded-full bg-cyan-400 mt-1" />
                )}
              </div>

              <div className="flex items-center justify-between mt-1.5">
                <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
                  {formatTimeAgo(notification.timestamp)}
                </span>

                {/* Priority badge */}
                <span className={`
                  ${compact ? 'text-[9px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'}
                  rounded-full ${PRIORITY_COLORS[notification.priority]} text-white font-medium
                `}>
                  {notification.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons (visible on hover) */}
          {!compact && (
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onRead(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Mark as read"
              >
                <Check size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onSnooze(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Snooze"
              >
                <Clock size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Archive"
              >
                <Archive size={12} />
              </button>
              {notification.actionUrl && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAction?.(); }}
                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                  title="Open"
                >
                  <ExternalLink size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
