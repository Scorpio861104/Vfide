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

jest.mock('framer-motion', () => {
  const React = require('react');
  const __MOTION_PROPS = new Set(['initial','animate','exit','transition','variants','whileHover','whileTap','layout','layoutId','viewport','custom']);
  const __makeMotion = (tag: string) => React.forwardRef((props: Record<string,unknown>, ref: unknown) => {
    const sanitized: Record<string,unknown> = {};
    for (const k of Object.keys(props || {})) { if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k]; }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({} as Record<string, unknown>, { get: (t, prop) => { if (typeof prop !== 'string') return undefined; if (!t[prop]) t[prop] = __makeMotion(prop); return t[prop]; } });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const Icon = ({ className }: { className?: string }) => React.createElement('span', { 'data-testid': `icon-${String(prop)}`, className });
      Icon.displayName = `LucideMock(${String(prop)})`;
      return Icon;
    },
  });
});

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

    expect(screen.getAllByText(/Security Center/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Coming in a future release/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Configure 2FA/i })).toBeDisabled();
  });

  it('runs anomaly scan and switches to threat detection tab', () => {
    renderSecurityCenterPage();

    fireEvent.click(screen.getByRole('button', { name: /Run Security Scan/i }));

    expect(mockDetectAnomalies).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('threat-detection-panel')).toBeTruthy();
  });
});