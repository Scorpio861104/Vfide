import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  defaultSettings,
  safeParseSettings,
  SETTINGS_VERSION,
  SettingsState,
  NotificationSettings,
  PrivacySettings,
  SecuritySettings,
  PreferenceSettings,
  ThemeOption
} from '@/config/settings';
import { safeGetItem, safeSetJSON } from '@/lib/storage';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'vfide:settings';

export interface UseSettingsResult {
  settings: SettingsState;
  isDirty: boolean;
  lastSaved: Date | null;
  error: string | null;
  setTheme: (theme: ThemeOption) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updatePrivacy: (updates: Partial<PrivacySettings>) => void;
  updateSecurity: (updates: Partial<SecuritySettings>) => void;
  updatePreferences: (updates: Partial<PreferenceSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  save: () => void;
}

const loadFromStorage = (): SettingsState => {
  if (typeof window === 'undefined') return defaultSettings;

  try {
    const raw = safeGetItem(STORAGE_KEY, '');
    if (!raw) return defaultSettings;

    const parsed = safeParseSettings(raw);
    if (parsed) return parsed;

    // legacy stored shape with version
    const legacy = JSON.parse(raw) as { state?: SettingsState };
    if (legacy.state && safeParseSettings(JSON.stringify(legacy.state))) {
      return legacy.state;
    }

    return defaultSettings;
  } catch (error) {
    logger.warn('Failed to load settings, using defaults', error);
    return defaultSettings;
  }
};

export const useSettings = (): UseSettingsResult => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // initial load
  useEffect(() => {
    const loaded = loadFromStorage();
    setSettings(loaded);
    setIsDirty(false);
    setError(null);
  }, []);

  const persist = useCallback(
    (next: SettingsState) => {
      if (typeof window === 'undefined') return;
      const payload = {
        version: SETTINGS_VERSION,
        savedAt: new Date().toISOString(),
        state: next
      };
      if (safeSetJSON(STORAGE_KEY, payload)) {
        setLastSaved(new Date());
      }
    },
    []
  );

  const setTheme = useCallback((theme: ThemeOption) => {
    setSettings((prev) => ({ ...prev, theme }));
    setIsDirty(true);
  }, []);

  const updateNotifications = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates }
    }));
    setIsDirty(true);
  }, []);

  const updatePrivacy = useCallback((updates: Partial<PrivacySettings>) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, ...updates }
    }));
    setIsDirty(true);
  }, []);

  const updateSecurity = useCallback((updates: Partial<SecuritySettings>) => {
    setSettings((prev) => ({
      ...prev,
      security: { ...prev.security, ...updates }
    }));
    setIsDirty(true);
  }, []);

  const updatePreferences = useCallback((updates: Partial<PreferenceSettings>) => {
    setSettings((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates }
    }));
    setIsDirty(true);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setIsDirty(true);
  }, []);

  const exportSettings = useCallback((): string => {
    return JSON.stringify(
      {
        version: SETTINGS_VERSION,
        state: settings,
        savedAt: new Date().toISOString()
      },
      null,
      2
    );
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    const parsed = safeParseSettings(json);
    if (!parsed) {
      setError('Invalid settings file');
      return false;
    }
    setSettings(parsed);
    setIsDirty(true);
    setError(null);
    return true;
  }, []);

  const save = useCallback(() => {
    persist(settings);
    setIsDirty(false);
  }, [persist, settings]);

  // auto-persist when dirty changes, debounce? For simplicity immediate on save button only.

  const memoized: UseSettingsResult = useMemo(
    () => ({
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
    }),
    [settings, isDirty, lastSaved, error, setTheme, updateNotifications, updatePrivacy, updateSecurity, updatePreferences, resetSettings, exportSettings, importSettings, save]
  );

  return memoized;
};
