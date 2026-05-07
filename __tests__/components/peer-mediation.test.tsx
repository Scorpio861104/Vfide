import React from 'react';
import { render, screen } from '@testing-library/react';
import PeerMediation from '@/components/merchant/disputes/PeerMediation';

describe('PeerMediation preview safety', () => {
  it('shows explicit no-preview state when dispute data is missing', () => {
    render(<PeerMediation userRole="merchant" />);

    expect(screen.getByText(/No live mediation case is available yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/#preview-case/i)).not.toBeInTheDocument();
  });

  it('renders live mediation values when dispute data is provided', () => {
    render(
      <PeerMediation
        userRole="merchant"
        dispute={{
          id: 'ret_12345',
          buyerAddress: '0x1111111111111111111111111111111111111111',
          merchantAddress: '0x2222222222222222222222222222222222222222',
          amount: '75',
          reason: 'Item arrived damaged',
          status: 'open',
        }}
      />
    );

    expect(screen.getByText(/#ret_1234/i)).toBeInTheDocument();
    expect(screen.getByText(/Item arrived damaged/i)).toBeInTheDocument();
  });
});
