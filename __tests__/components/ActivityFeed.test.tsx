import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityFeed from '@/components/activity/ActivityFeed';

describe('ActivityFeed', () => {
  const userAddress = '0x1111111111111111111111111111111111111111';

  test('renders header and empty state by default', () => {
    render(<ActivityFeed userAddress={userAddress} />);

    expect(screen.getByText(/Activity Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  test('renders all filter tabs', () => {
    render(<ActivityFeed userAddress={userAddress} />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Endorsements' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Badges' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Groups' })).toBeInTheDocument();
  });

  test('allows switching filter tabs without crashing', () => {
    render(<ActivityFeed userAddress={userAddress} />);

    fireEvent.click(screen.getByRole('button', { name: 'Messages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Payments' }));
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  test('shows activity counter in header', () => {
    render(<ActivityFeed userAddress={userAddress} />);

    expect(screen.getByText(/0\s+activities/i)).toBeInTheDocument();
  });
});
