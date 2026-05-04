import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('wagmi', () => ({
  useChainId: () => 8453,
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
  }),
}));

jest.mock('@/components/social/ShoppablePost', () => ({
  ShoppablePost: ({ product }: any) => <div data-testid="shoppable-post">{product?.name}</div>,
}));

jest.mock('@/components/social/PurchaseProofEvent', () => ({
  PurchaseProofEvent: ({ productName }: any) => <div data-testid="purchase-proof">{productName}</div>,
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Social commerce wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders social-commerce cards from activity types in UnifiedActivityFeed', async () => {
    const activities = [
      {
        id: 1,
        activity_type: 'product_share',
        title: 'Shared Product',
        description: 'Check this out',
        data: {
          productName: 'Aurora Hoodie',
          productPrice: '59.00',
          merchantSlug: 'aurora-shop',
          merchantName: 'Aurora Shop',
          merchantAddress: '0x2222222222222222222222222222222222222222',
        },
        created_at: '2026-05-01T00:00:00.000Z',
        user_address: '0x1111111111111111111111111111111111111111',
        user_username: 'alice',
        user_avatar: '',
      },
      {
        id: 2,
        activity_type: 'purchase_proof',
        title: 'Purchase Complete',
        description: 'Bought item',
        data: {
          productName: 'Aurora Hoodie',
          productPrice: '59.00',
          merchantSlug: 'aurora-shop',
          merchantName: 'Aurora Shop',
        },
        created_at: '2026-05-01T00:00:01.000Z',
        user_address: '0x1111111111111111111111111111111111111111',
        user_username: 'alice',
        user_avatar: '',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ activities }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const { UnifiedActivityFeed } = require('@/components/social/UnifiedActivityFeed');
    render(<UnifiedActivityFeed filter="all" limit={20} />);

    await waitFor(() => {
      expect(screen.getByTestId('shoppable-post')).toBeInTheDocument();
      expect(screen.getByTestId('purchase-proof')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Aurora Hoodie')).toHaveLength(2);
  });

  it('sends schema-compliant activity payload from ShareProductToFeed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );

    const { ShareProductToFeed } = require('@/components/social/ShareProductToFeed');

    render(
      <ShareProductToFeed
        product={{
          id: 'p-1',
          name: 'Aurora Hoodie',
          price: '59.00',
          merchantSlug: 'aurora-shop',
          merchantName: 'Aurora Shop',
          merchantAddress: '0x2222222222222222222222222222222222222222',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /share to feed/i }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Fresh drop from my store' } });

    fireEvent.click(screen.getByRole('button', { name: /^post$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/activities');

    const body = JSON.parse((options as RequestInit).body as string);
    expect(body).toMatchObject({
      userAddress: '0x1111111111111111111111111111111111111111',
      activityType: 'product_share',
      title: 'Shared Aurora Hoodie',
      description: 'Fresh drop from my store',
      data: {
        productId: 'p-1',
        productName: 'Aurora Hoodie',
        productPrice: '59.00',
        merchantSlug: 'aurora-shop',
        merchantName: 'Aurora Shop',
        merchantAddress: '0x2222222222222222222222222222222222222222',
      },
    });
  });
});
