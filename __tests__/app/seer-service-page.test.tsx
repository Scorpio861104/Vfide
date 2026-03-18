import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockFetch = jest.fn<Promise<Response>, [input: RequestInfo | URL, init?: RequestInit]>();

let mockAddress: `0x${string}` | undefined;
let mockChainId = 31337;
let mockScore = 6500;

const renderSeerServicePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/seer-service/page');
  const SeerServicePage = pageModule.default as React.ComponentType;
  return render(<SeerServicePage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
  useChainId: () => mockChainId,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({ score: mockScore }),
  useAppealStatus: () => ({
    hasAppeal: false,
    resolved: false,
    timestamp: null,
  }),
}));

jest.mock('@/hooks/useSeerInsights', () => ({
  useSeerTimeline: () => ({ events: [], isLoading: false, error: null }),
  useSeerReasonCodeTimeline: () => ({ events: [], isLoading: false, error: null }),
  useSeerSystemStats: () => ({
    stats: {
      recentScoreUpdates: 0,
      uniqueSubjects: 0,
      userAdjustments: 0,
      avgDeltaAbs: 0,
      pendingAppeals: 0,
    },
    isLoading: false,
    error: null,
  }),
  useSeerAggregatedAnalytics: () => ({
    analytics: {
      generatedAt: '2026-03-15T00:00:00.000Z',
      windowHours: 168,
      summary: {
        totalEvents: 0,
        allowedEvents: 0,
        warnedEvents: 0,
        delayedEvents: 0,
        blockedEvents: 0,
        scoreSetEvents: 0,
        appealsOpened: 0,
        appealsResolved: 0,
        uniqueSubjects: 0,
        avgScoreDeltaAbs: 0,
        avgConfidence: 0,
        blockedRate: 0,
        delayedRate: 0,
        appealResolutionRate: 0,
      },
      trends: [],
      topReasonCodes: [],
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Activity: Icon,
    AlertTriangle: Icon,
    BarChart3: Icon,
    BookOpen: Icon,
    CheckCircle2: Icon,
    Clock3: Icon,
    Compass: Icon,
    Scale: Icon,
    Shield: Icon,
    Sparkles: Icon,
    Timer: Icon,
    Wrench: Icon,
  };
});

describe('Seer service page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockChainId = 31337;
    mockScore = 6500;

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('renders healthy preflight baseline and account context', () => {
    renderSeerServicePage();

    expect(screen.getByText(/Seer Utility Suite/i)).toBeTruthy();
    expect(screen.getByText(/wallet: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/i)).toBeTruthy();
    expect(screen.getByText(/Projected outcome:/i)).toBeTruthy();
    expect(screen.getByText(/Allowed likely/i)).toBeTruthy();
  });

  it('escalates preflight to blocked for high-risk governance inputs', async () => {
    mockScore = 3000;
    renderSeerServicePage();

    fireEvent.change(screen.getByDisplayValue('Trade'), { target: { value: 'governance' } });
    fireEvent.change(screen.getByPlaceholderText(/amount/i), { target: { value: '2000' } });
    fireEvent.change(screen.getByPlaceholderText(/actions today/i), { target: { value: '12' } });
    fireEvent.change(screen.getByPlaceholderText(/counterparty/i), { target: { value: '0x00001234' } });

    await waitFor(() => {
      expect(screen.getByText(/Blocked likely/i)).toBeTruthy();
    });
    expect(screen.getByText(/Do not submit this action yet/i)).toBeTruthy();
    expect(screen.getByText(/High caution: unusual counterparty pattern detected/i)).toBeTruthy();
  });

  it('loads and persists safe-mode preference through localStorage', async () => {
    localStorage.setItem('seer_safe_mode_enabled', 'false');

    renderSeerServicePage();

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;

    await waitFor(() => {
      expect(checkbox.checked).toBe(false);
    });

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(localStorage.getItem('seer_safe_mode_enabled')).toBe('true');
    });
  });

  it('shows reason-code interpretation for known code input', async () => {
    renderSeerServicePage();

    const input = screen.getByPlaceholderText(/enter code/i);
    fireEvent.change(input, { target: { value: '500' } });

    await waitFor(() => {
      expect(screen.getByText(/Code 500/i)).toBeTruthy();
    });
  });
});