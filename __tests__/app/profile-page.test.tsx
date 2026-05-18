import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockIsConnected = true;

const renderProfilePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/profile/page');
  const ProfilePage = pageModule.default as React.ComponentType;
  return render(<ProfilePage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: mockIsConnected }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/profile/ProfileSettings', () => ({
  ProfileSettings: () => <div>Profile Settings Panel</div>,
}));

describe('Profile page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
  });

  it('shows connect-wallet state when disconnected', () => {
    mockIsConnected = false;
    renderProfilePage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Please connect your wallet to view and edit your profile/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('shows profile settings when connected', () => {
    renderProfilePage();

    expect(screen.getByText('Profile Settings Panel')).toBeTruthy();
  });
});