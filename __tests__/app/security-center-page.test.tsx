import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const mockDetectAnomalies = jest.fn();

let mockTwoFactorState: {
  isEnabled: boolean;
  method: string;
};

let mockBiometricState: {
  isEnabled: boolean;
  credentials: Array<{ id: string }>;
};

let mockLogsState: {
  logs: Array<{ id: string; message: string; timestamp: Date }>;
};

let mockThreatState: {
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  activeThreats: Array<{ id: string }>;
  detectAnomalies: () => void;
};

const renderSecurityCenterPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/security-center/page');
  const SecurityCenterPage = pageModule.default as React.ComponentType;
  return render(<SecurityCenterPage />);
};

jest.mock('@/components/security/BiometricSetup', () => ({
  BiometricSetup: () => <div data-testid="biometric-setup">BiometricSetup</div>,
}));

jest.mock('@/components/security/SecurityLogsDashboard', () => ({
  SecurityLogsDashboard: () => <div data-testid="security-logs-dashboard">SecurityLogsDashboard</div>,
}));

jest.mock('@/components/security/ThreatDetectionPanel', () => ({
  ThreatDetectionPanel: () => <div data-testid="threat-detection-panel">ThreatDetectionPanel</div>,
}));

jest.mock('@/hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => mockBiometricState,
}));

jest.mock('@/hooks/useSecurityLogs', () => ({
  useSecurityLogs: () => mockLogsState,
}));

jest.mock('@/hooks/useThreatDetection', () => ({
  useThreatDetection: () => mockThreatState,
}));

describe('Security center page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockTwoFactorState = {
      isEnabled: false,
      method: 'totp',
    };
    mockBiometricState = {
      isEnabled: false,
      credentials: [],
    };
    mockLogsState = {
      logs: [
        {
          id: '1',
          message: 'Successful login',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    };
    mockThreatState = {
      threatLevel: 'medium',
      riskScore: 45,
      activeThreats: [{ id: 'threat-1' }],
      detectAnomalies: mockDetectAnomalies,
    };
  });

  it('shows 2FA as unavailable and disables the quick action', () => {
    renderSecurityCenterPage();

    expect(screen.getByText(/Security Center/i)).toBeTruthy();
    expect(screen.getByText(/Temporarily unavailable in this release/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Configure 2FA/i })).toBeDisabled();
  });

  it('runs anomaly scan and switches to threat detection tab', () => {
    renderSecurityCenterPage();

    fireEvent.click(screen.getByRole('button', { name: /Run Security Scan/i }));

    expect(mockDetectAnomalies).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('threat-detection-panel')).toBeTruthy();
  });
});