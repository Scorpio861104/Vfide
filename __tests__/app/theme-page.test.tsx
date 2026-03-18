import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/theme/page');
  const Page = pageModule.default as React.ComponentType;
  return render(<Page />);
};

jest.mock('@/hooks/useThemeManager', () => ({
  useThemeManager: () => ({
    settings: { mode: 'dark' },
    currentTheme: 'default',
    setTheme: jest.fn(),
    setMode: jest.fn(),
    exportTheme: () => '{}',
    importTheme: jest.fn(),
    resetToDefault: jest.fn(),
  }),
}));

jest.mock('@/components/theme/ThemeCustomizer', () => ({ ThemeCustomizer: () => <div>ThemeCustomizer</div> }));
jest.mock('@/lib/hooks/useCopyToClipboard', () => ({ useCopyToClipboard: () => ({ copied: false, copy: jest.fn() }) }));

jest.mock('framer-motion', () => {
  const MotionTag = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return { motion: new Proxy({}, { get: () => MotionTag }) };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Theme management page', () => {
  it('renders theme management header and tabs', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Theme Management/i })).toBeTruthy();
    expect(screen.getAllByText(/Presets/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customizer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Preview/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Advanced/i).length).toBeGreaterThan(0);
  });
});
