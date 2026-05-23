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

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockAccountState,
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
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