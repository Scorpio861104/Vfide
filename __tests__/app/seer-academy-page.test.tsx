import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSeerAcademyPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/seer-academy/page');
  const SeerAcademyPage = pageModule.default as React.ComponentType;
  return render(<SeerAcademyPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    BookOpen: Icon,
    CandlestickChart: Icon,
    CheckCircle2: Icon,
    Compass: Icon,
    ExternalLink: Icon,
    Shield: Icon,
    Wallet: Icon,
  };
});

describe('Seer Academy page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders academy content and expected navigation links', () => {
    renderSeerAcademyPage();

    expect(screen.getByRole('heading', { name: /New to Crypto and Trading\?/i })).toBeTruthy();
    expect(screen.getByText(/Beginner Trading Rules With Seer/i)).toBeTruthy();
    expect(screen.getByText(/Crypto Glossary/i)).toBeTruthy();

    expect(screen.getByRole('link', { name: /Open Docs/i }).getAttribute('href')).toBe('/docs');
    expect(screen.getByRole('link', { name: /Open Buy Flow/i }).getAttribute('href')).toBe('/buy');
    expect(screen.getByRole('link', { name: /Open Payments/i }).getAttribute('href')).toBe('/pay');
  });

  it('tracks checklist progress and shows readiness message when completed', () => {
    renderSeerAcademyPage();

    expect(screen.getByText(/Progress: 0\/6/i)).toBeTruthy();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(6);

    for (const checkbox of checkboxes) {
      fireEvent.click(checkbox);
    }

    expect(screen.getByText(/Progress: 6\/6/i)).toBeTruthy();
    expect(screen.getByText(/You are ready for responsible first trades\./i)).toBeTruthy();
  });
});