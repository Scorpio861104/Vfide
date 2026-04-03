'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function NotificationToast({ 
  notification, 
  onDismiss, 
  onAction,
  onSnooze 
}: NotificationToastProps) {
  const [isDragging, setIsDragging] = useState(false);
  const colors = TYPE_COLORS[notification.type];

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (Math.abs(info.offset.x) > 100) {
      onDismiss();
    }
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: isDragging ? 0 : 300, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className={`
        relative overflow-hidden rounded-xl border ${colors.border} ${colors.bg}
        backdrop-blur-xl shadow-2xl cursor-grab active:cursor-grabbing
        max-w-sm w-full
      `}
    >
      {/* Priority indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${PRIORITY_COLORS[notification.priority]}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center text-xl`}>
            {notification.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-white text-sm leading-tight">
                {notification.title}
              </h4>
              <button
                onClick={onDismiss}
                className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{notification.source}</span>
              <span>•</span>
              <span>{formatTimeAgo(notification.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          {notification.actionUrl && (
            <button
              onClick={onAction}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors"
            >
              {notification.actionLabel || 'View'}
              <ChevronRight size={12} />
            </button>
          )}
          <button
            onClick={onSnooze}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Snooze"
          >
            <Clock size={14} className="text-gray-400" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Dismiss"
          >
            <Check size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Swipe hint */}
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
    </motion.div>
  );
}
