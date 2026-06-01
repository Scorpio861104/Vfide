import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderMePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/me/page');
  const MePage = pageModule.default as React.ComponentType;
  return render(<MePage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/hooks/useProofScore', () => ({
  useProofScore: () => ({ score: 0, tierName: 'BRONZE', burnFee: 0, isLoading: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/navigation/HubGrid', () => ({
  HubSection: () => <div data-testid="hub-section" />,
}));

jest.mock('@/components/ui/ProofScoreRing', () => ({
  ProofScoreRing: () => <div data-testid="proofscore-ring" />,
}));

jest.mock('@/components/ui/Numeric', () => ({
  Numeric: ({ value }: { value: number }) => <span>{value}</span>,
}));

jest.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  motion: new Proxy({}, { get: () => ({ children, ...props }: any) => <div {...props}>{children}</div> }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LazyMotion: ({ children }: any) => <>{children}</>,
  domAnimation: {},
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Me route', () => {
  it('renders disconnected hub state and connect CTA', () => {
    renderMePage();

    expect(screen.getByRole('heading', { name: /Your VFIDE/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect Wallet/i })).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});
