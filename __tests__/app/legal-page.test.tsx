import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderLegalPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/legal/page');
  const LegalPage = pageModule.default as React.ComponentType;
  return render(<LegalPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() })),
  usePathname: jest.fn(() => '/legal'),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy({}, {
    get: (_t, tag) => {
      if (tag === '__esModule') return true;
      return ({ children, ...rest }: any) => React.createElement(String(tag), rest, children);
    },
  });
  return { motion, AnimatePresence: ({ children }: any) => children };
});

jest.mock('lucide-react', () => (() => {
  const __orig: Record<string, any> = {};
  return new Proxy(__orig, {
    get: (_t, prop) => {
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

describe('Legal page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders legal header and default disclaimers tab content', () => {
    renderLegalPage();

    expect(screen.getByRole('heading', { name: /Legal & Policies/i })).toBeTruthy();
    expect(screen.getByText(/STANDARD DISCLAIMER/i)).toBeTruthy();
    expect(screen.getAllByText(/What VFIDE Tokens ARE/i).length).toBeGreaterThan(0);
  });

  it('switches to privacy and terms tab content', () => {
    renderLegalPage();

    fireEvent.click(screen.getByRole('tab', { name: /Privacy/i }));
    expect(screen.getByText(/Key Privacy Points/i)).toBeTruthy();
    expect(screen.getByText(/Data We DO NOT Collect/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Terms/i }));
    expect(screen.getByText(/Nature of VFIDE Tokens/i)).toBeTruthy();
    expect(screen.getByText(/Risk Acknowledgment/i)).toBeTruthy();
  });
});