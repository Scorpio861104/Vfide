/**
 * Notification Settings Component
 * 
 * UI for managing push notification preferences.
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  X,
  Loader2,
  Clock,
  MessageSquare,
  AtSign,
  Heart,
  Users,
  Award,
  Megaphone,
  AlertCircle,
  Shield,
} from 'lucide-react';
import {
  NotificationType,
  usePushNotifications,
  useNotificationPreferences,
  showLocalNotification,
} from '@/lib/pushNotifications';
import { useAnnounce } from '@/lib/accessibility';

interface NotificationSettingsProps {
  userId: string;
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const { isSupported, permission, isSubscribed, loading: subLoading, subscribe, unsubscribe, requestPermission } = usePushNotifications(userId);
  const { preferences, loading: prefLoading, updatePreferences } = useNotificationPreferences(userId);
  const { announce } = useAnnounce();
  
  const [testingNotification, setTestingNotification] = useState(false);

  const loading = subLoading || prefLoading;

  const handleEnableNotifications = async () => {
    try {
      if (permission === 'denied') {
        announce('Notifications are blocked. Please enable them in your browser settings.', 'assertive');
        return;
      }

      if (permission === 'default') {
        await requestPermission();
      }

      await subscribe();
      announce('Notifications enabled', 'polite');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      announce('Failed to enable notifications', 'assertive');
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe();
      await updatePreferences({ enabled: false });
      announce('Notifications disabled', 'polite');
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      announce('Failed to disable notifications', 'assertive');
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      announce('Please enable notifications first', 'assertive');
      return;
    }

    setTestingNotification(true);
    try {
      await showLocalNotification('Test Notification', {
        body: 'This is a test notification from VFIDE!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      });
      announce('Test notification sent', 'polite');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      announce('Failed to send test notification', 'assertive');
    } finally {
      setTestingNotification(false);
    }
  };

  const handleToggleType = async (type: NotificationType) => {
    if (!preferences) return;

    const updated = {
      ...preferences.types,
      [type]: !preferences.types[type],
    };

    try {
      await updatePreferences({ types: updated });
      announce(`${getTypeLabel(type)} notifications ${updated[type] ? 'enabled' : 'disabled'}`, 'polite');
    } catch (error) {
      console.error('Failed to update notification type:', error);
      announce('Failed to update notification settings', 'assertive');
    }
  };

  const handleToggleQuietHours = async () => {
    if (!preferences?.quietHours) return;

    try {
      await updatePreferences({
        quietHours: {
          ...preferences.quietHours,
          enabled: !preferences.quietHours.enabled,
        },
      });
      announce(`Quiet hours ${!preferences.quietHours.enabled ? 'enabled' : 'disabled'}`, 'polite');
    } catch (error) {
      console.error('Failed to toggle quiet hours:', error);
      announce('Failed to update quiet hours', 'assertive');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-900/30 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-yellow-400 font-medium mb-1">Notifications Not Supported</h3>
          <p className="text-sm text-yellow-400/80">
            Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notification Settings
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage how you receive notifications
          </p>
        </div>

        {/* Main Toggle */}
        <button
          onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
          disabled={loading}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
            isSubscribed
              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubscribed ? (
            <>
              <BellOff className="w-4 h-4" />
              Disable Notifications
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Enable Notifications
            </>
          )}
        </button>
      </div>

      {/* Permission Status */}
      {permission === 'denied' && (
        <div className="bg-red-900/20 border border-red-900/30 rounded-xl p-6 flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-medium mb-1">Notifications Blocked</h3>
            <p className="text-sm text-red-400/80">
              You've blocked notifications for this site. To enable them, please update your browser settings.
            </p>
          </div>
        </div>
      )}

      {/* Test Notification */}
      {isSubscribed && (
        <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium mb-1">Test Notification</h3>
              <p className="text-sm text-gray-400">
                Send a test notification to make sure everything is working
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              disabled={testingNotification}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {testingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Send Test
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notification Types */}
      {isSubscribed && preferences && (
        <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Notification Types</h3>
          <div className="space-y-3">
            <NotificationTypeToggle
              icon={MessageSquare}
              label="Messages"
              description="New messages in your conversations"
              enabled={preferences.types[NotificationType.MESSAGE]}
              onToggle={() => handleToggleType(NotificationType.MESSAGE)}
            />
            <NotificationTypeToggle
              icon={AtSign}
              label="Mentions"
              description="When someone mentions you"
              enabled={preferences.types[NotificationType.MENTION]}
              onToggle={() => handleToggleType(NotificationType.MENTION)}
            />
            <NotificationTypeToggle
              icon={Heart}
              label="Reactions"
              description="Reactions to your messages"
              enabled={preferences.types[NotificationType.REACTION]}
              onToggle={() => handleToggleType(NotificationType.REACTION)}
            />
            <NotificationTypeToggle
              icon={Users}
              label="Group Invites"
              description="Invitations to join groups"
              enabled={preferences.types[NotificationType.GROUP_INVITE]}
              onToggle={() => handleToggleType(NotificationType.GROUP_INVITE)}
            />
            <NotificationTypeToggle
              icon={Award}
              label="Badges"
              description="New badges you've earned"
              enabled={preferences.types[NotificationType.BADGE_EARNED]}
              onToggle={() => handleToggleType(NotificationType.BADGE_EARNED)}
            />
            <NotificationTypeToggle
              icon={Megaphone}
              label="Announcements"
              description="Important platform announcements"
              enabled={preferences.types[NotificationType.ANNOUNCEMENT]}
              onToggle={() => handleToggleType(NotificationType.ANNOUNCEMENT)}
            />
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {isSubscribed && preferences?.quietHours && (
        <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-medium flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Quiet Hours
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Pause notifications during specific hours
              </p>
            </div>
            <button
              onClick={handleToggleQuietHours}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                preferences.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                animate={{ left: preferences.quietHours.enabled ? '24px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Start Time</label>
                <input
                  type="time"
                  value={preferences.quietHours?.start || '22:00'}
                  onChange={(e) => 
                    updatePreferences({
                      quietHours: {
                        enabled: preferences.quietHours?.enabled ?? true,
                        start: e.target.value,
                        end: preferences.quietHours?.end || '08:00',
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">End Time</label>
                <input
                  type="time"
                  value={preferences.quietHours?.end || '08:00'}
                  onChange={(e) => 
                    updatePreferences({
                      quietHours: {
                        enabled: preferences.quietHours?.enabled ?? true,
                        start: preferences.quietHours?.start || '22:00',
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Notification Type Toggle Component
// ============================================================================

interface NotificationTypeToggleProps {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function NotificationTypeToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: NotificationTypeToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#0F0F14] rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          enabled ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-500'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-white font-medium">{label}</div>
          <div className="text-sm text-gray-400">{description}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          enabled ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <motion.div
          className="w-5 h-5 bg-white rounded-full absolute top-0.5"
          animate={{ left: enabled ? '24px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function getTypeLabel(type: NotificationType): string {
  const labels = {
    [NotificationType.MESSAGE]: 'Messages',
    [NotificationType.MENTION]: 'Mentions',
    [NotificationType.REACTION]: 'Reactions',
    [NotificationType.GROUP_INVITE]: 'Group Invites',
    [NotificationType.BADGE_EARNED]: 'Badges',
    [NotificationType.ANNOUNCEMENT]: 'Announcements',
  };
  return labels[type] || type;
}
