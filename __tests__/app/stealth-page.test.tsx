import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/stealth/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/components/StealthAddressUI', () => ({
  __esModule: true,
  default: () => <div>StealthAddressUI</div>,
}));

describe('Stealth page', () => {
  it('renders stealth heading and readiness panel', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Stealth Address/i })).toBeTruthy();
    expect(screen.getByText(/Operational readiness panel/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Environment Check/i })).toBeTruthy();
  });
});
