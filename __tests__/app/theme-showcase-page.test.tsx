import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/theme-showcase/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/ui', () => {
  const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children || 'ui-stub'}</div>;
  return {
    FloatingHexagon: () => <div>FloatingHexagon</div>,
    HexagonShield: () => <div>HexagonShield</div>,
    TrustRing: () => <div>TrustRing</div>,
    TrustRings: () => <div>TrustRings</div>,
    TrustBadge: () => <div>TrustBadge</div>,
    TrustCard: Stub,
    TrustProgressBar: () => <div>TrustProgressBar</div>,
    ShieldLoader: () => <div>ShieldLoader</div>,
    HexagonSpinner: () => <div>HexagonSpinner</div>,
    PulseDotsLoader: () => <div>PulseDotsLoader</div>,
    TrustRingLoader: () => <div>TrustRingLoader</div>,
    BlockchainLoader: () => <div>BlockchainLoader</div>,
    SuccessCheckmark: () => <div>SuccessCheckmark</div>,
    SparkleOnHover: Stub,
    fireVFIDEConfetti: jest.fn(),
    fireStarShower: jest.fn(),
  };
});

jest.mock('@/components/ui/PageLayout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => <div><h1>{title}</h1><p>{subtitle}</p></div>,
  Section: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }) };
});

describe('Theme showcase page', () => {
  it('renders showcase header and key sections', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { name: /VFIDE Theme Showcase/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Digital Jade/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Trust Ring Animations/i)).toBeTruthy();
    expect(screen.getByText(/Delightful Loading States/i)).toBeTruthy();
  });
});
