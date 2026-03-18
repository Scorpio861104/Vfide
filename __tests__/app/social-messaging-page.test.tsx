import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccountState = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

let mockVaultState = {
  hasVault: true,
  vaultAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
  isLoading: false,
};

const mockUnlockAchievement = jest.fn();
const mockRecordActivity = jest.fn();
const mockTrack = jest.fn();

const renderSocialMessagingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social-messaging/page');
  const SocialMessagingPage = pageModule.default as React.ComponentType;
  return render(<SocialMessagingPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccountState,
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/hooks/useHasVault', () => ({
  useHasVault: () => mockVaultState,
}));

jest.mock('@/lib/socialAnalytics', () => ({
  analytics: {
    track: (...args: any[]) => mockTrack(...args),
  },
}));

jest.mock('@/lib/gamification', () => ({
  gamification: {
    incrementStat: jest.fn(),
    awardXP: jest.fn(),
  },
  useGamification: () => ({
    recordActivity: mockRecordActivity,
    unlockAchievement: mockUnlockAchievement,
  }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/FirstTimeUserBanner', () => ({
  FirstTimeUserBanner: ({ message }: { message: string }) => <div>First Time Banner: {message}</div>,
}));

jest.mock('@/components/gamification/GamificationWidgets', () => ({
  UserStatsWidget: () => <div>User Stats Widget</div>,
}));

jest.mock('@/components/social/FriendsList', () => ({
  FriendsList: () => <div>Friends List Component</div>,
}));

jest.mock('@/components/social/MessagingCenter', () => ({
  MessagingCenter: () => <div>Messaging Center Component</div>,
}));

jest.mock('@/components/social/GroupMessaging', () => ({
  GroupMessaging: () => <div>Group Messaging Component</div>,
}));

jest.mock('@/components/social/FriendRequestsPanel', () => ({
  FriendRequestsPanel: () => <div>Friend Requests Component</div>,
}));

jest.mock('@/components/social/PrivacySettings', () => ({
  PrivacySettings: () => <div>Privacy Settings Component</div>,
}));

jest.mock('@/components/social/FriendCirclesManager', () => ({
  FriendCirclesManager: () => <div>Friend Circles Component</div>,
}));

jest.mock('@/components/settings/AccountSettings', () => ({
  AccountSettings: () => <div>Account Settings Component</div>,
}));

jest.mock('@/components/social/SocialNotifications', () => ({
  SocialNotifications: () => <div>Social Notifications Component</div>,
}));

jest.mock('@/components/social/GlobalUserSearch', () => ({
  GlobalUserSearch: () => <div>Global User Search Component</div>,
}));

jest.mock('@/components/social/ActivityFeed', () => ({
  ActivityFeed: () => <div>Activity Feed Component</div>,
}));

jest.mock('@/components/social/EndorsementsBadges', () => ({
  EndorsementsBadges: () => <div>Endorsements & Badges Component</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Social messaging page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockAccountState = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    mockVaultState = {
      hasVault: true,
      vaultAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      isLoading: false,
    };
  });

  it('shows connect-wallet guard when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };

    renderSocialMessagingPage();

    expect(screen.getByRole('heading', { name: /Connect Your Wallet/i })).toBeTruthy();
    expect(screen.getByText(/Access encrypted messaging/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
  });

  it('renders connected messaging shell and default messages tab', () => {
    renderSocialMessagingPage();

    expect(screen.getByRole('heading', { name: /Social Hub/i })).toBeTruthy();
    expect(screen.getByText(/Vault Active/i)).toBeTruthy();
    expect(screen.getByText(/First Time Banner:/i)).toBeTruthy();
    expect(screen.getByText('Friends List Component')).toBeTruthy();
    expect(screen.getByText(/Select a Friend to Start Messaging/i)).toBeTruthy();
  });

  it('switches tabs for requests, groups, discover, and account modules', () => {
    renderSocialMessagingPage();

    fireEvent.click(screen.getAllByRole('button', { name: /Requests/i })[0]);
    expect(screen.getByText('Friend Requests Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Groups/i })[0]);
    expect(screen.getByText('Group Messaging Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Discover/i })[0]);
    expect(screen.getByText('Global User Search Component')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Account/i })[0]);
    expect(screen.getByText('Account Settings Component')).toBeTruthy();
    expect(screen.getByText('Endorsements & Badges Component')).toBeTruthy();
  });
});