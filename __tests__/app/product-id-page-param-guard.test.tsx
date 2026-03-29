import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

const renderProductPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/product/[id]/page');
  const ProductDetailPage = pageModule.default as React.ComponentType;
  return render(<ProductDetailPage />);
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
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Star: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
    ShoppingCart: Icon,
    Heart: Icon,
    Truck: Icon,
    ShieldCheck: Icon,
    Package: Icon,
    Zap: Icon,
    Check: Icon,
    AlertTriangle: Icon,
    Store: Icon,
    ArrowLeft: Icon,
    MessageSquare: Icon,
    ThumbsUp: Icon,
    ChevronDown: Icon,
  };
});

describe('Product route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (global as any).fetch = mockFetch;
    localStorage.clear();
  });

  it('renders a stable not-found state when the product id route param is missing', async () => {
    renderProductPage();

    expect(await screen.findByText(/Product not found/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to marketplace/i }).getAttribute('href')).toBe('/marketplace');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});