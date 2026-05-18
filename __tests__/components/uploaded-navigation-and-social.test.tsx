import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../../components/navigation/AppShell';
import { SocialFeed } from '../../components/social/SocialFeed';

let mockPathname = '/dashboard';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/lib/notifications', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

jest.mock('@/components/navigation/PieMenu', () => ({
  PieMenu: () => <div data-testid="pie-menu">Pie Menu</div>,
}));

jest.mock('@/components/social/SocialTipButton', () => ({
  SocialTipButton: () => <button type="button">Tip</button>,
}));

describe('uploaded navigation integration', () => {
  it('shows the app shell navigation on in-app routes', () => {
    mockPathname = '/dashboard';
    render(
      <AppShell>
        <div>Shell content</div>
      </AppShell>
    );

    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.queryByText('Shell content')).not.toBeNull();
    expect(screen.queryByTestId('notification-bell')).not.toBeNull();
    expect(screen.queryByTestId('pie-menu')).not.toBeNull();
  });

  it('skips the app shell on excluded landing routes', () => {
    mockPathname = '/';
    render(
      <AppShell>
        <div>Landing content</div>
      </AppShell>
    );

    expect(screen.queryByText('Landing content')).not.toBeNull();
    expect(screen.queryByTestId('notification-bell')).toBeNull();
    expect(screen.queryByTestId('pie-menu')).toBeNull();
  });
});

describe('uploaded social feed enhancements', () => {
  it('renders seeded social commerce sections so the feed is not empty', () => {
    render(<SocialFeed />);

    expect(screen.queryByText(/today at the market/i)).not.toBeNull();
    expect(screen.queryByText(/trending this week/i)).not.toBeNull();
  });
});
