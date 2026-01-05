# Settings & Configuration System

**Last Updated:** January 5, 2026

## Overview

The settings system provides centralized management of user preferences, privacy controls, security options, and UI customization. Settings are persisted to localStorage and can be imported/exported as JSON.

## Architecture

### Core Files

- **[frontend/config/settings.ts](../frontend/config/settings.ts)** - Schema, types, defaults, validation
- **[frontend/hooks/useSettings.ts](../frontend/hooks/useSettings.ts)** - React hook for state management and persistence
- **[frontend/components/settings/SettingsDashboard.tsx](../frontend/components/settings/SettingsDashboard.tsx)** - Full-featured settings UI

## Settings Schema

```typescript
interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: PreferenceSettings;
}
```

### Notification Settings
- Email, push, SMS alerts
- Marketing updates, product updates
- Weekly summary digest

### Privacy Settings
- Profile visibility: `public`, `team`, `private`
- Searchable profile toggle
- Data sharing and telemetry opt-in/out

### Security Settings
- Two-factor authentication toggle
- Login alerts for new devices
- Trusted devices management
- Session timeout (5-480 minutes)
- Backup email for recovery

### Preference Settings
- Language: `en-US`, `en-GB`, `es-ES`, `fr-FR`, `de-DE`
- Timezone: `UTC`, `America/Los_Angeles`, `America/New_York`, `Europe/London`, `Europe/Berlin`
- Date format: `mdy` (MM/DD/YYYY), `dmy` (DD/MM/YYYY), `iso` (YYYY-MM-DD)
- Week start: `monday`, `sunday`
- Density: `comfortable`, `compact`

## Hook Usage

```typescript
import { useSettings } from '@/hooks/useSettings';

function MyComponent() {
  const {
    settings,           // Current settings state
    isDirty,            // Has unsaved changes
    lastSaved,          // Last save timestamp
    error,              // Error message if any
    setTheme,           // Update theme
    updateNotifications, // Update notification prefs
    updatePrivacy,      // Update privacy settings
    updateSecurity,     // Update security settings
    updatePreferences,  // Update preferences
    resetSettings,      // Reset to defaults
    exportSettings,     // Export as JSON string
    importSettings,     // Import from JSON string
    save               // Persist to localStorage
  } = useSettings();

  // Example: Toggle email alerts
  const handleToggle = () => {
    updateNotifications({ email: !settings.notifications.email });
  };

  // Example: Save changes
  const handleSave = () => {
    save();
  };

  return (
    <div>
      <p>Theme: {settings.theme}</p>
      <button onClick={handleSave} disabled={!isDirty}>
        Save Changes
      </button>
    </div>
  );
}
```

## Persistence

Settings are stored in localStorage under the key `vfide:settings` with the following structure:

```json
{
  "version": 1,
  "savedAt": "2026-01-05T12:34:56.789Z",
  "state": {
    "theme": "system",
    "notifications": { ... },
    "privacy": { ... },
    "security": { ... },
    "preferences": { ... }
  }
}
```

### Validation

The `safeParseSettings` function validates:
- Theme is one of `light`, `dark`, `system`
- Density is `comfortable` or `compact`
- Date format is `mdy`, `dmy`, or `iso`
- Week start is `sunday` or `monday`
- Profile visibility is `public`, `team`, or `private`
- Session timeout is numeric, between 1 and 480 minutes

Invalid payloads are rejected and defaults are used.

## Import/Export

### Export
```typescript
const { exportSettings } = useSettings();
const json = exportSettings(); // Returns formatted JSON string
// Download as file or copy to clipboard
```

### Import
```typescript
const { importSettings } = useSettings();
const success = importSettings(jsonString);
if (!success) {
  console.error('Invalid settings file');
}
```

Import validates the payload structure and rejects malformed or incompatible data.

## Dashboard UI

The `SettingsDashboard` component provides a complete settings interface with:

### Features
- **Appearance**: Theme selection (light/dark/system), density toggle
- **Notifications**: Toggle all notification channels and cadence
- **Privacy**: Profile visibility, searchable toggle, data sharing, telemetry
- **Security**: 2FA toggle, login alerts, trusted devices, session timeout, backup email
- **Preferences**: Language, timezone, date format, week start
- **Data Management**: Import/export JSON, preview current settings

### Props
```typescript
interface SettingsDashboardProps {
  onSave?: (settings: SettingsState) => void;
  onExport?: (settings: SettingsState) => void;
  onImport?: (settings: SettingsState) => void;
  className?: string;
}
```

### Status Indicators
- **Dirty state**: Save button enabled when changes exist
- **Saving**: Brief "Saving..." state during persist
- **Saved**: Green success banner after save
- **Error**: Red alert banner for import failures or validation errors
- **Last saved**: Timestamp shown below header

### Accessibility
- All toggles have `aria-label` attributes
- All selects are labeled
- Status messages use `role="status"` or `role="alert"`
- Keyboard navigable

## Defaults

```typescript
theme: 'system'
notifications: {
  email: true,
  push: true,
  sms: false,
  marketing: false,
  productUpdates: true,
  weeklySummary: true
}
privacy: {
  profileVisibility: 'team',
  dataSharing: false,
  searchable: true,
  telemetry: true
}
security: {
  twoFactorEnabled: false,
  loginAlerts: true,
  trustedDevices: true,
  sessionTimeoutMinutes: 30,
  backupEmail: ''
}
preferences: {
  language: 'en-US',
  timezone: 'UTC',
  dateFormat: 'iso',
  weekStart: 'monday',
  density: 'comfortable'
}
```

## Testing

Comprehensive test suite in [frontend/__tests__/settings/SettingsDashboard.test.tsx](../frontend/__tests__/settings/SettingsDashboard.test.tsx):

- **76 tests** covering all interactions
- Rendering, state changes, callbacks
- LocalStorage persistence and recovery
- Import/export validation
- Accessibility compliance
- Edge cases (invalid inputs, rerenders, multi-field changes)

Run tests:
```bash
cd frontend && npm test -- SettingsDashboard.test.tsx
```

## Future Enhancements

- **Auto-save**: Debounced persistence on change
- **Sync**: Multi-device sync via backend API
- **Themes**: Expanded theme system with custom colors
- **Advanced Privacy**: Granular data collection controls
- **Security**: Hardware key support, session management UI
- **Preferences**: More locales, time formats, number formats
- **Profiles**: Multiple setting profiles (work, personal, etc.)
