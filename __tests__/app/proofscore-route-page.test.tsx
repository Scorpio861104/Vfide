import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderProofscorePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/proofscore/page');
  const ProofscorePage = pageModule.default as React.ComponentType;
  return render(<ProofscorePage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/app/proofscore/components/TrustChallenges', () => ({
  TrustChallenges: () => <div data-testid="trust-challenges">Trust Challenges</div>,
}));

jest.mock('@/app/proofscore/components/ScoreStoryFeed', () => ({
  ScoreStoryFeed: () => <div data-testid="score-story">Score Story</div>,
}));

jest.mock('@/components/trust/ProofScoreVisualizer', () => ({
  ProofScoreVisualizer: () => <div data-testid="visualizer">Visualizer</div>,
}));

describe('ProofScore route', () => {
  it('renders tier table heading and proofscore modules', () => {
    renderProofscorePage();

    expect(screen.getByRole('heading', { name: /ProofScore Tiers/i })).toBeTruthy();
    expect(screen.getByTestId('trust-challenges')).toBeTruthy();
    expect(screen.getByTestId('score-story')).toBeTruthy();
  });
});
