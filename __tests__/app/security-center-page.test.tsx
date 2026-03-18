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

jest.mock('@/components/security/TwoFactorSetup', () => ({
  TwoFactorSetup: () => <div data-testid="two-factor-setup">TwoFactorSetup</div>,
}));

jest.mock('@/components/security/BiometricSetup', () => ({
  BiometricSetup: () => <div data-testid="biometric-setup">BiometricSetup</div>,
}));

jest.mock('@/components/security/SecurityLogsDashboard', () => ({
  SecurityLogsDashboard: () => <div data-testid="security-logs-dashboard">SecurityLogsDashboard</div>,
}));

jest.mock('@/components/security/ThreatDetectionPanel', () => ({
  ThreatDetectionPanel: () => <div data-testid="threat-detection-panel">ThreatDetectionPanel</div>,
}));

jest.mock('@/hooks/useTwoFactorAuth', () => ({
  useTwoFactorAuth: () => mockTwoFactorState,
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

  it('navigates from overview to 2FA setup via quick action', () => {
    renderSecurityCenterPage();

    expect(screen.getByText(/Security Center/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Configure 2FA/i }));

    expect(screen.getByTestId('two-factor-setup')).toBeTruthy();
  });

  it('runs anomaly scan and switches to threat detection tab', () => {
    renderSecurityCenterPage();

    fireEvent.click(screen.getByRole('button', { name: /Run Security Scan/i }));

    expect(mockDetectAnomalies).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('threat-detection-panel')).toBeTruthy();
  });
});