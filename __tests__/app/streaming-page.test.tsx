import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  isConnected: true,
};

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

const renderStreamingPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/streaming/page');
  const StreamingPage = pageModule.default as React.ComponentType;
  return render(<StreamingPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

describe('Streaming page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      isConnected: true,
    };
  });

  it('renders connect prompt when wallet is disconnected', () => {
    mockAccount = {
      address: undefined as unknown as `0x${string}`,
      isConnected: false,
    };

    renderStreamingPage();

    expect(screen.getByRole('heading', { name: /Streaming Payments/i })).toBeTruthy();
    expect(screen.getByText(/Connect your wallet to manage payment streams/i)).toBeTruthy();
  });

  it('renders stream stats and supports tab switching', () => {
    renderStreamingPage();

    expect(screen.getByRole('heading', { name: /Streaming Payments/i })).toBeTruthy();
    expect(screen.getByText(/Active Streams/i)).toBeTruthy();
    expect(screen.getByText(/Total Value/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /incoming Streams/i }));
    expect(screen.getByRole('button', { name: /incoming Streams/i })).toBeTruthy();
  });

  it('opens create modal and validates required fields', () => {
    renderStreamingPage();

    fireEvent.click(screen.getByRole('button', { name: /\+ Create Stream/i }));
    expect(screen.getByRole('heading', { name: /Create Payment Stream/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Create Stream$/i }));
    expect(mockToastError).toHaveBeenCalledWith('Please fill all fields');

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '0xbbb' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '3' } });
    fireEvent.change(screen.getByDisplayValue('30'), { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /^Create Stream$/i }));
    expect(mockToastSuccess).toHaveBeenCalledWith('Stream created successfully');
  });
});
