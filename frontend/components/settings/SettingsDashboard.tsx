import React, { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import {
  SettingsState,
  ThemeOption,
  DateFormatOption,
  WeekStartOption,
  DensityOption,
  ProfileVisibility
} from '@/config/settings';

interface SettingsDashboardProps {
  onSave?: (settings: SettingsState) => void;
  onExport?: (settings: SettingsState) => void;
  onImport?: (settings: SettingsState) => void;
  className?: string;
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => (
  <label className="flex items-start justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
    <div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
      {description && <div className="text-xs text-gray-600 dark:text-gray-400">{description}</div>}
    </div>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 mt-1 text-blue-600 rounded"
      aria-label={label}
    />
  </label>
);

interface SelectRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  description?: string;
}

const SelectRow: React.FC<SelectRowProps> = ({ label, value, onChange, options, description }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
        {description && <div className="text-xs text-gray-600 dark:text-gray-400">{description}</div>}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
  onSave,
  onExport,
  onImport,
  className = ''
}) => {
  const {
    settings,
    isDirty,
    lastSaved,
    error,
    setTheme,
    updateNotifications,
    updatePrivacy,
    updateSecurity,
    updatePreferences,
    resetSettings,
    exportSettings,
    importSettings,
    save
  } = useSettings();

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [importText, setImportText] = useState('');

  const themeOptions: Array<{ value: ThemeOption; label: string; hint: string }> = useMemo(
    () => [
      { value: 'light', label: 'Light', hint: 'Bright background' },
      { value: 'dark', label: 'Dark', hint: 'Low-light friendly' },
      { value: 'system', label: 'System', hint: 'Match OS setting' }
    ],
    []
  );

  const densityOptions: Array<{ value: DensityOption; label: string }> = useMemo(
    () => [
      { value: 'comfortable', label: 'Comfortable' },
      { value: 'compact', label: 'Compact' }
    ],
    []
  );

  const dateFormatOptions: Array<{ value: DateFormatOption; label: string }> = useMemo(
    () => [
      { value: 'mdy', label: 'MM/DD/YYYY' },
      { value: 'dmy', label: 'DD/MM/YYYY' },
      { value: 'iso', label: 'YYYY-MM-DD (ISO)' }
    ],
    []
  );

  const weekStartOptions: Array<{ value: WeekStartOption; label: string }> = useMemo(
    () => [
      { value: 'monday', label: 'Monday' },
      { value: 'sunday', label: 'Sunday' }
    ],
    []
  );

  const visibilityOptions: Array<{ value: ProfileVisibility; label: string }> = useMemo(
    () => [
      { value: 'public', label: 'Public' },
      { value: 'team', label: 'Team Only' },
      { value: 'private', label: 'Private' }
    ],
    []
  );

  const handleSave = async () => {
    setStatus('saving');
    try {
      save();
      onSave?.(settings);
      // small delay to surface the saving state in the UI
      await new Promise((resolve) => setTimeout(resolve, 75));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleExport = () => {
    const payload = exportSettings();
    onExport?.(settings);

    // Download as file for convenience
    if (typeof window !== 'undefined') {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vfide-settings-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    const ok = importSettings(importText);
    if (ok) {
      onImport?.(settings);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1000);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings & Configuration</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your preferences, privacy, and security across the platform.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Last saved: {lastSaved ? lastSaved.toLocaleString() : 'Not saved yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || status === 'saving'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={resetSettings}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Reset to defaults
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Export
          </button>
        </div>
      </div>

      {/* Status */}
      {status === 'saved' && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200" role="status">
          Settings saved
        </div>
      )}
      {status === 'error' && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200" role="alert">
          {error || 'Could not update settings'}
        </div>
      )}

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
          <span className="text-xs text-gray-500">Theme and density</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <label
              key={opt.value}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                settings.theme === opt.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{opt.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{opt.hint}</div>
                </div>
                <input
                  type="radio"
                  name="theme"
                  value={opt.value}
                  checked={settings.theme === opt.value}
                  onChange={() => setTheme(opt.value)}
                  className="mt-1"
                  aria-label={`Theme ${opt.label}`}
                />
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <SelectRow
            label="Density"
            value={settings.preferences.density}
            onChange={(value) => updatePreferences({ density: value as DensityOption })}
            options={densityOptions}
            description="Choose compact mode for data-dense screens"
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
          <span className="text-xs text-gray-500">Channels and cadence</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Email alerts"
            description="Critical updates and security alerts"
            checked={settings.notifications.email}
            onChange={(checked) => updateNotifications({ email: checked })}
          />
          <ToggleRow
            label="Push notifications"
            description="Real-time updates on the go"
            checked={settings.notifications.push}
            onChange={(checked) => updateNotifications({ push: checked })}
          />
          <ToggleRow
            label="SMS alerts"
            description="Text messages for critical events"
            checked={settings.notifications.sms}
            onChange={(checked) => updateNotifications({ sms: checked })}
          />
          <ToggleRow
            label="Marketing updates"
            description="Product announcements and offers"
            checked={settings.notifications.marketing}
            onChange={(checked) => updateNotifications({ marketing: checked })}
          />
          <ToggleRow
            label="Product updates"
            description="Release notes and changelogs"
            checked={settings.notifications.productUpdates}
            onChange={(checked) => updateNotifications({ productUpdates: checked })}
          />
          <ToggleRow
            label="Weekly summary"
            description="Digest every Monday"
            checked={settings.notifications.weeklySummary}
            onChange={(checked) => updateNotifications({ weeklySummary: checked })}
          />
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Privacy</h2>
          <span className="text-xs text-gray-500">Data visibility and telemetry</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectRow
            label="Profile visibility"
            value={settings.privacy.profileVisibility}
            onChange={(value) => updatePrivacy({ profileVisibility: value as ProfileVisibility })}
            options={visibilityOptions}
            description="Control who can see your profile"
          />
          <ToggleRow
            label="Searchable profile"
            description="Allow teammates to find you"
            checked={settings.privacy.searchable}
            onChange={(checked) => updatePrivacy({ searchable: checked })}
          />
          <ToggleRow
            label="Data sharing"
            description="Share anonymized data to improve the product"
            checked={settings.privacy.dataSharing}
            onChange={(checked) => updatePrivacy({ dataSharing: checked })}
          />
          <ToggleRow
            label="Telemetry"
            description="Send diagnostics to help improve performance"
            checked={settings.privacy.telemetry}
            onChange={(checked) => updatePrivacy({ telemetry: checked })}
          />
        </div>
      </section>

      {/* Security */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Security</h2>
          <span className="text-xs text-gray-500">Account protection</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleRow
            label="Two-factor authentication"
            description="Add an extra layer of security"
            checked={settings.security.twoFactorEnabled}
            onChange={(checked) => updateSecurity({ twoFactorEnabled: checked })}
          />
          <ToggleRow
            label="Login alerts"
            description="Email alerts for new device sign-ins"
            checked={settings.security.loginAlerts}
            onChange={(checked) => updateSecurity({ loginAlerts: checked })}
          />
          <ToggleRow
            label="Trusted devices"
            description="Skip 2FA on devices you trust"
            checked={settings.security.trustedDevices}
            onChange={(checked) => updateSecurity({ trustedDevices: checked })}
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Session timeout</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={480}
                value={settings.security.sessionTimeoutMinutes}
                onChange={(e) => updateSecurity({ sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                aria-label="Session timeout in minutes"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Between 5 and 480 minutes</div>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Backup email</label>
            <input
              type="email"
              value={settings.security.backupEmail || ''}
              onChange={(e) => updateSecurity({ backupEmail: e.target.value })}
              placeholder="user@company.com"
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              aria-label="Backup email"
            />
            <p className="text-xs text-gray-500 mt-1">Used for account recovery and alerts.</p>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</h2>
          <span className="text-xs text-gray-500">Localization and layout</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectRow
            label="Language"
            value={settings.preferences.language}
            onChange={(value) => updatePreferences({ language: value })}
            options={[
              { value: 'en-US', label: 'English (US)' },
              { value: 'en-GB', label: 'English (UK)' },
              { value: 'es-ES', label: 'Español' },
              { value: 'fr-FR', label: 'Français' },
              { value: 'de-DE', label: 'Deutsch' }
            ]}
            description="Choose your display language"
          />
          <SelectRow
            label="Timezone"
            value={settings.preferences.timezone}
            onChange={(value) => updatePreferences({ timezone: value })}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
              { value: 'America/New_York', label: 'Eastern Time (ET)' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Berlin', label: 'Berlin' }
            ]}
            description="Used for schedules and reports"
          />
          <SelectRow
            label="Date format"
            value={settings.preferences.dateFormat}
            onChange={(value) => updatePreferences({ dateFormat: value as DateFormatOption })}
            options={dateFormatOptions}
          />
          <SelectRow
            label="Week starts on"
            value={settings.preferences.weekStart}
            onChange={(value) => updatePreferences({ weekStart: value as WeekStartOption })}
            options={weekStartOptions}
          />
        </div>
      </section>

      {/* Data management */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Management</h2>
          <span className="text-xs text-gray-500">Import / export your settings</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Import settings</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON here"
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              aria-label="Import settings JSON"
            />
            <button
              onClick={handleImport}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import
            </button>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Export preview</div>
            <pre className="w-full h-32 overflow-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200">
              {exportSettings()}
            </pre>
            <p className="text-xs text-gray-500 mt-1">Use the Export button to download a JSON file.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
