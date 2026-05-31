import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => <button>Connect Wallet</button>,
}));

jest.mock('../../app/admin/AdminDashboardClient', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-dashboard-client">Admin Dashboard Client</div>,
}));

describe('Admin route page', () => {
  it('renders server page and includes dashboard client shell', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pageModule = require('../../app/admin/page');
    const AdminPage = pageModule.default;
    const element = await (AdminPage as any)();

    render(element);

    expect(screen.getByTestId('admin-dashboard-client')).toBeTruthy();
  });
});
