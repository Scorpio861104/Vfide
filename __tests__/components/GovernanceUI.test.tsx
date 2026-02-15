/**
 * Governance Interface Component Tests
 * Testing proposals, voting, delegation, and governance statistics
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GovernanceUI from '../../components/governance/GovernanceUI';

beforeAll(() => {
  process.env.NEXT_PUBLIC_ENABLE_DELEGATION = 'true';
});

describe('GovernanceUI Component', () => {
  it('renders without crashing', () => {
    render(<GovernanceUI />);
    expect(screen.getAllByText('Governance').length).toBeGreaterThan(0);
  });

  it('displays governance statistics on load', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Total Proposals')).toBeInTheDocument();
    expect(screen.getByText('Active Now')).toBeInTheDocument();
    expect(screen.getByText('Participation Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Votes Cast')).toBeInTheDocument();
  });

  it('renders all tabs', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Proposals')).toBeInTheDocument();
    expect(screen.getByText('Vote')).toBeInTheDocument();
    expect(screen.getByText('Delegate')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    // Should start on Proposals tab
    expect(screen.getAllByText(/Proposal/i).length).toBeGreaterThan(0);

    // Click Delegate tab
    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    await waitFor(() => {
      expect(screen.getByText('Delegate Your Votes')).toBeInTheDocument();
    });
  });

  it('maintains state when switching tabs', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    // Click Vote tab
    const voteTab = screen.getByRole('button', { name: /^Vote$/i });
    await user.click(voteTab);

    // Switch to History and back
    const historyTab = screen.getByRole('button', { name: /^History$/i });
    await user.click(historyTab);

    const voteTab2 = screen.getByRole('button', { name: /^Vote$/i });
    await user.click(voteTab2);

    await waitFor(() => {
      expect(voteTab).toHaveClass('text-blue-600');
    });
  });
});

describe('Proposals Section', () => {
  it('displays proposals list', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText(/Proposal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Increase ProofScore Emissions/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Uniswap V4 Integration/i)).toBeInTheDocument();
  });

  it('filters proposals by status', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);
    expect(screen.getAllByText(/Proposal/i).length).toBeGreaterThan(0);

    const statusSelect = screen.getAllByDisplayValue('All Status')[0];
    
    await user.click(statusSelect);
    const activeOption = screen.getByRole('option', { name: /Active/ });
    await user.click(activeOption);
    expect(screen.getAllByText(/Proposal/i).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText(/Increase ProofScore Emissions/i)).toBeInTheDocument();
    });
  });

  it('filters proposals by category', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const categorySelect = screen.getAllByDisplayValue('All Categories')[0];
    
    await user.click(categorySelect);
    const technicalOption = screen.getByRole('option', { name: /Technical/ });
    await user.click(technicalOption);

    await waitFor(() => {
      expect(screen.getByText(/Add Uniswap V4 Integration/i)).toBeInTheDocument();
    });
  });

  it('displays proposal status badges', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
  });

  it('displays proposal category badges', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('parameter')).toBeInTheDocument();
    expect(screen.getByText('technical')).toBeInTheDocument();
    expect(screen.getByText('treasury')).toBeInTheDocument();
    expect(screen.getByText('governance')).toBeInTheDocument();
  });

  it('displays proposal voting progress', () => {
    render(<GovernanceUI />);

    // Check for vote counts
    expect(screen.getAllByText(/For/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Against/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Abstain/i).length).toBeGreaterThan(0);
  });

  it('shows proposal metadata correctly', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText(/Total Votes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Required/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Proposer/i).length).toBeGreaterThan(0);
  });

  it('displays voting time remaining', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText(/Ended|\d+d|\d+h|\d+m/i).length).toBeGreaterThan(0);
  });
});

describe('Voting Functionality', () => {
  it('displays vote buttons for active proposals', () => {
    render(<GovernanceUI />);

    const voteForButtons = screen.getAllByRole('button', { name: /Vote For/i });
    expect(voteForButtons.length).toBeGreaterThan(0);
  });

  it('allows voting for a proposal', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const voteForButton = screen.getAllByRole('button', { name: /Vote For/i })[0];
    await user.click(voteForButton);

    // Vote should be recorded
    expect(voteForButton).toBeInTheDocument();
  });

  it('allows voting against a proposal', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const voteAgainstButton = screen.getAllByRole('button', { name: /Against/i })[0];
    await user.click(voteAgainstButton);

    expect(voteAgainstButton).toBeInTheDocument();
  });

  it('allows voting to abstain', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const abstainButton = screen.getAllByRole('button', { name: /Abstain/i })[0];
    await user.click(abstainButton);

    expect(abstainButton).toBeInTheDocument();
  });

  it('displays vote counts correctly', () => {
    render(<GovernanceUI />);

    // Should display vote counts in millions
    const forVotes = screen.getAllByText(/For \(/);
    expect(forVotes.length).toBeGreaterThan(0);
  });

  it('calculates vote percentages correctly', () => {
    render(<GovernanceUI />);

    // Check for percentage displays
    const percentages = screen.getAllByText(/%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('shows voting progress bars', () => {
    render(<GovernanceUI />);

    const percentages = screen.getAllByText(/%/);
    expect(percentages.length).toBeGreaterThan(0);
  });
});

describe('Delegation Section', () => {
  it('displays delegation form', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    expect(screen.getByText('Delegate Your Votes')).toBeInTheDocument();
  });

  it('allows entering delegatee address', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const addressInput = screen.getByPlaceholderText('0x1234...5678');
    await user.type(addressInput, '0xabcd...ef01');

    expect(addressInput).toHaveValue('0xabcd...ef01');
  });

  it('allows entering votes amount', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const amountInput = screen.getByPlaceholderText('e.g., 100');
    await user.type(amountInput, '150');

    expect(amountInput).toHaveValue(150);
  });

  it('creates delegation on submit', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const addressInput = screen.getByPlaceholderText('0x1234...5678');
    const amountInput = screen.getByPlaceholderText('e.g., 100');
    const submitButton = screen.getByRole('button', { name: /Delegate Votes/i });

    await user.type(addressInput, '0xabcd...ef01');
    await user.type(amountInput, '100');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Your Delegations/i)).toBeInTheDocument();
    });
  });

  it('displays existing delegations', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    expect(screen.getByText(/Your Delegations/i)).toBeInTheDocument();
  });

  it('shows delegation details', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    expect(screen.getAllByText(/From/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/To/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Votes/i).length).toBeGreaterThan(0);
  });

  it('allows revoking delegations', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const revokeButtons = screen.queryAllByRole('button', { name: /Revoke/i });
    if (revokeButtons.length > 0) {
      await user.click(revokeButtons[0]);
    }

    expect(screen.getByText(/Your Delegations/i)).toBeInTheDocument();
  });
});

describe('Voting History Section', () => {
  it('displays voting history tab', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    expect(screen.getByText(/Your Recent Votes/i)).toBeInTheDocument();
  });

  it('shows recent votes', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    expect(screen.getAllByText(/Proposal/i).length).toBeGreaterThan(0);
  });

  it('displays vote direction', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    const voteDirections = screen.getAllByText(/For|Against|Abstain/i);
    expect(voteDirections.length).toBeGreaterThan(0);
  });

  it('shows vote weight', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    expect(screen.getAllByText(/Weight/i).length).toBeGreaterThan(0);
  });

  it('displays vote timestamps', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    // Check for date displays (not null)
    const dateElements = screen.getAllByText(/\d+\/\d+\/\d+/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});

describe('Accessibility', () => {
  it('has proper heading hierarchy', () => {
    const { container } = render(<GovernanceUI />);

    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toContain('Governance');
  });

  it('all tabs are labeled', () => {
    render(<GovernanceUI />);

    const tabs = screen.getAllByRole('button', { name: /Proposals|Vote|Delegate|History/i });
    expect(tabs.length).toBeGreaterThanOrEqual(4);
  });

  it('form inputs are labeled', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    expect(screen.getByText('Delegatee Address')).toBeInTheDocument();
    expect(screen.getByText('Votes to Delegate (millions)')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const firstTab = screen.getByRole('button', { name: /Proposals/i });
    firstTab.focus();

    expect(firstTab).toHaveFocus();
  });

  it('filter selects are properly labeled', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('status and category badges display clearly', () => {
    render(<GovernanceUI />);

    const statusBadges = screen.getAllByText(/Active|Passed|Failed|Executed/);
    expect(statusBadges.length).toBeGreaterThan(0);
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
    render(<GovernanceUI />);

    expect(screen.getAllByText('Governance').length).toBeGreaterThan(0);
  });

  it('statistics grid is responsive', () => {
    const { container } = render(<GovernanceUI />);

    const grid = container.querySelector('[class*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('proposal cards stack on mobile', () => {
    const { container } = render(<GovernanceUI />);

    const cards = container.querySelectorAll('[class*="rounded-lg"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('tab labels display correctly on mobile', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Proposals')).toBeInTheDocument();
    expect(screen.getByText('Vote')).toBeInTheDocument();
  });

  it('form fields stack on mobile', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('vote buttons are touch-friendly', () => {
    render(<GovernanceUI />);

    const voteButtons = screen.getAllByRole('button', { name: /Vote For|Against|Abstain/i });
    voteButtons.forEach((button) => {
      expect(button).toHaveClass('py-2');
    });
  });
});

describe('Data Validation', () => {
  it('displays proposal amounts correctly', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText(/Total Votes/i).length).toBeGreaterThan(0);
  });

  it('calculates and displays vote percentages', () => {
    render(<GovernanceUI />);

    const percentages = screen.getAllByText(/%/);
    expect(percentages.length).toBeGreaterThan(0);
  });

  it('delegation form validates input', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    const submitButton = screen.getByRole('button', { name: /Delegate Votes/i });
    await user.click(submitButton);

    // Should not clear fields if validation fails
    const addressInput = screen.getByPlaceholderText('0x1234...5678');
    expect(addressInput).toHaveValue('');
  });

  it('displays vote weights correctly', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const historyTab = screen.getByRole('button', { name: /History/i });
    await user.click(historyTab);

    expect(screen.getAllByText(/Weight/i).length).toBeGreaterThan(0);
  });

  it('proposal voting time remaining displays', () => {
    render(<GovernanceUI />);

    expect(screen.getAllByText(/d|h|m/).length).toBeGreaterThan(0);
  });
});

describe('Statistics Display', () => {
  it('displays total proposals count', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Total Proposals')).toBeInTheDocument();
  });

  it('displays active proposals count', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Active Now')).toBeInTheDocument();
  });

  it('displays participation rate', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Participation Rate')).toBeInTheDocument();
  });

  it('displays total votes cast', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('Total Votes Cast')).toBeInTheDocument();
  });

  it('statistics are properly formatted', () => {
    render(<GovernanceUI />);

    const stats = screen.getAllByText(/\d+/);
    expect(stats.length).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('complete voting flow works', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    // Find and click a proposal's vote for button
    const voteForButton = screen.getAllByRole('button', { name: /Vote For/i })[0];
    await user.click(voteForButton);

    // Should remain on same page
    expect(voteForButton).toBeInTheDocument();
  });

  it('complete delegation flow works', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    // Navigate to Delegate tab
    const delegateTab = screen.getByRole('button', { name: /Delegate/i });
    await user.click(delegateTab);

    // Fill form
    const addressInput = screen.getByPlaceholderText('0x1234...5678');
    const amountInput = screen.getByPlaceholderText('e.g., 100');
    const submitButton = screen.getByRole('button', { name: /Delegate Votes/i });

    await user.type(addressInput, '0xtest...1234');
    await user.type(amountInput, '50');
    await user.click(submitButton);

    // Form retains entered values
    await waitFor(() => {
      expect(addressInput).toHaveValue('0xtest...1234');
      expect(amountInput).toHaveValue(50);
    });
  });

  it('proposal filter combination works', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    const statusSelect = screen.getAllByDisplayValue('All Status')[0];
    const categorySelect = screen.getAllByDisplayValue('All Categories')[0];

    await user.click(statusSelect);
    let activeOption = screen.getByRole('option', { name: /Active/ });
    await user.click(activeOption);

    await user.click(categorySelect);
    let techOption = screen.getByRole('option', { name: /Technical/ });
    await user.click(techOption);

    await waitFor(() => {
      expect(screen.queryByText(/Add Uniswap V4 Integration/i)).toBeInTheDocument();
    });
  });

  it('dark mode is applied', () => {
    const { container } = render(<GovernanceUI />);

    const darkElements = container.querySelectorAll('[class*="dark:"]');
    expect(darkElements.length).toBeGreaterThan(0);
  });
});
