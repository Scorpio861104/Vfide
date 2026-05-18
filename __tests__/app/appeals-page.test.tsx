import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderAppealsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/appeals/page');
  const AppealsPage = pageModule.default as React.ComponentType;
  return render(<AppealsPage />);
};

jest.mock('../../app/appeals/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active appeals content</div>,
}));

jest.mock('../../app/appeals/components/SubmitTab', () => ({
  SubmitTab: () => <div>Submit appeals content</div>,
}));

jest.mock('../../app/appeals/components/ResolvedTab', () => ({
  ResolvedTab: () => <div>Resolved appeals content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

describe('Appeals page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders appeals heading and submit tab by default', () => {
    renderAppealsPage();

    expect(screen.getByRole('heading', { name: /^Appeals$/i })).toBeTruthy();
    expect(screen.getByText(/Dispute review and trusted appeal handling/i)).toBeTruthy();
    expect(screen.getByText(/Submit appeals content/i)).toBeTruthy();
  });

  it('renders appeals tab controls', () => {
    renderAppealsPage();

    expect(screen.getByRole('button', { name: /^Active$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Submit$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Resolved$/i })).toBeTruthy();
  });

  it('switches between active and resolved tabs', () => {
    renderAppealsPage();

    fireEvent.click(screen.getByRole('button', { name: /^Active$/i }));
    expect(screen.getByText(/Active appeals content/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Resolved$/i }));
    expect(screen.getByText(/Resolved appeals content/i)).toBeTruthy();
  });
});