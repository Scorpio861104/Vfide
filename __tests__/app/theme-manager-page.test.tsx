import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/theme-manager/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/hooks/useThemeManager', () => ({
  useThemeManager: () => ({
    resetToDefault: jest.fn(),
    isDirty: false,
    isSaved: true,
    exportAsCSS: jest.fn(),
  }),
}));

jest.mock('@/components/theme/ThemeSelector', () => ({ ThemeSelector: () => <div>ThemeSelector</div> }));
jest.mock('@/components/theme/ThemeCustomizer', () => ({ ThemeCustomizer: () => <div>ThemeCustomizer</div> }));
jest.mock('@/components/theme/SavedThemesManager', () => ({ SavedThemesManager: () => <div>SavedThemesManager</div> }));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }) };
});

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
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

describe('Theme manager page', () => {
  it('renders heading and default tab content', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Theme Manager/i })).toBeTruthy();
    expect(screen.getByText('ThemeSelector')).toBeTruthy();
    expect(screen.getByText(/All Saved/i)).toBeTruthy();
  });
});
