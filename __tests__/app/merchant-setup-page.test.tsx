import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/merchant/MerchantQuickSetup', () => ({
  MerchantQuickSetup: () => <div>Merchant Quick Setup Component</div>,
}));

jest.mock('@/components/merchant/training/MerchantTraining', () => ({
  __esModule: true,
  default: () => <div>Merchant Training Component</div>,
}));

jest.mock('@/components/merchant/OffRampWithdraw', () => ({
  __esModule: true,
  default: () => <div>Off-Ramp Withdraw Component</div>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: true }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <div>Connect</div>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
}));

describe('Merchant setup page', () => {
  it('renders the setup flow with training and off-ramp resources', () => {
    const pageModule = require('../../app/merchant/setup/page');
    const MerchantSetupPage = pageModule.default as React.ComponentType;

    render(<MerchantSetupPage />);

    expect(screen.getByText(/Create your store/i)).toBeTruthy();
    expect(screen.getByText(/Merchant Quick Setup Component/i)).toBeTruthy();
    expect(screen.getByText(/Merchant Training Component/i)).toBeTruthy();
    expect(screen.getByText(/Off-Ramp Withdraw Component/i)).toBeTruthy();
  });
});
