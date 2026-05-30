import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderReportingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/reporting/page');
  const ReportingPage = pageModule.default as React.ComponentType;
  return render(<ReportingPage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/feedback/ComingSoonPage', () => ({
  ComingSoonPage: ({ title, alternative }: any) => (
    <div>
      <h1>{title}</h1>
      <a href={alternative?.href}>{alternative?.label}</a>
    </div>
  ),
}));

describe('Reporting route page', () => {
  it('renders reporting coming-soon with merchant analytics alternative', () => {
    renderReportingPage();

    expect(screen.getByRole('heading', { name: /Reports & Dashboards/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Merchant Analytics/i }).getAttribute('href')).toBe('/merchant/analytics');
  });
});
