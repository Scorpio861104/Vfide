import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

const renderStorePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/store/[slug]/page');
  const StorefrontPage = pageModule.default as React.ComponentType;
  return render(<StorefrontPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Star: Icon,
    MapPin: Icon,
    Package: Icon,
    ShoppingCart: Icon,
    ArrowLeft: Icon,
    ExternalLink: Icon,
    Globe: Icon,
    X: Icon,
    Plus: Icon,
    Minus: Icon,
    Search: Icon,
  };
});

describe('Store route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (global as any).fetch = mockFetch;
  });

  it('renders a stable missing-merchant state when the store slug route param is missing', async () => {
    renderStorePage();

    expect(await screen.findByText(/Merchant not found/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to directory/i }).getAttribute('href')).toBe('/merchants');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});