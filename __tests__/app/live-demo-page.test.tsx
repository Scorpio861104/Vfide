import { describe, it, expect, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const showNotification = jest.fn();

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/live-demo/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/layout/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));
jest.mock('@/components/trust/ProofScoreVisualizer', () => ({ ProofScoreVisualizer: () => <div>ProofScoreVisualizer</div> }));
jest.mock('@/components/trust/LiveActivityFeed', () => ({ LiveActivityFeed: () => <div>LiveActivityFeed</div> }));
jest.mock('@/components/commerce/FeeSavingsCalculator', () => ({ FeeSavingsCalculator: () => <div>FeeSavingsCalculator</div> }));
jest.mock('@/components/stats/LiveSystemStats', () => ({ LiveSystemStats: () => <div>LiveSystemStats</div> }));
jest.mock('@/components/wallet/TransactionNotification', () => ({
  TransactionNotification: () => <div>TransactionNotification</div>,
  useTransactionNotifications: () => ({
    notification: null,
    showNotification,
    closeNotification: jest.fn(),
  }),
}));

jest.mock('wagmi', () => ({ useAccount: () => ({ address: '0x123', isConnected: true }) }));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }) };
});

describe('Live demo page', () => {
  it('renders hero and feature components', () => {
    renderPage();
    expect(screen.getByText(/Experience/i)).toBeTruthy();
    expect(screen.getByText(/VFIDE Live/i)).toBeTruthy();
    expect(screen.getByText('LiveSystemStats')).toBeTruthy();
    expect(screen.getByText('LiveActivityFeed')).toBeTruthy();
  });

  it('triggers demo transaction notification flow', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Endorse Another User/i }));
    expect(showNotification).toHaveBeenCalled();
  });
});
