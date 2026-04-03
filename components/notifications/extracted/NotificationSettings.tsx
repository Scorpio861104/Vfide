'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function NotificationSettings({ preferences, onUpdate }: NotificationSettingsProps) {
  const categories: { key: NotificationCategory; label: string; icon: string }[] = [
    { key: 'transaction', label: 'Transactions', icon: '💰' },
    { key: 'governance', label: 'Governance', icon: '🗳️' },
    { key: 'merchant', label: 'Merchant', icon: '🏪' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'system', label: 'System', icon: '⚙️' },
    { key: 'social', label: 'Social', icon: '👥' },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Global settings */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">General</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Enable notifications</span>
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => onUpdate({ ...preferences, enabled: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Sound</span>
            <input
              type="checkbox"
              checked={preferences.sound}
              onChange={(e) => onUpdate({ ...preferences, sound: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Desktop notifications</span>
            <input
              type="checkbox"
              checked={preferences.desktop}
              onChange={(e) => onUpdate({ ...preferences, desktop: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Vibrate (mobile)</span>
            <input
              type="checkbox"
              checked={preferences.vibrate}
              onChange={(e) => onUpdate({ ...preferences, vibrate: e.target.checked })}
              className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
            />
          </label>
        </div>
      </div>

      {/* Category settings */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map(({ key, label, icon }) => (
            <label key={key} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <span>{icon}</span>
                {label}
              </span>
              <input
                type="checkbox"
                checked={preferences.categories[key]}
                onChange={(e) => onUpdate({
                  ...preferences,
                  categories: { ...preferences.categories, [key]: e.target.checked }
                })}
                className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Quiet Hours</h4>
        <label className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-300">Enable quiet hours</span>
          <input
            type="checkbox"
            checked={preferences.quietHours.enabled}
            onChange={(e) => onUpdate({
              ...preferences,
              quietHours: { ...preferences.quietHours, enabled: e.target.checked }
            })}
            className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-cyan-500/50"
          />
        </label>
        {preferences.quietHours.enabled && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Start</label>
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => onUpdate({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, start: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">End</label>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => onUpdate({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, end: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Snooze duration */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Snooze Duration</h4>
        <select
          value={preferences.snoozeMinutes}
          onChange={(e) => onUpdate({ ...preferences, snoozeMinutes: Number(e.target.value) })}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
          <option value={480}>8 hours</option>
        </select>
      </div>
    </div>
  );
}
