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
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
    Share2: Icon,
    Truck: Icon,
    Shield: Icon,
    Package: Icon,
    Download: Icon,
    Clock: Icon,
    Minus: Icon,
    Plus: Icon,
    Zap: Icon,
    Check: Icon,
    Loader2: Icon,
    ExternalLink: Icon,
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

    expect(await screen.findByText('icon')).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});