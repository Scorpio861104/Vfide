import { fireEvent, render, screen } from '@testing-library/react';
import FlashLoansPage from '../../app/flashloans/page';
import React from 'react';

jest.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, ...props }: any) => React.createElement('h1', props, children),
  },
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('../../app/flashloans/components/BorrowTab', () => ({
  BorrowTab: () => <div>Borrow Tab Content</div>,
}));

jest.mock('../../app/flashloans/components/ActiveTab', () => ({
  ActiveTab: () => <div>Active Loans Tab Content</div>,
}));

jest.mock('../../app/flashloans/components/HistoryTab', () => ({
  HistoryTab: () => <div>History Tab Content</div>,
}));

describe('FlashLoansPage', () => {
  it('renders the page shell and default Borrow tab', () => {
    render(<FlashLoansPage />);

    expect(screen.getByRole('heading', { name: /Flash Loans/i })).toBeInTheDocument();
    expect(screen.getByText(/Zero-collateral instant loans/i)).toBeInTheDocument();
    expect(screen.getByText('Borrow Tab Content')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('switches from Borrow to Active Loans and History tabs', () => {
    render(<FlashLoansPage />);

    fireEvent.click(screen.getByRole('button', { name: /Active Loans/i }));
    expect(screen.getByText('Active Loans Tab Content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    expect(screen.getByText('History Tab Content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Borrow/i }));
    expect(screen.getByText('Borrow Tab Content')).toBeInTheDocument();
  });
});
