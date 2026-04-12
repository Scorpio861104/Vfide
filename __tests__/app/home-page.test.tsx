import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderHomePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/page');
  const HomePage = pageModule.default as React.ComponentType;
  return render(<HomePage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return {
    motion: new Proxy({}, { get: () => MotionTag }),
    useScroll: () => ({ scrollYProgress: 0 }),
    useTransform: () => 0,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('@/components/onboarding', () => ({
  useOnboarding: () => ({ state: { path: 'merchant' } }),
  OnboardingPathChooser: () => <div data-testid="onboarding-path-chooser" />,
}));

jest.mock('@/components/fees', () => ({
  FeeSavingsCalculator: () => <div data-testid="fee-savings-calculator" />,
}));

describe('Home page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero content and primary actions', () => {
    renderHomePage();

    expect(screen.getByRole('heading', { name: /Keep what you earn/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Start selling/i }).getAttribute('href')).toBe('/merchant/setup');
    expect(screen.getByRole('link', { name: /Browse marketplace/i }).getAttribute('href')).toBe('/marketplace');
  });

  it('renders trust indicators and onboarding steps', () => {
    renderHomePage();

    expect(screen.getAllByText(/Merchant Fees/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Max ProofScore/i)).toBeTruthy();
    expect(screen.getByText(/Sanctum Fund/i)).toBeTruthy();
    expect(screen.getByText(/Get started in 60 seconds/i)).toBeTruthy();
  });

  it('renders account creation step copy', () => {
    renderHomePage();

    expect(screen.getByText(/Connect your wallet to continue/i)).toBeTruthy();
  });
});
