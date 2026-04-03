'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function NavbarNotificationBell() {
  const { unreadCount, notifications: _notifications, markAsRead: _markAsRead, archive: _archive, snooze: _snooze } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <NotificationBadge
        count={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        pulse={unreadCount > 0}
      />
      <NotificationDropdown 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </div>
  );
}
