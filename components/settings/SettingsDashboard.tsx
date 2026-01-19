import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Bell, 
  Shield, 
  Lock, 
  Settings, 
  Database,
  Sun,
  Moon,
  Monitor,
  Check,
  Download,
  Upload,
  Cloud,
  CloudOff,
  RefreshCw,
  Copy,
  Smartphone,
  Mail,
  MessageSquare,
  TrendingUp,
  Eye,
  EyeOff,
  Globe,
  Calendar,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import {
  SettingsState,
  ThemeOption,
  DateFormatOption,
  WeekStartOption,
  DensityOption,
  ProfileVisibility
} from '@/config/settings';
import { safeParseInt } from '@/lib/validation';

interface SettingsDashboardProps {
  onSave?: (settings: SettingsState) => void;
  onExport?: (settings: SettingsState) => void;
  onImport?: (settings: SettingsState) => void;
  className?: string;
}

// Animated toggle switch component
interface AnimatedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function AnimatedToggle({ checked, onChange, disabled }: AnimatedToggleProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked 
          ? 'bg-linear-to-r from-yellow-500 to-amber-500' 
          : 'bg-[#3A3A3F]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
        initial={false}
        animate={{ 
          left: checked ? 28 : 4,
          scale: checked ? 1.1 : 1 
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      {checked && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute left-1.5 top-1.5 text-white"
        >
          <Check className="w-3 h-3" />
        </motion.div>
      )}
    </motion.button>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleRow({ label, description, checked, onChange, icon }: ToggleRowProps) {
  return (
  <motion.div 
    className="flex items-start justify-between gap-3 p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A3F] transition-colors group"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="flex items-start gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
          {icon}
        </div>
      )}
      <div>
        <div className="text-sm font-medium text-gray-100">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </div>
    <AnimatedToggle checked={checked} onChange={onChange} />
  </motion.div>
  );
}

interface SelectRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  description?: string;
  icon?: React.ReactNode;
}

function SelectRow({ label, value, onChange, options, description, icon }: SelectRowProps) {
  return (
  <motion.div 
    className="p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A3F] transition-colors group"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="flex items-start gap-3 mb-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-100">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-[#3A3A3F] rounded-lg bg-[#2A2A2F] text-gray-100 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all outline-none cursor-pointer"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </motion.div>
  );
}

// Section wrapper with icon and animation
interface SectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ title, subtitle, icon, iconColor, children, delay = 0 }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-[#0F0F12] border border-[#2A2A2F] rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#2A2A2F] flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${iconColor} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </motion.section>
  );
}

// Sync status indicator
interface SyncStatusProps {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastSaved?: Date | null;
}

function SyncStatus({ status, lastSaved }: SyncStatusProps) {
  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'synced':
        return <Cloud className="w-4 h-4" />;
      case 'error':
        return <CloudOff className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'syncing':
        return 'text-yellow-500';
      case 'synced':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return lastSaved ? `Saved ${formatTimeAgo(lastSaved)}` : 'Synced';
      case 'error':
        return 'Sync failed';
      default:
        return lastSaved ? `Last saved ${formatTimeAgo(lastSaved)}` : 'Not saved';
    }
  };

  return (
    <motion.div 
      className={`flex items-center gap-2 text-sm ${getColor()}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={status}
    >
      {getIcon()}
      <span>{getMessage()}</span>
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

export function SettingsDashboard({
  onSave,
  onExport,
  onImport,
  className = ''
}: SettingsDashboardProps) {
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

  const { playSuccess, playError, playNotification } = useTransactionSounds();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [copiedExport, setCopiedExport] = useState(false);
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
    setSyncStatus('syncing');
    try {
      save();
      onSave?.(settings);
      playSuccess();
      // small delay to surface the saving state in the UI
      await new Promise((resolve) => setTimeout(resolve, 300));
      setStatus('saved');
      setSyncStatus('synced');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setSyncStatus('error');
      playError();
    }
  };

  const handleExport = () => {
    const payload = exportSettings();
    onExport?.(settings);
    playNotification();

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

  const handleCopyExport = useCallback(() => {
    const payload = exportSettings();
    navigator.clipboard.writeText(payload);
    setCopiedExport(true);
    playSuccess();
    setTimeout(() => setCopiedExport(false), 2000);
  }, [exportSettings, playSuccess]);

  const handleImport = () => {
    const ok = importSettings(importText);
    if (ok) {
      onImport?.(settings);
      setStatus('saved');
      playSuccess();
      setTimeout(() => setStatus('idle'), 1000);
    } else {
      setStatus('error');
      playError();
    }
  };

  const handleReset = () => {
    resetSettings();
    playNotification();
  };

  // Handle toggle changes with sound
  const handleToggleChange = useCallback((updateFn: () => void) => {
    updateFn();
    playNotification();
  }, [playNotification]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#1A1A1F] via-[#0F0F12] to-[#1A1A1F] border border-[#2A2A2F] p-6"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-linear-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Settings className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Settings & Configuration</h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage your preferences, privacy, and security across the platform.
              </p>
              <div className="mt-2">
                <SyncStatus status={syncStatus} lastSaved={lastSaved} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.button
              onClick={handleSave}
              disabled={!isDirty || status === 'saving'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 bg-linear-to-r from-yellow-500 to-amber-500 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-yellow-500/20"
            >
              {status === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save changes
                </>
              )}
            </motion.button>
            <motion.button
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 bg-[#2A2A2F] text-gray-300 rounded-xl hover:bg-[#3A3A3F] transition-colors"
            >
              Reset to defaults
            </motion.button>
            <motion.button
              onClick={handleExport}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 bg-[#2A2A2F] text-gray-300 rounded-xl hover:bg-[#3A3A3F] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {status === 'saved' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="p-4 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-3"
            role="status"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Settings saved successfully</div>
              <div className="text-xs text-green-500/70">Your changes have been synced</div>
            </div>
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-3"
            role="alert"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <CloudOff className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Could not save settings</div>
              <div className="text-xs text-red-500/70">{error || 'Please try again'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appearance */}
      <Section
        title="Appearance"
        subtitle="Theme and display density"
        icon={<Palette className="w-5 h-5" />}
        iconColor="from-purple-500 to-violet-600"
        delay={0.1}
      >
        <div className="space-y-4">
          {/* Theme cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const isSelected = settings.theme === opt.value;
              const ThemeIcon = opt.value === 'light' ? Sun : opt.value === 'dark' ? Moon : Monitor;
              return (
                <motion.label
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-linear-to-br from-yellow-500/20 to-amber-500/10 border-2 border-yellow-500'
                      : 'bg-[#1A1A1F] border border-[#2A2A2F] hover:border-[#3A3A3F]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected 
                        ? 'bg-yellow-500 text-black' 
                        : 'bg-[#2A2A2F] text-gray-400'
                    }`}>
                      <ThemeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={`font-medium ${isSelected ? 'text-yellow-400' : 'text-gray-100'}`}>
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-500">{opt.hint}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="theme"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => {
                      setTheme(opt.value);
                      playNotification();
                    }}
                    className="sr-only"
                    aria-label={`Theme ${opt.label}`}
                  />
                  {isSelected && (
                    <motion.div
                      layoutId="theme-check"
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-black" />
                    </motion.div>
                  )}
                </motion.label>
              );
            })}
          </div>

          {/* Density */}
          <SelectRow
            label="Display Density"
            value={settings.preferences.density}
            onChange={(value) => {
              updatePreferences({ density: value as DensityOption });
              playNotification();
            }}
            options={densityOptions}
            description="Choose compact mode for data-dense screens"
            icon={<Zap className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        subtitle="Channels and delivery preferences"
        icon={<Bell className="w-5 h-5" />}
        iconColor="from-blue-500 to-cyan-600"
        delay={0.15}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Email alerts"
            description="Critical updates and security alerts"
            checked={settings.notifications.email}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ email: checked }))}
            icon={<Mail className="w-4 h-4" />}
          />
          <ToggleRow
            label="Push notifications"
            description="Real-time updates on the go"
            checked={settings.notifications.push}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ push: checked }))}
            icon={<Smartphone className="w-4 h-4" />}
          />
          <ToggleRow
            label="SMS alerts"
            description="Text messages for critical events"
            checked={settings.notifications.sms}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ sms: checked }))}
            icon={<MessageSquare className="w-4 h-4" />}
          />
          <ToggleRow
            label="Marketing updates"
            description="Product announcements and offers"
            checked={settings.notifications.marketing}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ marketing: checked }))}
            icon={<Sparkles className="w-4 h-4" />}
          />
          <ToggleRow
            label="Product updates"
            description="Release notes and changelogs"
            checked={settings.notifications.productUpdates}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ productUpdates: checked }))}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <ToggleRow
            label="Weekly summary"
            description="Digest every Monday"
            checked={settings.notifications.weeklySummary}
            onChange={(checked) => handleToggleChange(() => updateNotifications({ weeklySummary: checked }))}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* Privacy */}
      <Section
        title="Privacy"
        subtitle="Data visibility and telemetry"
        icon={<Eye className="w-5 h-5" />}
        iconColor="from-emerald-500 to-teal-600"
        delay={0.2}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SelectRow
            label="Profile visibility"
            value={settings.privacy.profileVisibility}
            onChange={(value) => {
              updatePrivacy({ profileVisibility: value as ProfileVisibility });
              playNotification();
            }}
            options={visibilityOptions}
            description="Control who can see your profile"
            icon={settings.privacy.profileVisibility === 'public' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          />
          <ToggleRow
            label="Searchable profile"
            description="Allow teammates to find you"
            checked={settings.privacy.searchable}
            onChange={(checked) => handleToggleChange(() => updatePrivacy({ searchable: checked }))}
            icon={<Globe className="w-4 h-4" />}
          />
          <ToggleRow
            label="Data sharing"
            description="Share anonymized data to improve the product"
            checked={settings.privacy.dataSharing}
            onChange={(checked) => handleToggleChange(() => updatePrivacy({ dataSharing: checked }))}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <ToggleRow
            label="Telemetry"
            description="Send diagnostics to help improve performance"
            checked={settings.privacy.telemetry}
            onChange={(checked) => handleToggleChange(() => updatePrivacy({ telemetry: checked }))}
            icon={<Zap className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* Security */}
      <Section
        title="Security"
        subtitle="Account protection"
        icon={<Shield className="w-5 h-5" />}
        iconColor="from-red-500 to-rose-600"
        delay={0.25}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Two-factor authentication"
            description="Add an extra layer of security"
            checked={settings.security.twoFactorEnabled}
            onChange={(checked) => handleToggleChange(() => updateSecurity({ twoFactorEnabled: checked }))}
            icon={<Lock className="w-4 h-4" />}
          />
          <ToggleRow
            label="Login alerts"
            description="Email alerts for new device sign-ins"
            checked={settings.security.loginAlerts}
            onChange={(checked) => handleToggleChange(() => updateSecurity({ loginAlerts: checked }))}
            icon={<Bell className="w-4 h-4" />}
          />
          <ToggleRow
            label="Trusted devices"
            description="Skip 2FA on devices you trust"
            checked={settings.security.trustedDevices}
            onChange={(checked) => handleToggleChange(() => updateSecurity({ trustedDevices: checked }))}
            icon={<Smartphone className="w-4 h-4" />}
          />
          
          {/* Session timeout */}
          <motion.div 
            className="p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A3F] transition-colors group"
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-100">Session timeout</div>
                <div className="text-xs text-gray-500">Between 5 and 480 minutes</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={480}
                value={settings.security.sessionTimeoutMinutes}
                onChange={(e) => updateSecurity({ sessionTimeoutMinutes: safeParseInt(e.target.value, 30, { min: 5, max: 480 }) })}
                className="w-24 px-3 py-2 border border-[#3A3A3F] rounded-lg bg-[#2A2A2F] text-gray-100 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all outline-none"
                aria-label="Session timeout in minutes"
              />
              <span className="text-sm text-gray-400">minutes</span>
            </div>
          </motion.div>

          {/* Backup email */}
          <motion.div 
            className="md:col-span-2 p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A3F] transition-colors group"
            whileHover={{ scale: 1.005 }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-100">Backup email</div>
                <div className="text-xs text-gray-500">Used for account recovery and alerts</div>
              </div>
            </div>
            <input
              type="email"
              value={settings.security.backupEmail || ''}
              onChange={(e) => updateSecurity({ backupEmail: e.target.value })}
              placeholder="user@company.com"
              className="w-full px-3 py-2 border border-[#3A3A3F] rounded-lg bg-[#2A2A2F] text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all outline-none"
              aria-label="Backup email"
            />
          </motion.div>
        </div>
      </Section>

      {/* Preferences */}
      <Section
        title="Preferences"
        subtitle="Localization and regional settings"
        icon={<Globe className="w-5 h-5" />}
        iconColor="from-orange-500 to-amber-600"
        delay={0.3}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SelectRow
            label="Language"
            value={settings.preferences.language}
            onChange={(value) => {
              updatePreferences({ language: value });
              playNotification();
            }}
            options={[
              { value: 'en-US', label: 'English (US)' },
              { value: 'en-GB', label: 'English (UK)' },
              { value: 'es-ES', label: 'Español' },
              { value: 'fr-FR', label: 'Français' },
              { value: 'de-DE', label: 'Deutsch' }
            ]}
            description="Choose your display language"
            icon={<Globe className="w-4 h-4" />}
          />
          <SelectRow
            label="Timezone"
            value={settings.preferences.timezone}
            onChange={(value) => {
              updatePreferences({ timezone: value });
              playNotification();
            }}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
              { value: 'America/New_York', label: 'Eastern Time (ET)' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Berlin', label: 'Berlin' }
            ]}
            description="Used for schedules and reports"
            icon={<Clock className="w-4 h-4" />}
          />
          <SelectRow
            label="Date format"
            value={settings.preferences.dateFormat}
            onChange={(value) => {
              updatePreferences({ dateFormat: value as DateFormatOption });
              playNotification();
            }}
            options={dateFormatOptions}
            icon={<Calendar className="w-4 h-4" />}
          />
          <SelectRow
            label="Week starts on"
            value={settings.preferences.weekStart}
            onChange={(value) => {
              updatePreferences({ weekStart: value as WeekStartOption });
              playNotification();
            }}
            options={weekStartOptions}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </Section>

      {/* Data management */}
      <Section
        title="Data Management"
        subtitle="Import and export your settings"
        icon={<Database className="w-5 h-5" />}
        iconColor="from-indigo-500 to-purple-600"
        delay={0.35}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Import */}
          <motion.div 
            className="p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl"
            whileHover={{ scale: 1.005 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-sm font-medium text-gray-100">Import settings</div>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full h-32 px-3 py-2 border border-[#3A3A3F] rounded-lg bg-[#2A2A2F] text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all outline-none resize-none font-mono text-xs"
              aria-label="Import settings JSON"
            />
            <motion.button
              onClick={handleImport}
              disabled={!importText.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full px-4 py-2.5 bg-linear-to-r from-yellow-500 to-amber-500 text-black font-semibold rounded-xl hover:from-yellow-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
            >
              <Upload className="w-4 h-4" />
              Import Settings
            </motion.button>
          </motion.div>

          {/* Export */}
          <motion.div 
            className="p-4 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl"
            whileHover={{ scale: 1.005 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2A2A2F] flex items-center justify-center text-gray-400">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium text-gray-100">Export preview</div>
              </div>
              <motion.button
                onClick={handleCopyExport}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg bg-[#2A2A2F] hover:bg-[#3A3A3F] transition-colors"
                title="Copy to clipboard"
              >
                <AnimatePresence mode="wait">
                  {copiedExport ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="w-4 h-4 text-green-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <pre className="w-full h-32 overflow-auto px-3 py-2 border border-[#3A3A3F] rounded-lg bg-[#2A2A2F] text-xs text-gray-300 font-mono">
              {exportSettings()}
            </pre>
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
              <Download className="w-3 h-3" />
              Use the Export button in the header to download
            </p>
          </motion.div>
        </div>
      </Section>
    </div>
  );
};
