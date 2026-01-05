# Settings & Configuration Guide

## Overview
- The settings system centralizes user preferences (appearance, notifications, privacy, security, preferences) and persists them to `localStorage`.
- Storage key: `vfide:settings`; versioned payload with `version`, `state`, and `savedAt` ISO timestamp.
- Validation: payloads must satisfy the typed schema; unsafe or malformed JSON is ignored and defaults are used.

## Schema (defaults)
- Appearance: `theme` (`system`), `preferences.density` (`comfortable`).
- Notifications: email (true), push (true), sms (false), marketing (false), productUpdates (true), weeklySummary (true).
- Privacy: profileVisibility (`team`), dataSharing (false), searchable (true), telemetry (true).
- Security: twoFactorEnabled (false), loginAlerts (true), trustedDevices (true), sessionTimeoutMinutes (30, bounded 5–480), backupEmail (empty).
- Preferences: language (`en-US`), timezone (`UTC`), dateFormat (`iso`), weekStart (`monday`).

## Hook usage (`useSettings`)
```tsx
import { useSettings } from '@/hooks/useSettings';

const Example = () => {
  const {
    settings,
    isDirty,
    error,
    lastSaved,
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

  // mutate
  setTheme('dark');
  updateNotifications({ email: false });

  // persist
  save();

  // import/export
  const exportedJson = exportSettings();
  const ok = importSettings(exportedJson);

  return null;
};
```
- `save()` writes the versioned payload and updates `lastSaved`; `isDirty` resets to false after save.
- `importSettings(json)` returns `true` on success, sets dirty state, and clears errors; on failure sets `error` to `Invalid settings file`.
- `resetSettings()` restores defaults and marks the state dirty until saved.

## Dashboard behaviors
- Save button is disabled when not dirty; shows `Saving...` briefly, then `Settings saved` status.
- Reset restores defaults for all sections (including backup email) without auto-saving.
- Export downloads a JSON file and also mirrors the current state in the preview.
- Import uses the textarea content; invalid JSON shows an alert. Successful import clears the error and marks state dirty.
- Last saved timestamp is displayed; defaults to `Not saved yet` until first persisted save.

## Import/Export format
```json
{
  "version": 1,
  "state": {
    "theme": "system",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false,
      "marketing": false,
      "productUpdates": true,
      "weeklySummary": true
    },
    "privacy": {
      "profileVisibility": "team",
      "dataSharing": false,
      "searchable": true,
      "telemetry": true
    },
    "security": {
      "twoFactorEnabled": false,
      "loginAlerts": true,
      "trustedDevices": true,
      "sessionTimeoutMinutes": 30,
      "backupEmail": ""
    },
    "preferences": {
      "language": "en-US",
      "timezone": "UTC",
      "dateFormat": "iso",
      "weekStart": "monday",
      "density": "comfortable"
    }
  },
  "savedAt": "2026-01-04T16:49:12.000Z"
}
```
- Validation requires allowed enum values and `sessionTimeoutMinutes` within 5–480.

## Testing
- Targeted: `npm test -- SettingsDashboard.test.tsx` (covers UI, persistence, import/export, accessibility).
- Full suite: `npm test` from `frontend/`.

## Error handling
- Invalid stored payloads are ignored and replaced with defaults.
- Import failures set a user-visible alert and preserve existing settings.
- All JSON parsing is guarded; unexpected errors fall back to defaults without throwing.
