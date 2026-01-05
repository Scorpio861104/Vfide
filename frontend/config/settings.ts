// Settings schema and defaults for the Vfide frontend

export type ThemeOption = 'light' | 'dark' | 'system';
export type DensityOption = 'comfortable' | 'compact';
export type DateFormatOption = 'mdy' | 'dmy' | 'iso';
export type WeekStartOption = 'sunday' | 'monday';
export type ProfileVisibility = 'public' | 'team' | 'private';

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  productUpdates: boolean;
  weeklySummary: boolean;
}

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  dataSharing: boolean;
  searchable: boolean;
  telemetry: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginAlerts: boolean;
  trustedDevices: boolean;
  sessionTimeoutMinutes: number;
  backupEmail?: string;
}

export interface PreferenceSettings {
  language: string;
  timezone: string;
  dateFormat: DateFormatOption;
  weekStart: WeekStartOption;
  density: DensityOption;
}

export interface SettingsState {
  theme: ThemeOption;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: PreferenceSettings;
}

export const defaultSettings: SettingsState = {
  theme: 'system',
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    productUpdates: true,
    weeklySummary: true
  },
  privacy: {
    profileVisibility: 'team',
    dataSharing: false,
    searchable: true,
    telemetry: true
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
    trustedDevices: true,
    sessionTimeoutMinutes: 30,
    backupEmail: ''
  },
  preferences: {
    language: 'en-US',
    timezone: 'UTC',
    dateFormat: 'iso',
    weekStart: 'monday',
    density: 'comfortable'
  }
};

export const SETTINGS_VERSION = 1;

export interface StoredSettings {
  version: number;
  state: SettingsState;
  savedAt: string;
}

export const validateSettings = (value: SettingsState): boolean => {
  if (!value) return false;
  const themes: ThemeOption[] = ['light', 'dark', 'system'];
  const densities: DensityOption[] = ['comfortable', 'compact'];
  const dateFormats: DateFormatOption[] = ['mdy', 'dmy', 'iso'];
  const weekStarts: WeekStartOption[] = ['sunday', 'monday'];
  const visibilities: ProfileVisibility[] = ['public', 'team', 'private'];

  return (
    themes.includes(value.theme) &&
    densities.includes(value.preferences.density) &&
    dateFormats.includes(value.preferences.dateFormat) &&
    weekStarts.includes(value.preferences.weekStart) &&
    visibilities.includes(value.privacy.profileVisibility) &&
    typeof value.security.sessionTimeoutMinutes === 'number' &&
    value.security.sessionTimeoutMinutes > 0 &&
    value.security.sessionTimeoutMinutes <= 480
  );
};

export const safeParseSettings = (json: string): SettingsState | null => {
  try {
    const parsed = JSON.parse(json) as StoredSettings | SettingsState;
    const state = (parsed as StoredSettings).state || parsed;
    if (validateSettings(state as SettingsState)) {
      return state as SettingsState;
    }
    return null;
  } catch (error) {
    return null;
  }
};
