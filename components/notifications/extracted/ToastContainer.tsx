'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function ToastContainer({ 
  notifications, 
  onDismiss, 
  onAction,
  onSnooze,
  maxVisible = 3 
}: ToastContainerProps) {
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div className="fixed top-4 right-4 z-200 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onDismiss={() => onDismiss(notification.id)}
              onAction={() => onAction?.(notification)}
              onSnooze={() => onSnooze?.(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
