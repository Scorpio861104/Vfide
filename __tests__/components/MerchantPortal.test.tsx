import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MerchantPortal from '../../components/merchant/MerchantPortal';

describe('MerchantPortal', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async () =>
        new Response(JSON.stringify({ requests: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ),
    });
  });

  it('renders base shell and metrics', () => {
    render(<MerchantPortal />);

    expect(screen.getByRole('heading', { name: /Merchant Portal/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Requests/i)).toBeInTheDocument();
  });

  it('shows payment request form and empty request list by default', async () => {
    render(<MerchantPortal />);

    expect(screen.getByText('Create Payment Request')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    expect(await screen.findByText(/No payment requests yet/i)).toBeInTheDocument();
  });

  it('switches to revenue tab and renders chart/report containers', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    await user.click(screen.getByRole('button', { name: /Revenue/i }));

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
      expect(screen.getByText('Detailed Revenue Report')).toBeInTheDocument();
    });
  });

  it('switches to bulk tab and shows upload empty state', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    await user.click(screen.getByRole('button', { name: /Bulk Payments/i }));

    await waitFor(() => {
      expect(screen.getByText(/Upload Bulk Payments/i)).toBeInTheDocument();
      expect(screen.getByText('Upload History')).toBeInTheDocument();
      expect(screen.getByText(/No bulk upload history yet/i)).toBeInTheDocument();
    });
  });

  it('switches to api tab and supports new key request submission', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    await user.click(screen.getByRole('button', { name: /API Keys/i }));

    await waitFor(() => {
      expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
      expect(screen.getByText(/No API keys available yet/i)).toBeInTheDocument();
    });

    const keyInput = screen.getAllByRole('textbox')[0];
    await user.type(keyInput, 'Internal Key');
    await user.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/API Key Request Submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/Request ID:/i)).toBeInTheDocument();
    });
  });
});
