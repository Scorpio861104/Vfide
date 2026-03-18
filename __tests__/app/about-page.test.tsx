import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderAboutPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/about/page');
  const AboutPage = pageModule.default as React.ComponentType;
  return render(<AboutPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  );

  return { motion };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Shield: Icon,
    Users: Icon,
    Zap: Icon,
    Heart: Icon,
  };
});

describe('About page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mission and core value content', () => {
    renderAboutPage();

    expect(screen.getByRole('heading', { name: /About VFIDE/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Our Mission/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Non-Custodial/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Community Governed/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /No Processor Fees/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /For Everyone/i })).toBeTruthy();
  });

  it('includes public source code link with secure target attributes', () => {
    renderAboutPage();

    const sourceLink = screen.getByRole('link', { name: /View Source Code on GitHub/i });

    expect(sourceLink.getAttribute('href')).toBe('https://github.com/Scorpio861104/Vfide');
    expect(sourceLink.getAttribute('target')).toBe('_blank');
    expect(sourceLink.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
