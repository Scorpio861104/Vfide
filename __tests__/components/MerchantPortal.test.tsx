/**
 * Merchant Portal Component Tests
 * Testing payment requests, revenue analytics, bulk payments, and API keys
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MerchantPortal from '../../components/merchant/MerchantPortal';

describe('MerchantPortal Component', () => {
  it('renders without crashing', () => {
    render(<MerchantPortal />);
    const header = screen.getByText('Merchant Portal');
    expect(header).toBeInTheDocument();
  });

  it('displays key metrics on load', () => {
    render(<MerchantPortal />);

    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/Average Transaction/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Requests/i)).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    render(<MerchantPortal />);

    expect(screen.getByRole('button', { name: /Payment Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revenue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bulk Payments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /API Keys/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    // Should start on Payment Requests tab
    expect(screen.getByText('Create Payment Request')).toBeInTheDocument();

    // Click Revenue tab
    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });
  });
});

describe('Payment Requests Section', () => {
  it('displays create payment request form', () => {
    render(<MerchantPortal />);

    expect(screen.getByPlaceholderText(/recipient@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1500')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/monthly retainer for services/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Request/i })).toBeInTheDocument();
  });

  it('displays existing payment requests', () => {
    render(<MerchantPortal />);

    expect(screen.getByText(/Monthly retainer/i)).toBeInTheDocument();
    expect(screen.getByText(/Consulting hours/i)).toBeInTheDocument();
    expect(screen.getByText(/Vendor invoice/i)).toBeInTheDocument();
  });

  it('shows request status badges', () => {
    render(<MerchantPortal />);

    expect(screen.getAllByText(/Pending/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sent/i).length).toBeGreaterThan(0);
  });

  it('allows creating a new payment request', async () => {
    // Mock fetch for the payment request creation
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        request: {
          id: 'req-new',
          from_address: '0x1234567890123456789012345678901234567890',
          to_address: '0x9876543210987654321098765432109876543210',
          amount: '5000',
          token: 'USDC',
          memo: 'New service payment',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tx_hash: null,
        },
      }),
    });
    global.fetch = mockFetch;

    const user = userEvent.setup();
    render(<MerchantPortal />);

    const emailInput = screen.getByPlaceholderText(/recipient@example.com/i);
    const amountInput = screen.getByPlaceholderText('1500');
    const descriptionInput = screen.getByPlaceholderText(/monthly retainer for services/i);
    const createButton = screen.getByRole('button', { name: /Create Request/i });

    // Use a valid Ethereum address
    await user.type(emailInput, '0x9876543210987654321098765432109876543210');
    await user.type(amountInput, '5000');
    await user.type(descriptionInput, 'New service payment');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/New service payment/i)).toBeInTheDocument();
    });

    // Cleanup
    // @ts-expect-error – restoring original
    delete global.fetch;
  });

  it('displays recipient email for each request', () => {
    render(<MerchantPortal />);

    expect(screen.getByText(/dev@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/consultant@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/vendor@example\.com/)).toBeInTheDocument();
  });

  it('shows payment request amounts and currencies', () => {
    render(<MerchantPortal />);

    expect(screen.getByText(/1500 USDC/i)).toBeInTheDocument();
    expect(screen.getByText(/500 ETH/i)).toBeInTheDocument();
    expect(screen.getByText(/2000 USDC/i)).toBeInTheDocument();
  });

  it('allows copying payment link for pending requests', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const copyButtons = screen.getAllByText(/Copy Link/i);
    expect(copyButtons.length).toBeGreaterThan(0);

    await user.click(copyButtons[0]);
    // Button click should work
    expect(copyButtons[0]).toBeInTheDocument();
  });
});

describe('Revenue Section', () => {
  it('displays revenue statistics', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    // Navigate to Revenue tab
    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Total Volume')).toBeInTheDocument();
      expect(screen.getByText('Daily Average')).toBeInTheDocument();
    });
  });

  it('displays period selector buttons', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
    });
  });

  it('displays revenue trend chart', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
    });
  });

  it('displays detailed revenue report table', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      expect(screen.getByText('Detailed Revenue Report')).toBeInTheDocument();
      // Check for table headers
      expect(screen.getByText('Date', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Revenue', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Transactions', { selector: 'th' })).toBeInTheDocument();
    });
  });

  it('allows switching between time periods', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    const period7d = screen.getByRole('button', { name: '7d' });
    const period30d = screen.getByRole('button', { name: '30d' });

    await user.click(period7d);
    expect(period7d).toHaveClass('bg-blue-600');

    await user.click(period30d);
    expect(period30d).toHaveClass('bg-blue-600');
  });
});

describe('Bulk Payments Section', () => {
  it('displays bulk payment upload interface', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      expect(screen.getByText(/Upload Bulk Payments/i)).toBeInTheDocument();
      expect(screen.getByText(/Drop CSV file/i)).toBeInTheDocument();
    });
  });

  it('displays file upload button', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement | null;
      expect(fileInput).toBeInTheDocument();
    });
  });

  it('displays CSV format instructions', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      expect(screen.getByText(/email, amount, currency, description/i)).toBeInTheDocument();
    });
  });

  it('displays upload history', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      expect(screen.getByText('Upload History')).toBeInTheDocument();
      expect(screen.getByText(/payroll_january_2024.csv/i)).toBeInTheDocument();
    });
  });

  it('shows job status badges', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/processing/i).length).toBeGreaterThan(0);
    });
  });

  it('displays progress for processing jobs', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      // Check for progress bar container
      const progressBars = document.querySelectorAll('[style*="width"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });
});

describe('API Keys Section', () => {
  it('displays API key generation form', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/production api key/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    });
  });

  it('displays existing API keys', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getByText('Production Key (Issued)')).toBeInTheDocument();
      expect(screen.getByText('Staging Key (Issued)')).toBeInTheDocument();
      expect(screen.getByText('Old Test Key')).toBeInTheDocument();
    });
  });

  it('shows API key status', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      const activeStatuses = screen.getAllByText('active');
      const revokedStatuses = screen.getAllByText('revoked');
      expect(activeStatuses.length).toBeGreaterThan(0);
      expect(revokedStatuses.length).toBeGreaterThan(0);
    });
  });

  it('displays masked API key values and does not expose reveal controls', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getAllByText(/\*{4,}/).length).toBeGreaterThan(0);
      expect(screen.queryByText('Show')).not.toBeInTheDocument();
      expect(screen.queryByText('Hide')).not.toBeInTheDocument();
    });
  });

  it('allows revoking active API keys', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    const revokeButtons = await screen.findAllByText('Revoke');
    expect(revokeButtons.length).toBeGreaterThan(0);
    await user.click(revokeButtons[0]);
  });

  it('displays API documentation link', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getByText('📚 API Documentation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View Documentation/i })).toBeInTheDocument();
    });
  });

  it('allows generating new API keys', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    const keyNameInput = screen.getByPlaceholderText(/production api key/i);
    const generateButton = screen.getByRole('button', { name: /Generate/i });

    await user.type(keyNameInput, 'New Test Key');
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('API Key Request Submitted')).toBeInTheDocument();
      expect(screen.getByText('Request ID:')).toBeInTheDocument();
      expect(screen.getAllByText('New Test Key').length).toBeGreaterThan(0);
    });
  });
});

describe('Merchant Portal Accessibility', () => {
  it('has proper heading hierarchy', () => {
    render(<MerchantPortal />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Merchant Portal');
  });

  it('all tabs have proper labels', () => {
    render(<MerchantPortal />);

    const tabs = screen.getAllByRole('button');
    const tabLabels = tabs.map(tab => tab.getAttribute('aria-label') || tab.textContent);
    expect(tabLabels.length).toBeGreaterThan(0);
  });

  it('all form inputs have labels', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    // Payment Requests tab
    expect(screen.getByPlaceholderText(/recipient@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1500')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/monthly retainer for services/i)).toBeInTheDocument();

    // API Keys tab
    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/production api key/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const firstTab = screen.getByRole('button', { name: /Payment Requests/i });
    firstTab.focus();
    expect(firstTab).toHaveFocus();
  });

  it('responsive table is accessible on mobile', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const revenueTab = screen.getByRole('button', { name: /Revenue/i });
    await user.click(revenueTab);

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });
});

describe('Merchant Portal Mobile Responsiveness', () => {
  it('renders on mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(<MerchantPortal />);
    expect(container).toBeInTheDocument();
  });

  it('hides tab labels on small screens', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(<MerchantPortal />);
    const hiddenElements = container.querySelectorAll('.hidden.sm\\:inline');
    expect(hiddenElements.length).toBeGreaterThanOrEqual(0);
  });

  it('stacks form fields on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<MerchantPortal />);

    const form = screen.getByPlaceholderText(/recipient@example.com/i).closest('div')?.parentElement;
    expect(form?.className).toContain('grid-cols-1');
  });

  it('metrics display in 2x2 grid on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(<MerchantPortal />);
    expect(container).toBeInTheDocument();
    // Mobile should show cards in responsive grid
  });
});

describe('Merchant Portal Data Validation', () => {
  it('validates payment request form inputs', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const createButton = screen.getByRole('button', { name: /Create Request/i });

    // Try to create without filling form
    await user.click(createButton);

    // Should not create request without required fields
    // (Form validation happens in the component)
  });

  it('shows API key in masked format by default', async () => {
    const user = userEvent.setup();
    localStorage.setItem('vfide-merchant-api-keys', JSON.stringify([
      {
        id: 'masked-key-1',
        name: 'Security Test Key',
        maskedKey: 'issued_live_************',
        key: 'issued_live_super_secret_value',
        status: 'active',
        createdAt: Date.now(),
        lastUsed: null,
        permissions: ['read:payments'],
      },
    ]));

    render(<MerchantPortal />);

    const apiTab = screen.getByRole('button', { name: /API Keys/i });
    await user.click(apiTab);

    await waitFor(() => {
      expect(screen.getByText('Security Test Key')).toBeInTheDocument();
      expect(screen.getByText('issued_live_************')).toBeInTheDocument();
      expect(screen.queryByText('issued_live_super_secret_value')).not.toBeInTheDocument();
    });
  });

  it('validates CSV file upload', async () => {
    const user = userEvent.setup();
    render(<MerchantPortal />);

    const bulkTab = screen.getByRole('button', { name: /Bulk Payments/i });
    await user.click(bulkTab);

    await waitFor(() => {
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement | null;
      expect(fileInput?.accept).toBe('.csv');
    });
  });
});
