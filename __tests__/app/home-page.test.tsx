import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('Home page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders hero content and primary actions', () => {
    renderHomePage();

    expect(screen.getByRole('heading', { name: /VFIDE Home/i })).toBeTruthy();
    expect(screen.getByText(/Accept Crypto\./i)).toBeTruthy();
    expect(screen.getByText(/Zero Fees\./i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Get Started/i }).getAttribute('href')).toBe('/token-launch');
    expect(screen.getByRole('link', { name: /Explore Flashloans P2P/i }).getAttribute('href')).toBe('/flashlight');
  });

  it('renders trust indicators and launch flow links', () => {
    renderHomePage();

    expect(screen.getByText(/14 Contracts Deployed/i)).toBeTruthy();
    expect(screen.getByText(/2\.8K Vaults \(Testnet\)/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Start Accepting Payments/i }).getAttribute('href')).toBe('/merchant');
    expect(screen.getByRole('link', { name: /Read Documentation/i }).getAttribute('href')).toBe('/docs');
    expect(screen.getByText(/Built for Base/i)).toBeTruthy();
  });

  it('switches homepage copy to Spanish and persists the locale choice', () => {
    renderHomePage();

    const selector = screen.getByLabelText(/Language/i);
    fireEvent.change(selector, { target: { value: 'es-ES' } });

    expect(localStorage.getItem('vfide_locale')).toBe('es-ES');
    expect(screen.getByText(/Acepta criptomonedas\./i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Comenzar/i }).getAttribute('href')).toBe('/token-launch');
  });
});
