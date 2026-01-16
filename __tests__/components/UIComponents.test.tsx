import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
  useSpring: (val: any) => val,
  useTransform: () => 0,
}));

// Mock wagmi for TestnetBadge
jest.mock('wagmi', () => ({
  useChainId: () => 84532, // Base Sepolia
  useAccount: () => ({ isConnected: true }),
}));

// Mock testnet config
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}));

// Import components after mocking
import { GlowingCard } from '@/components/ui/GlowingCard';
import { TestnetBadge } from '@/components/ui/TestnetBadge';
import { ParticleBackground } from '@/components/ui/ParticleBackground';

describe('GlowingCard', () => {
  it('renders children', () => {
    render(
      <GlowingCard>
        <div>Test Content</div>
      </GlowingCard>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <GlowingCard className="custom-class">
        <div>Content</div>
      </GlowingCard>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('applies glow color prop', () => {
    const { container } = render(
      <GlowingCard glowColor="#FF0000">
        <div>Content</div>
      </GlowingCard>
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('exports GlowingCard function', () => {
    expect(typeof GlowingCard).toBe('function');
  });
});

describe('TestnetBadge', () => {
  it('renders testnet badge on testnet', () => {
    render(<TestnetBadge />);
    expect(screen.getByText(/testnet mode/i)).toBeInTheDocument();
  });

  it('shows network name', () => {
    render(<TestnetBadge />);
    expect(screen.getByText(/base sepolia/i)).toBeInTheDocument();
  });

  it('exports TestnetBadge function', () => {
    expect(typeof TestnetBadge).toBe('function');
  });
});

describe('ParticleBackground', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParticleBackground />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    const { container } = render(<ParticleBackground />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('exports ParticleBackground function', () => {
    expect(typeof ParticleBackground).toBe('function');
  });
});
