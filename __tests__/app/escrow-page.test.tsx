import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderEscrowPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/escrow/page');
  const EscrowPage = pageModule.default as React.ComponentType;
  return render(<EscrowPage />);
};

jest.mock('../../app/escrow/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active tab content</div>,
}));

jest.mock('../../app/escrow/components/CreateTab', () => ({
  CreateTab: () => <div>Create tab content</div>,
}));

jest.mock('../../app/escrow/components/CompletedTab', () => ({
  CompletedTab: () => <div>Completed tab content</div>,
}));

jest.mock('../../app/escrow/components/DisputesTab', () => ({
  DisputesTab: () => <div>Disputes tab content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Escrow page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders escrow heading and subtitle', () => {
    renderEscrowPage();

    expect(screen.getByText(/^Escrow$/i)).toBeTruthy();
    expect(screen.getByText(/Secure conditional payments/i)).toBeTruthy();
  });

  it('renders escrow tab navigation labels', () => {
    renderEscrowPage();

    expect(screen.getByRole('button', { name: /^Active$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Create$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Completed$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Disputes$/i })).toBeTruthy();
  });

  it('switches to create tab content', () => {
    renderEscrowPage();

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));
    expect(screen.getByText(/Create tab content/i)).toBeTruthy();
  });
});