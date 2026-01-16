'use client';

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useFeeCalculator: jest.fn(() => ({
    vfideFee: 0.5,
    traditionalFee: 2.9,
    savings: 2.4,
    savingsPercent: 82.76,
  })),
  useProofScore: jest.fn(() => ({
    score: 5000,
    burnFee: 0.5,
    tier: 'Silver',
    color: '#C0C0C0',
  })),
  useSystemStats: jest.fn(() => ({
    vaults: 1234,
    merchants: 567,
    transactions24h: 89012,
    tvl: 12345678,
  })),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    h2: ({ children, className, ...props }: any) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    h3: ({ children, className, ...props }: any) => (
      <h3 className={className} {...props}>{children}</h3>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  Building2: () => <span data-testid="building-icon">🏢</span>,
  Store: () => <span data-testid="store-icon">🏪</span>,
  Zap: () => <span data-testid="zap-icon">⚡</span>,
}));

import { FeeSavingsCalculator } from '@/components/commerce/FeeSavingsCalculator';
import { LiveSystemStats } from '@/components/stats/LiveSystemStats';
import * as hooks from '@/lib/vfide-hooks';

describe('FeeSavingsCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render calculator heading', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('See Your Savings')).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('VFIDE vs Traditional Processors')).toBeInTheDocument();
  });

  it('should render amount input', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('should render dollar sign', () => {
    render(<FeeSavingsCalculator />);
    
    // Multiple $ signs appear
    const dollarSigns = screen.getAllByText('$');
    expect(dollarSigns.length).toBeGreaterThan(0);
  });

  it('should render with default amount of 100', () => {
    render(<FeeSavingsCalculator />);
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(100);
  });

  it('should update amount on input change', () => {
    render(<FeeSavingsCalculator />);
    
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '500' } });
    
    expect(input).toHaveValue(500);
  });

  it('should call useFeeCalculator with amount', () => {
    render(<FeeSavingsCalculator />);
    
    expect(hooks.useFeeCalculator).toHaveBeenCalledWith('100');
  });

  it('should call useProofScore', () => {
    render(<FeeSavingsCalculator />);
    
    expect(hooks.useProofScore).toHaveBeenCalled();
  });

  it('should display savings amount', () => {
    render(<FeeSavingsCalculator />);
    
    // Savings is $2.4 - but formatted and in its own text node
    const { container } = render(<FeeSavingsCalculator />);
    expect(container.textContent).toContain('2.4');
  });

  it('should display savings section', () => {
    render(<FeeSavingsCalculator />);
    
    expect(screen.getByText('You Save')).toBeInTheDocument();
  });
});

describe('LiveSystemStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render network statistics heading', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Network Statistics')).toBeInTheDocument();
  });

  it('should render vault count', () => {
    render(<LiveSystemStats />);
    
    // The value is formatted, so check if it's rendered
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render merchant count', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('567')).toBeInTheDocument();
  });

  it('should render Total Value Locked label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
  });

  it('should render stat icons', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('should call useSystemStats', () => {
    render(<LiveSystemStats />);
    
    expect(hooks.useSystemStats).toHaveBeenCalled();
  });

  it('should render Active Vaults label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Active Vaults')).toBeInTheDocument();
  });

  it('should render Verified Merchants label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Verified Merchants')).toBeInTheDocument();
  });

  it('should render Transactions label', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('should render transaction count', () => {
    render(<LiveSystemStats />);
    
    expect(screen.getByText('89,012')).toBeInTheDocument();
  });
});
