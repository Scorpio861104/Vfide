import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockReplace = jest.fn();
let mockConnected = false;
let mockLoading = false;
let mockHeirs: Array<{ guardian: string; commitment: string }> = [];
let mockState = 0;

const renderInheritancePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/inheritance/page');
  const InheritancePage = pageModule.default as React.ComponentType;
  return render(<InheritancePage />);
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: mockConnected }),
}));

jest.mock('@/hooks/useInheritance', () => ({
  useInheritance: () => ({
    isLoading: mockLoading,
    heirs: mockHeirs,
    state: mockState,
  }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('lucide-react', () => ({
  Shield: ({ className }: { className?: string }) => <span className={className}>icon</span>,
  Loader2: ({ className }: { className?: string }) => <span className={className}>loading</span>,
}));

describe('Inheritance root route', () => {
  beforeEach(() => {
    mockConnected = false;
    mockLoading = false;
    mockHeirs = [];
    mockState = 0;
    mockReplace.mockReset();
  });

  it('renders connect-wallet message when disconnected', () => {
    renderInheritancePage();

    expect(screen.getByRole('heading', { name: /Inheritance/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage inheritance/i)).toBeTruthy();
  });

  it('redirects to setup when connected with no heirs in idle state', async () => {
    mockConnected = true;

    renderInheritancePage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/inheritance/setup');
    });
  });
});
