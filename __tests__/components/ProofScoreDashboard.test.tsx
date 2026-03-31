import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ProofScoreDashboard from '../../components/gamification/ProofScoreDashboard';

describe('ProofScoreDashboard', () => {
  it('renders shell and current status blocks', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByRole('heading', { name: /ProofScore Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Your Current ProofScore/i)).toBeInTheDocument();
    expect(screen.getByText(/Your ProofScore Status/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Score Breakdown/i).length).toBeGreaterThan(0);
  });

  it('shows zero-safe quick stats without demo values', () => {
    render(<ProofScoreDashboard />);

    expect(screen.getByText('Current Score')).toBeInTheDocument();
    expect(screen.getAllByText('This Month').length).toBeGreaterThan(0);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('0 days')).toBeInTheDocument();
  });

  it('timeline tab renders empty-state message', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    await user.click(screen.getByRole('button', { name: /Timeline/i }));

    expect(screen.getByText(/30-Day Score History/i)).toBeInTheDocument();
    expect(screen.getByText(/No score timeline data available yet/i)).toBeInTheDocument();
  });

  it('badges tab renders empty-state message', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    await user.click(screen.getByRole('button', { name: /Badges/i }));

    expect(screen.getByText(/Your Badges \(0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No badge data available yet/i)).toBeInTheDocument();
  });

  it('achievements tab renders empty-state message', async () => {
    const user = userEvent.setup();
    render(<ProofScoreDashboard />);

    await user.click(screen.getByRole('button', { name: /Achievements/i }));

    expect(screen.getByText(/Achievements \(0 \/ 0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No achievement data available yet/i)).toBeInTheDocument();
  });
});
