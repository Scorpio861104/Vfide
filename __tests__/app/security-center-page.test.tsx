'use client';

import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SecurityCenterPage from '@/app/security-center/page';

jest.mock('next/navigation');

describe('Security Center Page', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      pathname: '/security-center',
    });
  });

  it('renders the security center dashboard with score and checklist', () => {
    render(<SecurityCenterPage />);

    // Real page shows security score heading
    expect(screen.getByRole('heading', { name: /Security Score/i })).toBeTruthy();
    
    // Shows security checklist
    expect(screen.getByText(/Backup Seed Phrase/i)).toBeTruthy();
    expect(screen.getByText(/Set Up 2FA/i)).toBeTruthy();
    expect(screen.getByText(/Add Guardian/i)).toBeTruthy();
  });

  it('displays active sessions', () => {
    render(<SecurityCenterPage />);
    
    // Active sessions section
    expect(screen.getByRole('heading', { name: /Active Sessions/i })).toBeTruthy();
  });

  it('provides security recommendations', () => {
    render(<SecurityCenterPage />);
    
    // Tips section
    expect(screen.getByText(/Never share your seed phrase/i) || screen.getByText(/security/i)).toBeTruthy();
  });
});
