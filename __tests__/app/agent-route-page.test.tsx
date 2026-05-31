import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderAgentPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/agent/page');
  const AgentPage = pageModule.default as React.ComponentType;
  return render(<AgentPage />);
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

describe('Agent route page', () => {
  it('renders coming-soon content with merchant portal fallback', () => {
    renderAgentPage();

    expect(screen.getByRole('heading', { name: /Cash Agent Mode/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Merchant Portal/i }).getAttribute('href')).toBe('/merchant');
  });
});
