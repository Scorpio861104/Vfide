'use client';

import { motion } from 'framer-motion';
import { NotificationPreference, NotificationType, NotificationFrequency, DeliveryChannel, DEFAULT_NOTIFICATION_PREFERENCES } from '@/config/notification-hub';
import { Bell, Mail, MessageSquare, Send, Smartphone, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';

interface NotificationPreferencesProps {
  preferences: Record<NotificationType, NotificationPreference>;
  onUpdatePreference: (type: NotificationType, preference: Partial<NotificationPreference>) => void;
  onReset: () => void;
}

export function NotificationPreferences({
  preferences,
  onUpdatePreference,
  onReset,
}: NotificationPreferencesProps) {
  const [expandedType, setExpandedType] = useState<NotificationType | null>(null);

  const channelIcons: Record<DeliveryChannel, React.ReactNode> = {
    [DeliveryChannel.IN_APP]: <Bell className="w-4 h-4" />,
    [DeliveryChannel.EMAIL]: <Mail className="w-4 h-4" />,
    [DeliveryChannel.SMS]: <MessageSquare className="w-4 h-4" />,
    [DeliveryChannel.PUSH]: <Smartphone className="w-4 h-4" />,
    [DeliveryChannel.WEBHOOK]: <Send className="w-4 h-4" />,
  };

  const frequencyLabel: Record<NotificationFrequency, string> = {
    [NotificationFrequency.INSTANT]: 'Instant',
    [NotificationFrequency.HOURLY]: 'Hourly',
    [NotificationFrequency.DAILY]: 'Daily',
    [NotificationFrequency.WEEKLY]: 'Weekly',
    [NotificationFrequency.NEVER]: 'Never',
  };

  const getColor = (type: NotificationType): string => {
    const colors: Record<NotificationType, string> = {
      [NotificationType.TRANSACTION]: 'text-green-400',
      [NotificationType.SECURITY]: 'text-red-400',
      [NotificationType.GOVERNANCE]: 'text-purple-400',
      [NotificationType.REWARD]: 'text-yellow-400',
      [NotificationType.ALERT]: 'text-orange-400',
      [NotificationType.SYSTEM]: 'text-cyan-400',
      [NotificationType.SOCIAL]: 'text-pink-400',
      [NotificationType.MARKET]: 'text-blue-400',
    };
    return colors[type];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Notification Preferences</h3>
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Preferences List */}
      <div className="space-y-2">
        {Object.entries(preferences).map(([type, pref]) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpandedType(expandedType === (type as NotificationType) ? null : (type as NotificationType))
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className={`w-5 h-5 ${getColor(type as NotificationType)}`} />
                <span className="font-medium text-white capitalize">{type}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePreference(type as NotificationType, {
                      enabled: !pref.enabled,
                    });
                  }}
                  className="p-1"
                >
                  {pref.enabled ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                  )}
                </button>

                <motion.div
                  animate={{ rotate: expandedType === type ? 180 : 0 }}
                  className="text-slate-400"
                >
                  <ChevronDownIcon />
                </motion.div>
              </div>
            </button>

            {/* Expanded Content */}
            {expandedType === type && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-4 border-t border-slate-800 space-y-4"
              >
                {/* Frequency */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={pref.frequency}
                    onChange={(e) =>
                      onUpdatePreference(type as NotificationType, {
                        frequency: e.target.value as NotificationFrequency,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(frequencyLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Delivery Channels
                  </label>
                  <div className="space-y-2">
                    {Object.values(DeliveryChannel).map((channel) => (
                      <label
                        key={channel}
                        className="flex items-center gap-3 p-2 hover:bg-slate-800/50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={pref.channels.includes(channel)}
                          onChange={(e) => {
                            const newChannels = e.target.checked
                              ? [...pref.channels, channel]
                              : pref.channels.filter((c) => c !== channel);
                            onUpdatePreference(type as NotificationType, {
                              channels: newChannels,
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {channelIcons[channel]}
                          <span className="text-sm text-white capitalize">
                            {channel.replace('_', ' ')}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Do Not Disturb */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      defaultChecked={!!(pref.doNotDisturbStart && pref.doNotDisturbEnd)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onUpdatePreference(type as NotificationType, {
                            doNotDisturbStart: '22:00',
                            doNotDisturbEnd: '08:00',
                          });
                        } else {
                          onUpdatePreference(type as NotificationType, {
                            doNotDisturbStart: undefined,
                            doNotDisturbEnd: undefined,
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    Do Not Disturb
                  </label>

                  {pref.doNotDisturbStart && pref.doNotDisturbEnd && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={pref.doNotDisturbStart}
                        onChange={(e) =>
                          onUpdatePreference(type as NotificationType, {
                            doNotDisturbStart: e.target.value,
                          })
                        }
                        className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="time"
                        value={pref.doNotDisturbEnd}
                        onChange={(e) =>
                          onUpdatePreference(type as NotificationType, {
                            doNotDisturbEnd: e.target.value,
                          })
                        }
                        className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}
