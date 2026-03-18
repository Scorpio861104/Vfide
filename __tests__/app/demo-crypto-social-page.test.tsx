import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/demo/crypto-social/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/social/SocialPaymentButton', () => ({
  SocialPaymentButton: () => <div>SocialPaymentButton</div>,
}));

jest.mock('@/components/social/PremiumContentGate', () => ({
  PremiumContentGate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/social/SubscriptionManager', () => ({
  SubscriptionManager: () => <div>SubscriptionManager</div>,
}));

jest.mock('@/components/social/UnifiedActivityFeed', () => ({
  UnifiedActivityFeed: () => <div>UnifiedActivityFeed</div>,
}));

jest.mock('@/components/social/CreatorDashboard', () => ({
  CreatorDashboard: () => <div>CreatorDashboard</div>,
}));

describe('Demo Crypto Social page', () => {
  it('renders page shell and tab navigation', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Crypto-Social Integration Demo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Social Feed with Tipping/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Premium Content/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Subscriptions/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Creator Dashboard/i })).toBeTruthy();
  });

  it('switches tabs and renders tab-specific content', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Subscriptions/i }));
    expect(screen.getByText('SubscriptionManager')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Creator Dashboard/i }));
    expect(screen.getByText('CreatorDashboard')).toBeTruthy();
  });
});
