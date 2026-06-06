import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderScanPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/scan/page');
  const ScanPage = pageModule.default as React.ComponentType;
  return render(<ScanPage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('../../app/scan/components/ScanContent', () => ({
  ScanContent: () => <div data-testid="scan-content">Scan Content</div>,
}));

describe('Scan route', () => {
  it('renders scan content shell', () => {
    renderScanPage();

    expect(screen.getByTestId('scan-content')).toBeTruthy();
  });
});
