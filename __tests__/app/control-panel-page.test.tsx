import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderControlPanelPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/control-panel/page');
  const ControlPanelPage = pageModule.default as React.ComponentType;
  return render(<ControlPanelPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
}));

jest.mock('../../app/control-panel/components/ConnectWalletPrompt', () => ({
  ConnectWalletPrompt: () => <div>Connect Wallet Prompt</div>,
}));

jest.mock('../../app/control-panel/components/SecurityComponents', () => ({
  OwnerGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../app/control-panel/components/SystemStatusPanel', () => ({
  SystemStatusPanel: () => <div>System Status Panel</div>,
}));

jest.mock('../../app/control-panel/components/HoweySafeModePanel', () => ({
  HoweySafeModePanel: () => <div>Howey Safe Mode Panel</div>,
}));

jest.mock('../../app/control-panel/components/AutoSwapPanel', () => ({
  AutoSwapPanel: () => <div>Auto Swap Panel</div>,
}));

jest.mock('../../app/control-panel/components/TokenManagementPanel', () => ({
  TokenManagementPanel: () => <div>Token Management Panel</div>,
}));

jest.mock('../../app/control-panel/components/FeeManagementPanel', () => ({
  FeeManagementPanel: () => <div>Fee Management Panel</div>,
}));

jest.mock('../../app/control-panel/components/EcosystemPanel', () => ({
  EcosystemPanel: () => <div>Ecosystem Panel</div>,
}));

jest.mock('../../app/control-panel/components/GovernancePanel', () => ({
  GovernancePanel: () => <div>Governance Panel</div>,
}));

jest.mock('../../app/control-panel/components/EmergencyPanel', () => ({
  EmergencyPanel: () => <div>Emergency Panel</div>,
}));

jest.mock('../../app/control-panel/components/ProductionSetupPanel', () => ({
  ProductionSetupPanel: () => <div>Production Setup Panel</div>,
}));

jest.mock('../../app/control-panel/components/TransactionHistory', () => ({
  TransactionHistory: () => <div>Transaction History Panel</div>,
}));

describe('Control panel page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('shows connect-wallet prompt when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderControlPanelPage();
    expect(screen.getByText('Connect Wallet Prompt')).toBeTruthy();
  });

  it('renders owner shell and overview tab content when connected', () => {
    renderControlPanelPage();

    expect(screen.getByRole('heading', { name: /Owner Control Panel/i })).toBeTruthy();
    expect(screen.getByText(/Unified interface for VFIDE protocol management/i)).toBeTruthy();
    expect(screen.getByText('System Status Panel')).toBeTruthy();
  });

  it('switches to compliance and emergency tabs', () => {
    renderControlPanelPage();

    fireEvent.click(screen.getByRole('button', { name: /Compliance/i }));
    expect(screen.getByText('Howey Safe Mode Panel')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Emergency/i }));
    expect(screen.getByText('Emergency Panel')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    expect(screen.getByText('Transaction History Panel')).toBeTruthy();
  });
});