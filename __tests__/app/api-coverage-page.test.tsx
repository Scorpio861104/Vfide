import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderApiCoveragePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/api-coverage/page');
  const ApiCoveragePage = pageModule.default as React.ComponentType;
  return render(<ApiCoveragePage />);
};

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

describe('API coverage route', () => {
  it('renders API Coverage Console heading and run controls', () => {
    renderApiCoveragePage();

    expect(screen.getByRole('heading', { name: /API Coverage Console/i })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Run request/i }).length).toBeGreaterThan(0);
  });
});
