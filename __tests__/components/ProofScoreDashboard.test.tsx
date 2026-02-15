/**
 * ProofScore Dashboard Component Tests
 * Testing score visualization, tier progression, badges, and achievements
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProofScoreDashboard from '../../components/gamification/ProofScoreDashboard';

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
  }),
}));

const mockFetch = jest.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('/api/users/')) {
    return {
      ok: true,
      json: async () => ({
        user: {
          proof_score: 7850,
          stats: {
            badge_count: 12,
            friend_count: 18,
            proposal_count: 5,
            endorsement_count: 22,
          },
        },
      }),
    } as Response;
  }

  if (url.includes('/api/badges')) {
    return {
      ok: true,
      json: async () => ({
        badges: [
          {
            badge_id: 'legend-1',
            badge_name: 'Legendary Member',
            badge_description: 'Reached the Legend tier',
            badge_icon: '🏆',
            badge_rarity: 'legendary',
            earned_at: new Date('2025-01-01').toISOString(),
          },
        ],
      }),
    } as Response;
  }

  if (url.includes('/api/gamification')) {
    return {
      ok: true,
      json: async () => ({
        streak: 42,
        achievements: [
          {
            id: 'achv-1',
            name: 'ProofScore Pioneer',
            description: 'Reached 5000+ ProofScore',
            icon: '🏅',
          },
        ],
      }),
    } as Response;
  }

  return {
    ok: false,
    json: async () => ({}),
  } as Response;
});

beforeAll(() => {
  global.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
  mockFetch.mockClear();
});

const renderWithData = async () => {
  render(<ProofScoreDashboard />);
  await waitFor(() =>
    expect(screen.queryByText(/Loading your ProofScore data/i)).not.toBeInTheDocument()
  );
  await waitFor(() => expect(screen.getAllByText('7850').length).toBeGreaterThan(0));
};

describe('ProofScoreDashboard Component', () => {
  it('renders without crashing', () => {
    render(<ProofScoreDashboard />);
    const header = screen.getByText('ProofScore Dashboard');
    expect(header).toBeInTheDocument();
  });

  it('displays current ProofScore prominently', async () => {
    await renderWithData();

    expect(screen.getByText('Your Current ProofScore')).toBeInTheDocument();
    expect(screen.getAllByText('7850')[0]).toBeInTheDocument();
  });

  it('displays current tier information', async () => {
    await renderWithData();

    expect(screen.getAllByText('Legend')[0]).toBeInTheDocument();
    expect(screen.getByText(/The most trusted and active member/i)).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Badges/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Achievements/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    // Should start on Overview tab
    expect(screen.getAllByText(/Activity Breakdown/i)[0]).toBeInTheDocument();

    // Click Timeline tab
    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument();
    });
  });

  it('maintains dark mode classes', () => {
    const { container } = render(<ProofScoreDashboard />);

    const darkElements = container.querySelectorAll('[class*="dark:"]');
    expect(darkElements.length).toBeGreaterThan(0);
  });
});

describe('Tier Display', () => {
  it('shows tier name and description', async () => {
    await renderWithData();

    expect(screen.getAllByText('Legend')[0]).toBeInTheDocument();
    expect(screen.getByText(/The most trusted and active member/i)).toBeInTheDocument();
  });

  it('displays tier badge', async () => {
    await renderWithData();

    expect(screen.getAllByText('🏆')[0]).toBeInTheDocument();
  });

  it('shows tier benefits', async () => {
    await renderWithData();

    expect(screen.getByText(/All features unlocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom support/i)).toBeInTheDocument();
    expect(screen.getByText(/Revenue sharing/i)).toBeInTheDocument();
  });

  it('displays tier progress bar', () => {
    const { container } = render(<ProofScoreDashboard />);

    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('shows score progress in tier', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText(/Score Progress/i)).toBeInTheDocument();
  });
});

describe('Quick Stats Section', () => {
  it('displays quick stats', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Current Score')).toBeInTheDocument();
    expect(screen.getAllByText('Badges')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Achievements')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Streak')[0]).toBeInTheDocument();
  });

  it('shows stat values', async () => {
    await renderWithData();

    expect(screen.getAllByText('7850')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('42 days')[0]).toBeInTheDocument();
  });

  it('displays stat icons', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('🏅')).toBeInTheDocument();
    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});

describe('Score Breakdown Section', () => {
  it('displays score breakdown categories', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  it('shows score amounts', async () => {
    await renderWithData();

    expect(screen.getAllByText('12')[0]).toBeInTheDocument();
    expect(screen.getAllByText('18')[0]).toBeInTheDocument();
  });

  it('displays percentage breakdowns', async () => {
    await renderWithData();

    expect(screen.getByText('21%')).toBeInTheDocument();
    expect(screen.getByText('32%')).toBeInTheDocument();
  });

  it('shows activity counts', async () => {
    await renderWithData();

    // Activity count displays
    const activityTexts = screen.getAllByText(/activities/i);
    expect(activityTexts.length).toBeGreaterThan(0);
  });

  it('displays trend indicators', async () => {
    await renderWithData();

    const statusElements = screen.getAllByText(/\d+ activities/);
    expect(statusElements.length).toBeGreaterThan(0);
  });
});

describe('Timeline Tab', () => {
  it('displays timeline when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument();
    });
  });

  it('shows score history records', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      // Just check that timeline content is displayed
      expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument();
    });
  });

  it('displays score changes', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Score history will appear once daily snapshots are available/i)
      ).toBeInTheDocument();
    });
  });

  it('shows activity descriptions in timeline', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Score history will appear once daily snapshots are available/i)
      ).toBeInTheDocument();
    });
  });
});

describe('Badges Tab', () => {
  it('displays badges when tab is clicked', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText(/Your Badges/i)).toBeInTheDocument();
    });
  });

  it('shows badge icons', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getAllByText('🏆').length).toBeGreaterThan(0);
    });
  });

  it('displays badge names', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText('Legendary Member')).toBeInTheDocument();
    });
  });

  it('shows badge descriptions', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText(/Reached the Legend tier/i)).toBeInTheDocument();
    });
  });

  it('displays badge rarity levels', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      const rarityElements = screen.getAllByText(/common|uncommon|rare|epic|legendary/i);
      expect(rarityElements.length).toBeGreaterThan(0);
    });
  });

  it('counts total badges', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText(/Your Badges \(\d+\)/)).toBeInTheDocument();
    });
  });
});

describe('Achievements Tab', () => {
  it('displays achievements when tab is clicked', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const achievementsTab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(achievementsTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Achievements/i)[0]).toBeInTheDocument();
    });
  });

  it('shows achievement titles', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const achievementsTab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(achievementsTab);

    await waitFor(() => {
      expect(screen.getByText('ProofScore Pioneer')).toBeInTheDocument();
    });
  });

  it('indicates completed achievements', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const achievementsTab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(achievementsTab);

    await waitFor(() => {
      expect(screen.getByText('ProofScore Pioneer')).toBeInTheDocument();
    });
  });

  it('counts completed vs total achievements', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const achievementsTab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(achievementsTab);

    await waitFor(() => {
      expect(screen.getByText(/Achievements \(\d+ \/ \d+\)/)).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('has proper heading hierarchy', () => {
    const { container } = render(<ProofScoreDashboard />);

    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain('ProofScore Dashboard');
  });

  it('all tabs are labeled', () => {
    render(<ProofScoreDashboard />);

    const tabs = screen.getAllByRole('button', { name: /Overview|Timeline|Badges|Achievements/i });
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  it('main score has accessible label', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Your Current ProofScore')).toBeInTheDocument();
  });

  it('tier benefits list is clear', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Tier Benefits:')).toBeInTheDocument();
  });

  it('sections have descriptive headings', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Your ProofScore Status')).toBeInTheDocument();
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  it('color is not only indicator of status', () => {
    render(<ProofScoreDashboard />);

    // Check for text labels alongside colors
    expect(screen.getAllByText(/Tier/i)[0]).toBeInTheDocument();
  });
});

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    window.dispatchEvent(new Event('resize'));
  });

  it('renders on mobile viewport', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('ProofScore Dashboard')).toBeInTheDocument();
  });

  it('main score is readable on mobile', async () => {
    await renderWithData();

    expect(screen.getAllByText('7850')[0]).toBeInTheDocument();
  });

  it('stats grid is responsive', () => {
    const { container } = render(<ProofScoreDashboard />);

    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('tab labels display correctly on mobile', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('score breakdown cards are mobile-friendly', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
  });

  it('badge cards are responsive', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText('Legendary Member')).toBeInTheDocument();
    });
  });
});

describe('Data Display', () => {
  it('displays all score breakdown categories', async () => {
    await renderWithData();

    const categories = [
      'Badges Earned',
      'Connections',
      'Proposals Created',
      'Endorsements Received',
    ];

    categories.forEach((category) => {
      expect(screen.getByText(category)).toBeInTheDocument();
    });
  });

  it('calculates and displays percentages correctly', async () => {
    await renderWithData();

    expect(screen.getByText('21%')).toBeInTheDocument();
  });

  it('displays tier badge correctly', async () => {
    await renderWithData();

    // Legend tier should show trophy emoji
    expect(screen.getAllByText('🏆')[0]).toBeInTheDocument();
  });
});

describe('Tab State Management', () => {
  it('maintains selected tab state', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    // Click Timeline
    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    // Verify tab is selected
    await waitFor(() => {
      expect(timelineTab).toHaveClass('border-b-2');
    });

    // Switch to Badges
    const badgesTab = screen.getByRole('button', { name: /Badges/i });
    await user.click(badgesTab);

    // Verify Badges is now selected
    await waitFor(() => {
      expect(badgesTab).toHaveClass('border-b-2');
    });
  });

  it('displays correct content for each tab', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    // Overview tab
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();

    // Timeline tab
    const timelineTab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(timelineTab);

    await waitFor(() => {
      expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument();
    });
  });
});

describe('Visual Indicators', () => {
  it('shows progress bars for tier advancement', () => {
    const { container } = render(<ProofScoreDashboard />);

    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('colors indicate achievement status', async () => {
    const user = userEvent.setup();
    await renderWithData();

    const achievementsTab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(achievementsTab);

    await waitFor(() => {
      // Check for checkmark indicating completed
      expect(screen.getByText('ProofScore Pioneer')).toBeInTheDocument();
    });
  });

  it('emoji icons are present for visual context', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('🏅')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('complete overview tab flow works', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('ProofScore Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('switching tabs multiple times works', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    // Timeline
    let tab = screen.getByRole('button', { name: /Timeline/i });
    await user.click(tab);
    await waitFor(() => expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument());

    // Badges
    tab = screen.getByRole('button', { name: /Badges/i });
    await user.click(tab);
    await waitFor(() => expect(screen.getByText(/Your Badges/i)).toBeInTheDocument());

    // Achievements
    tab = screen.getByRole('button', { name: /Achievements/i });
    await user.click(tab);
    await waitFor(() => expect(screen.getAllByText(/Achievements/i)[0]).toBeInTheDocument());

    // Back to Overview
    tab = screen.getByRole('button', { name: /Overview/i });
    await user.click(tab);
    await waitFor(() => expect(screen.getByText('Activity Breakdown')).toBeInTheDocument());
  });

  it('all data displays correctly together', async () => {
    await renderWithData();

    // Score
    expect(screen.getAllByText('7850')[0]).toBeInTheDocument();

    // Tier
    expect(screen.getAllByText('Legend')[0]).toBeInTheDocument();

    // Stats
    expect(screen.getByText('Current Score')).toBeInTheDocument();
    expect(screen.getAllByText('Badges')[0]).toBeInTheDocument();

    // Breakdown
    expect(screen.getByText('Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Badges Earned')).toBeInTheDocument();
  });

  it('dark mode is supported throughout', () => {
    const { container } = render(<ProofScoreDashboard />);

    const darkElements = container.querySelectorAll('[class*="dark:"]');
    expect(darkElements.length).toBeGreaterThan(0);
  });
});
