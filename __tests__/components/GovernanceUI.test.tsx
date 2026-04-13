import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GovernanceUI from '../../components/governance/GovernanceUI';

describe('GovernanceUI', () => {
  it('renders shell statistics and tabs', () => {
    render(<GovernanceUI />);

    expect(screen.getByRole('heading', { name: /Governance/i })).toBeInTheDocument();
    expect(screen.getByText('Total Proposals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Proposals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Vote$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delegate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /History/i })).toBeInTheDocument();
  });

  it('shows empty proposals state counts with no runtime mock data', () => {
    render(<GovernanceUI />);

    expect(screen.getByText('0 Proposals')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Vote For/i })).not.toBeInTheDocument();
  });

  it('opens delegation tab and surfaces read-only DAO notice', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    await user.click(screen.getByRole('button', { name: /Delegate/i }));

    expect(screen.getByText(/Delegation is read-only in DAO v1/i)).toBeInTheDocument();
    expect(screen.getByText('Delegate Your Votes')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Delegation Unavailable/i })).toBeInTheDocument();
  });

  it('validates delegation address input and shows error', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    await user.click(screen.getByRole('button', { name: /Delegate/i }));
    await user.type(screen.getAllByRole('textbox')[0], 'not-an-address');
    await user.type(screen.getAllByRole('spinbutton')[0], '20');
    await user.click(screen.getByRole('button', { name: /Delegation Unavailable/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid address format/i)).toBeInTheDocument();
    });
  });

  it('opens history tab with no recent votes rendered', async () => {
    const user = userEvent.setup();
    render(<GovernanceUI />);

    await user.click(screen.getByRole('button', { name: /History/i }));

    expect(screen.getByText(/Your Recent Votes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Proposal vote-/i)).not.toBeInTheDocument();
  });
});
