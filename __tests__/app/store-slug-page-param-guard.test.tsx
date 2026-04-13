import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

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

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/store/[slug]/components/ProductsTab', () => ({
  ProductsTab: () => <div>Products tab content</div>,
}));

jest.mock('../../app/store/[slug]/components/ReviewsTab', () => ({
  ReviewsTab: () => <div>Reviews tab content</div>,
}));

jest.mock('../../app/store/[slug]/components/AboutTab', () => ({
  AboutTab: () => <div>About tab content</div>,
}));

describe('Store route page rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('renders storefront shell and tab navigation', () => {
    renderStorePage();

    expect(screen.getByText(/^Store$/i)).toBeTruthy();
    expect(screen.getByText(/Browse products/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Products/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reviews/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /About/i })).toBeTruthy();
    expect(screen.getByText(/Products tab content/i)).toBeTruthy();
  });

  it('switches tabs and renders corresponding content', () => {
    renderStorePage();

    fireEvent.click(screen.getByRole('button', { name: /Reviews/i }));
    expect(screen.getByText(/Reviews tab content/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /About/i }));
    expect(screen.getByText(/About tab content/i)).toBeTruthy();
  });
});
