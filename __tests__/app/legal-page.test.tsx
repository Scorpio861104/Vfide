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