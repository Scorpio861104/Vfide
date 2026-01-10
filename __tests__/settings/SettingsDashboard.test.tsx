import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsDashboard } from '@/components/settings/SettingsDashboard';
import { defaultSettings } from '@/config/settings';

// Helpers
const click = (el: HTMLElement) => fireEvent.click(el);

// Mock URL for export
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
  URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('SettingsDashboard', () => {
  describe('Rendering', () => {
    it('renders header and sections', () => {
      render(<SettingsDashboard />);

      expect(screen.getByText('Settings & Configuration')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
      expect(screen.getByText('Data Management')).toBeInTheDocument();
    });

    it('shows default theme selection', () => {
      render(<SettingsDashboard />);
      const systemOption = screen.getByLabelText('Theme System');
      expect(systemOption).toBeChecked();
    });

    it('shows export preview', () => {
      render(<SettingsDashboard />);
      expect(screen.getByText('Export preview')).toBeInTheDocument();
      expect(screen.getByText(/"version"/)).toBeInTheDocument();
    });
  });

  describe('Appearance', () => {
    it('allows changing theme', () => {
      render(<SettingsDashboard />);
      const dark = screen.getByLabelText('Theme Dark');
      click(dark);
      expect(dark).toBeChecked();
    });

    it('allows changing density', () => {
      render(<SettingsDashboard />);
      const density = screen.getByLabelText('Density');
      fireEvent.change(density, { target: { value: 'compact' } });
      expect(density).toHaveValue('compact');
    });

    it('starts with system theme by default', () => {
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Theme System')).toBeChecked();
    });

    it('marks theme cards with active styling', () => {
      render(<SettingsDashboard />);
      const dark = screen.getByLabelText('Theme Dark');
      click(dark);
      expect(dark.closest('label')).toHaveClass('border-blue-600');
    });
  });

  describe('Notifications', () => {
    it('toggles email alerts', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      expect(toggle).toBeChecked();
      click(toggle);
      expect(toggle).not.toBeChecked();
    });

    it('toggles SMS alerts', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('SMS alerts');
      expect(toggle).not.toBeChecked();
      click(toggle);
      expect(toggle).toBeChecked();
    });

    it('supports marketing preference', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Marketing updates');
      expect(toggle).not.toBeChecked();
      click(toggle);
      expect(toggle).toBeChecked();
    });

    it('weekly summary enabled by default', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Weekly summary');
      expect(toggle).toBeChecked();
    });

    it('product updates enabled by default', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Product updates');
      expect(toggle).toBeChecked();
    });

    it('dirty state flips when toggling push', () => {
      render(<SettingsDashboard />);
      const push = screen.getByLabelText('Push notifications');
      const saveButton = screen.getByText('Save changes');
      expect(saveButton).toBeDisabled();
      click(push);
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Privacy', () => {
    it('changes profile visibility', () => {
      render(<SettingsDashboard />);
      const select = screen.getByLabelText('Profile visibility');
      fireEvent.change(select, { target: { value: 'private' } });
      expect(select).toHaveValue('private');
    });

    it('toggles searchable profile', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Searchable profile');
      click(toggle);
      expect(toggle).not.toBeChecked();
    });

    it('toggles data sharing', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Data sharing');
      expect(toggle).not.toBeChecked();
      click(toggle);
      expect(toggle).toBeChecked();
    });

    it('defaults to team visibility', () => {
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Profile visibility')).toHaveValue('team');
    });

    it('toggles telemetry', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Telemetry');
      expect(toggle).toBeChecked();
      click(toggle);
      expect(toggle).not.toBeChecked();
    });
  });

  describe('Security', () => {
    it('enables two-factor authentication', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Two-factor authentication');
      expect(toggle).not.toBeChecked();
      click(toggle);
      expect(toggle).toBeChecked();
    });

    it('updates session timeout', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Session timeout in minutes');
      fireEvent.change(input, { target: { value: '60' } });
      expect(input).toHaveValue(60);
    });

    it('updates backup email', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Backup email');
      fireEvent.change(input, { target: { value: 'user@example.com' } });
      expect(input).toHaveValue('user@example.com');
    });

    it('enforces numeric input for session timeout', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Session timeout in minutes') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '15' } });
      expect(input.value).toBe('15');
    });

    it('allows disabling login alerts', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Login alerts');
      expect(toggle).toBeChecked();
      click(toggle);
      expect(toggle).not.toBeChecked();
    });

    it('allows disabling trusted devices', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Trusted devices');
      expect(toggle).toBeChecked();
      click(toggle);
      expect(toggle).not.toBeChecked();
    });
  });

  describe('Preferences', () => {
    it('changes language', () => {
      render(<SettingsDashboard />);
      const select = screen.getByLabelText('Language');
      fireEvent.change(select, { target: { value: 'es-ES' } });
      expect(select).toHaveValue('es-ES');
    });

    it('changes timezone', () => {
      render(<SettingsDashboard />);
      const select = screen.getByLabelText('Timezone');
      fireEvent.change(select, { target: { value: 'America/New_York' } });
      expect(select).toHaveValue('America/New_York');
    });

    it('changes date format', () => {
      render(<SettingsDashboard />);
      const select = screen.getByLabelText('Date format');
      fireEvent.change(select, { target: { value: 'mdy' } });
      expect(select).toHaveValue('mdy');
    });

    it('changes week start', () => {
      render(<SettingsDashboard />);
      const select = screen.getByLabelText('Week starts on');
      fireEvent.change(select, { target: { value: 'sunday' } });
      expect(select).toHaveValue('sunday');
    });

    it('defaults to ISO date format', () => {
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Date format')).toHaveValue('iso');
    });

    it('defaults to Monday week start', () => {
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Week starts on')).toHaveValue('monday');
    });
  });

  describe('Data Management', () => {
    it('exports settings via blob', () => {
      render(<SettingsDashboard />);
      const exportButton = screen.getByText('Export');
      click(exportButton);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('imports valid settings', async () => {
      render(<SettingsDashboard />);
      const textarea = screen.getByLabelText('Import settings JSON');
      const importBtn = screen.getByText('Import');

      const payload = {
        version: 1,
        state: { ...defaultSettings, theme: 'dark' },
        savedAt: new Date().toISOString()
      };

      fireEvent.change(textarea, { target: { value: JSON.stringify(payload) } });
      click(importBtn);

      await waitFor(() => {
        expect(screen.getByLabelText('Theme Dark')).toBeChecked();
      });
    });

    it('shows error on invalid import', async () => {
      render(<SettingsDashboard />);
      const textarea = screen.getByLabelText('Import settings JSON');
      const importBtn = screen.getByText('Import');

      fireEvent.change(textarea, { target: { value: '{ invalid json' } });
      click(importBtn);

      await waitFor(() => {
        expect(screen.getByText(/Invalid settings file/)).toBeInTheDocument();
      });
    });

    it('renders import textarea placeholder', () => {
      render(<SettingsDashboard />);
      expect(screen.getByPlaceholderText('Paste JSON here')).toBeInTheDocument();
    });

    it('renders export helper text', () => {
      render(<SettingsDashboard />);
      expect(screen.getByText(/Use the Export button/)).toBeInTheDocument();
    });

    it('export payload contains version', () => {
      render(<SettingsDashboard />);
      expect(screen.getByText(/"version"/)).toBeInTheDocument();
    });
  });

  describe('Save & Reset', () => {
    it('disables save when not dirty', () => {
      render(<SettingsDashboard />);
      const saveButton = screen.getByText('Save changes') as HTMLButtonElement;
      expect(saveButton).toBeDisabled();
    });

    it('enables save after change', () => {
      render(<SettingsDashboard />);
      const saveButton = screen.getByText('Save changes') as HTMLButtonElement;
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      expect(saveButton).not.toBeDisabled();
    });

    it('shows saved status after save', async () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      click(screen.getByText('Save changes'));

      await waitFor(() => {
        expect(screen.getByText('Settings saved')).toBeInTheDocument();
      });
    });

    it('resets to defaults', () => {
      render(<SettingsDashboard />);
      const themeRadio = screen.getByLabelText('Theme Dark');
      click(themeRadio);
      expect(themeRadio).toBeChecked();
      click(screen.getByText('Reset to defaults'));
      const systemRadio = screen.getByLabelText('Theme System');
      expect(systemRadio).toBeChecked();
    });

    it('reset clears backup email', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Backup email');
      fireEvent.change(input, { target: { value: 'reset@test.com' } });
      click(screen.getByText('Reset to defaults'));
      expect(input).toHaveValue('');
    });

    it('save button shows Saving when saving', async () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      click(screen.getByText('Save changes'));
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('disables save after successful save', async () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      const saveButton = screen.getByText('Save changes');
      click(saveButton);
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Callbacks', () => {
    it('calls onSave when provided', () => {
      const onSave = jest.fn();
      render(<SettingsDashboard onSave={onSave} />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      click(screen.getByText('Save changes'));
      expect(onSave).toHaveBeenCalled();
    });

    it('calls onExport when provided', () => {
      const onExport = jest.fn();
      render(<SettingsDashboard onExport={onExport} />);
      click(screen.getByText('Export'));
      expect(onExport).toHaveBeenCalled();
    });

    it('calls onImport when provided', () => {
      const onImport = jest.fn();
      render(<SettingsDashboard onImport={onImport} />);
      const textarea = screen.getByLabelText('Import settings JSON');
      const importBtn = screen.getByText('Import');
      const payload = { version: 1, state: defaultSettings, savedAt: new Date().toISOString() };
      fireEvent.change(textarea, { target: { value: JSON.stringify(payload) } });
      click(importBtn);
      expect(onImport).toHaveBeenCalled();
    });

    it('passes current settings to onSave', () => {
      const onSave = jest.fn();
      render(<SettingsDashboard onSave={onSave} />);
      click(screen.getByLabelText('Push notifications'));
      click(screen.getByText('Save changes'));
      expect(onSave.mock.calls[0][0]).toBeDefined();
    });
  });

  describe('LocalStorage persistence', () => {
    it('stores settings on save', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      click(screen.getByText('Save changes'));
      const saved = localStorage.getItem('vfide:settings');
      expect(saved).toBeTruthy();
    });

    it('loads stored settings on mount', () => {
      const payload = {
        version: 1,
        state: { ...defaultSettings, notifications: { ...defaultSettings.notifications, email: false } },
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('vfide:settings', JSON.stringify(payload));

      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      expect(toggle).not.toBeChecked();
    });

    it('ignores invalid stored payload', () => {
      localStorage.setItem('vfide:settings', 'not-json');
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Email alerts')).toBeChecked();
    });

    it('persists theme change', () => {
      render(<SettingsDashboard />);
      click(screen.getByLabelText('Theme Dark'));
      click(screen.getByText('Save changes'));
      const payload = JSON.parse(localStorage.getItem('vfide:settings') || '{}');
      expect(payload.state.theme).toBe('dark');
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid session timeout gracefully', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Session timeout in minutes');
      fireEvent.change(input, { target: { value: '999' } });
      expect(input).toHaveValue(999);
    });

    it('maintains dirty state across multiple changes', () => {
      render(<SettingsDashboard />);
      const emailToggle = screen.getByLabelText('Email alerts');
      const smsToggle = screen.getByLabelText('SMS alerts');
      click(emailToggle);
      click(smsToggle);
      const saveButton = screen.getByText('Save changes');
      expect(saveButton).not.toBeDisabled();
    });

    it('shows last saved timestamp after save', async () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Email alerts');
      click(toggle);
      click(screen.getByText('Save changes'));
      await waitFor(() => {
        expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
      });
    });

    it('shows export preview content updates', () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('Marketing updates');
      click(toggle);
      expect(screen.getByText(/marketing/)).toBeInTheDocument();
    });

    it('keeps import textarea controlled', () => {
      render(<SettingsDashboard />);
      const textarea = screen.getByLabelText('Import settings JSON');
      fireEvent.change(textarea, { target: { value: 'sample' } });
      expect(textarea).toHaveValue('sample');
    });

    it('shows status banner only when saved', async () => {
      render(<SettingsDashboard />);
      const toggle = screen.getByLabelText('SMS alerts');
      click(toggle);
      click(screen.getByText('Save changes'));
      await waitFor(() => {
        expect(screen.getByText('Settings saved')).toBeInTheDocument();
      });
    });

    it('does not show error by default', () => {
      render(<SettingsDashboard />);
      expect(screen.queryByText(/Invalid settings/)).not.toBeInTheDocument();
    });

    it('allows multiple toggles without saving immediately', () => {
      render(<SettingsDashboard />);
      click(screen.getByLabelText('SMS alerts'));
      click(screen.getByLabelText('Marketing updates'));
      const saveButton = screen.getByText('Save changes');
      expect(saveButton).not.toBeDisabled();
    });

    it('shows last saved label even before save', () => {
      render(<SettingsDashboard />);
      expect(screen.getByText(/Last saved/)).toBeInTheDocument();
    });

    it('keeps session timeout numeric after multiple edits', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Session timeout in minutes');
      fireEvent.change(input, { target: { value: '10' } });
      fireEvent.change(input, { target: { value: '20' } });
      expect(input).toHaveValue(20);
    });

    it('retains checkbox state across renders', () => {
      const { rerender } = render(<SettingsDashboard />);
      const checkbox = screen.getByLabelText('Email alerts');
      click(checkbox);
      rerender(<SettingsDashboard />);
      expect(screen.getByLabelText('Email alerts')).not.toBeChecked();
    });

    it('updates export preview when language changes', () => {
      render(<SettingsDashboard />);
      fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'fr-FR' } });
      expect(screen.getByText(/fr-FR/)).toBeInTheDocument();
    });

    it('updates export preview when timezone changes', () => {
      render(<SettingsDashboard />);
      fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Europe/Berlin' } });
      expect(screen.getByText(/Europe\/Berlin/)).toBeInTheDocument();
    });

    it('import clears error on success', async () => {
      render(<SettingsDashboard />);
      const textarea = screen.getByLabelText('Import settings JSON');
      const importBtn = screen.getByText('Import');
      fireEvent.change(textarea, { target: { value: '{ bad json' } });
      click(importBtn);
      await waitFor(() => {
        expect(screen.getByText(/Invalid settings file/)).toBeInTheDocument();
      });
      const payload = { version: 1, state: defaultSettings, savedAt: new Date().toISOString() };
      fireEvent.change(textarea, { target: { value: JSON.stringify(payload) } });
      click(importBtn);
      await waitFor(() => {
        expect(screen.queryByText(/Invalid settings file/)).not.toBeInTheDocument();
      });
    });

    it('handles large session timeout input then correction', () => {
      render(<SettingsDashboard />);
      const input = screen.getByLabelText('Session timeout in minutes');
      fireEvent.change(input, { target: { value: '500' } });
      fireEvent.change(input, { target: { value: '120' } });
      expect(input).toHaveValue(120);
    });

    it('keeps toggle states independent', () => {
      render(<SettingsDashboard />);
      const email = screen.getByLabelText('Email alerts');
      const sms = screen.getByLabelText('SMS alerts');
      click(email);
      expect(email).not.toBeChecked();
      expect(sms).not.toBeChecked();
      click(sms);
      expect(sms).toBeChecked();
    });

    it('allows changing multiple select fields sequentially', () => {
      render(<SettingsDashboard />);
      fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'de-DE' } });
      fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'UTC' } });
      expect(screen.getByLabelText('Language')).toHaveValue('de-DE');
      expect(screen.getByLabelText('Timezone')).toHaveValue('UTC');
    });

    it('rendered export preview includes theme key', () => {
      render(<SettingsDashboard />);
      expect(screen.getByText(/"theme"/)).toBeInTheDocument();
    });

    it('does not crash when import text is empty', () => {
      render(<SettingsDashboard />);
      click(screen.getByText('Import'));
      expect(screen.getByText('Import settings')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('all toggles have aria-labels', () => {
      render(<SettingsDashboard />);
      const toggles = [
        'Email alerts',
        'Push notifications',
        'SMS alerts',
        'Marketing updates',
        'Product updates',
        'Weekly summary'
      ];
      toggles.forEach((label) => {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      });
    });

    it('all selects are reachable by label', () => {
      render(<SettingsDashboard />);
      const labels = ['Profile visibility', 'Density', 'Language', 'Timezone', 'Date format', 'Week starts on'];
      labels.forEach((label) => {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      });
    });

    it('import textarea is labeled', () => {
      render(<SettingsDashboard />);
      expect(screen.getByLabelText('Import settings JSON')).toHaveAttribute('aria-label', 'Import settings JSON');
    });

    it('buttons have readable text', () => {
      render(<SettingsDashboard />);
      const buttons = ['Save changes', 'Reset to defaults', 'Export', 'Import'];
      buttons.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it('status messages use role', async () => {
      render(<SettingsDashboard />);
      click(screen.getByLabelText('Email alerts'));
      click(screen.getByText('Save changes'));
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    it('alert role is used for errors', async () => {
      render(<SettingsDashboard />);
      fireEvent.change(screen.getByLabelText('Import settings JSON'), { target: { value: '{ bad' } });
      click(screen.getByText('Import'));
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
